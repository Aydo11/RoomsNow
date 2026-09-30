/**
 * Shrinks big photos in the browser before they're uploaded. A 12 to 24
 * megapixel phone photo is 4 to 10MB; the same photo at 2560px is usually
 * under 1MB, so uploads on mobile data finish quickly instead of timing out
 * half way ("Unexpected end of form" on the server).
 *
 * Browser-only. Anything it can't handle (video, HEIC, an old browser, an
 * out-of-memory decode) is returned untouched, so uploads never get worse.
 */
const MAX_EDGE = 2560;
const SKIP_UNDER_BYTES = 1.2 * 1024 * 1024;

export async function compressImage(file: File): Promise<File> {
  if (typeof window === "undefined" || typeof createImageBitmap !== "function") return file;
  if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size < SKIP_UNDER_BYTES) return file;
  try {
    // Read the size cheaply first so the full-size bitmap is never kept around.
    const probe = await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
    const scale = Math.min(1, MAX_EDGE / Math.max(probe.width, probe.height));
    const width = Math.round(probe.width * scale);
    const height = Math.round(probe.height * scale);
    probe.close();

    let bitmap: ImageBitmap;
    try {
      bitmap = await createImageBitmap(file, { imageOrientation: "from-image", resizeWidth: width, resizeHeight: height, resizeQuality: "high" } as ImageBitmapOptions);
    } catch {
      bitmap = await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      bitmap.close();
      return file;
    }
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const keepPng = file.type === "image/png" && file.size < 3 * 1024 * 1024;
    const type = keepPng ? "image/png" : "image/jpeg";
    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, type, 0.85));
    canvas.width = 0;
    canvas.height = 0;
    if (!blob || blob.size >= file.size) return file;
    const name = `${file.name.replace(/\.[^.]+$/, "") || "photo"}.${keepPng ? "png" : "jpg"}`;
    return new File([blob], name, { type, lastModified: file.lastModified });
  } catch {
    return file;
  }
}

/** Compresses every photo in a file input (one at a time, to keep memory low) and puts them back. */
export async function compressInputImages(input: HTMLInputElement): Promise<File[]> {
  const original = Array.from(input.files ?? []);
  const out: File[] = [];
  for (const file of original) out.push(await compressImage(file));
  if (out.some((file, index) => file !== original[index]) && typeof DataTransfer !== "undefined") {
    const transfer = new DataTransfer();
    out.forEach((file) => transfer.items.add(file));
    input.files = transfer.files;
  }
  return out;
}
