import "server-only";
import { randomUUID } from "crypto";
import { mkdir, readFile, rm, writeFile } from "fs/promises";
import path from "path";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

/**
 * Storage adapter for local development and S3-compatible production storage.
 *
 * Visibility matters more than the driver. Public files (advert photos, logos)
 * are served straight from the web root. Private files (referral attachments,
 * verification evidence, ID) are written OUTSIDE the web root and can only be
 * read through /api/documents/[id], which checks permissions and writes an audit
 * entry. Nothing private is ever guessable from a URL.
 *
 * Env: STORAGE_DRIVER=local|s3, PRIVATE_UPLOAD_DIR, S3_BUCKET, S3_REGION,
 *      S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_PUBLIC_BASE_URL, S3_ENDPOINT
 */
export type Visibility = "public" | "private";
export type StoredFile = {
  /** Public URL, or an opaque `private:` key that only the document route resolves. */
  url: string;
  key: string;
  mimeType: string;
  sizeBytes: number;
  visibility: Visibility;
};

export const LIMITS = {
  image: { maxBytes: 8 * 1024 * 1024, mime: ["image/jpeg", "image/png", "image/webp", "image/avif"] },
  // Keep uploads below the Server Action limit. Longer walkthroughs should use
  // a YouTube/Vimeo link so the web process never has to buffer a huge file.
  video: { maxBytes: 20 * 1024 * 1024, mime: ["video/mp4", "video/quicktime", "video/webm"] },
  document: {
    maxBytes: 15 * 1024 * 1024,
    mime: [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
  },
};

/** Magic bytes, because a browser-supplied MIME type is just a claim. */
const SIGNATURES: { mime: string; bytes: number[]; offset?: number }[] = [
  { mime: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  { mime: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47] },
  { mime: "image/webp", bytes: [0x57, 0x45, 0x42, 0x50], offset: 8 },
  { mime: "image/avif", bytes: [0x66, 0x74, 0x79, 0x70], offset: 4 },
  { mime: "video/mp4", bytes: [0x66, 0x74, 0x79, 0x70], offset: 4 },
  { mime: "video/quicktime", bytes: [0x66, 0x74, 0x79, 0x70], offset: 4 },
  { mime: "video/webm", bytes: [0x1a, 0x45, 0xdf, 0xa3] },
  { mime: "application/pdf", bytes: [0x25, 0x50, 0x44, 0x46] },
  // DOCX and other OOXML files are zip archives.
  { mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", bytes: [0x50, 0x4b, 0x03, 0x04] },
];

/**
 * iPhones (and some Android phones) save camera-roll photos as HEIC/HEIF by
 * default, which most browsers still can't decode or display. Some upload
 * paths transcode this to JPEG automatically before the browser ever sees
 * it, but plenty don't — picking a photo via a "Files" browser rather than
 * the native Photos picker, or opening the site inside an app's in-app
 * browser (WhatsApp, Instagram, Facebook), commonly hand over the raw HEIC
 * file untouched. That's a very mobile-specific failure mode: it rarely
 * comes up on desktop, where photos have usually already passed through an
 * export/edit step that leaves them as JPEG or PNG. Since neither the mime
 * allowlist nor the server can render HEIC anyway, this only exists to turn
 * "that file type isn't supported" (which just reads as broken) into a
 * message that actually tells a provider what happened and the one-time fix.
 */
const HEIC_TYPES = new Set(["image/heic", "image/heif", "image/heic-sequence", "image/heif-sequence"]);

function looksLikeHeic(file: File) {
  return HEIC_TYPES.has(file.type.toLowerCase()) || /\.hei[cf]$/i.test(file.name);
}

export function validateUpload(file: File, kind: keyof typeof LIMITS) {
  const rule = LIMITS[kind];
  if (!rule.mime.includes(file.type)) {
    if (kind === "image" && looksLikeHeic(file)) {
      return (
        "That photo is in Apple's HEIC format, which most browsers (including this site) can't display. " +
        "On an iPhone: Settings → Camera → Formats → \"Most Compatible\" makes new photos save as JPEG " +
        "automatically. For a photo you've already taken, open it in Photos, tap Share, then \"Save as JPEG\" " +
        "or send it to yourself (e.g. by email or Messages) — that also converts it — before uploading here."
      );
    }
    return `That file type isn't supported. Allowed: ${rule.mime.join(", ")}.`;
  }
  if (file.size > rule.maxBytes) {
    return `That file is too large. Maximum ${Math.round(rule.maxBytes / 1024 / 1024)}MB.`;
  }
  if (file.size === 0) return "That file is empty.";
  return null;
}

/**
 * Second check, after the bytes are in hand: does the file actually look like
 * what it claims to be? Stops an executable or an SVG (which can carry script)
 * being uploaded as image/png.
 */
export async function verifyFileContents(file: File, buffer: Buffer) {
  const expected = SIGNATURES.filter((signature) => signature.mime === file.type);
  if (!expected.length) return null; // No signature on file for this type — size and MIME checks stand.

  const matches = expected.some((signature) =>
    signature.bytes.every((byte, index) => buffer[(signature.offset ?? 0) + index] === byte),
  );
  return matches ? null : "That file doesn't look like the type it claims to be.";
}

interface StorageDriver {
  put(file: File, folder: string, visibility?: Visibility): Promise<StoredFile>;
  remove(key: string, visibility?: Visibility): Promise<void>;
  /** Absolute path or signed URL for a private key, used only by the document route. */
  read(key: string): Promise<Buffer>;
}

const PRIVATE_DIR = process.env.PRIVATE_UPLOAD_DIR || path.join(process.cwd(), "var", "private-uploads");
const PUBLIC_DIR = path.join(process.cwd(), "public", "uploads");

/** Keys are generated, never taken from the filename, so path traversal isn't possible. */
function makeKey(folder: string, file: File) {
  const safeFolder = folder.replace(/[^a-zA-Z0-9/_-]/g, "").replace(/\.\./g, "");
  const ext = (file.name.split(".").pop() ?? "bin").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8);
  return `${safeFolder}/${randomUUID()}.${ext || "bin"}`;
}

const localDriver: StorageDriver = {
  async put(file, folder, visibility = "public") {
    const key = makeKey(folder, file);
    const buffer = Buffer.from(await file.arrayBuffer());
    const root = visibility === "private" ? PRIVATE_DIR : PUBLIC_DIR;
    const target = path.join(root, key);

    // Belt and braces: the resolved path must stay inside the root.
    if (!target.startsWith(path.join(root, ""))) throw new Error("Invalid upload path.");

    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, buffer);

    return {
      url: visibility === "private" ? `private:${key}` : `/uploads/${key}`,
      key,
      mimeType: file.type,
      sizeBytes: file.size,
      visibility,
    };
  },

  async read(key) {
    const target = path.join(/* turbopackIgnore: true */ PRIVATE_DIR, key.replace(/^private:/, ""));
    if (!target.startsWith(path.join(/* turbopackIgnore: true */ PRIVATE_DIR, ""))) throw new Error("Invalid key.");
    return readFile(/* turbopackIgnore: true */ target);
  },

  async remove(key, visibility = "public") {
    const root = visibility === "private" ? PRIVATE_DIR : PUBLIC_DIR;
    const target = path.resolve(root, key.replace(/^private:/, ""));
    if (!target.startsWith(path.resolve(root) + path.sep)) throw new Error("Invalid key.");
    await rm(target, { force: true });
  },
};

let s3Client: S3Client | null = null;

function getS3() {
  if (s3Client) return s3Client;
  const region = process.env.S3_REGION;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  if (!region || !accessKeyId || !secretAccessKey || !process.env.S3_BUCKET) {
    throw new Error("S3 storage is selected but its bucket, region or credentials are missing.");
  }
  s3Client = new S3Client({
    region,
    endpoint: process.env.S3_ENDPOINT || undefined,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
    credentials: { accessKeyId, secretAccessKey },
  });
  return s3Client;
}

function publicObjectUrl(key: string) {
  const base = process.env.S3_PUBLIC_BASE_URL?.replace(/\/$/, "");
  if (!base) throw new Error("S3_PUBLIC_BASE_URL is required for public media.");
  return `${base}/${key.split("/").map(encodeURIComponent).join("/")}`;
}

const s3Driver: StorageDriver = {
  async put(file, folder, visibility = "public") {
    const key = makeKey(folder, file);
    const body = Buffer.from(await file.arrayBuffer());
    await getS3().send(new PutObjectCommand({
      Bucket: process.env.S3_BUCKET!,
      Key: key,
      Body: body,
      ContentType: file.type,
      ContentLength: file.size,
      ContentDisposition: "inline",
      CacheControl: visibility === "public" ? "public, max-age=31536000, immutable" : "private, no-store",
    }));
    return {
      url: visibility === "private" ? `private:${key}` : publicObjectUrl(key),
      key,
      mimeType: file.type,
      sizeBytes: file.size,
      visibility,
    };
  },
  async read(key) {
    const result = await getS3().send(new GetObjectCommand({
      Bucket: process.env.S3_BUCKET!,
      Key: key.replace(/^private:/, ""),
    }));
    if (!result.Body) throw new Error("Stored file is empty.");
    return Buffer.from(await result.Body.transformToByteArray());
  },
  async remove(key) {
    await getS3().send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET!, Key: key.replace(/^private:/, "") }));
  },
};

export const storage: StorageDriver = process.env.STORAGE_DRIVER === "s3" ? s3Driver : localDriver;

export const isPrivateKey = (url: string) => url.startsWith("private:");
