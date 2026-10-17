import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";

/**
 * Time-based one-time codes (RFC 6238), the 6-digit codes from Google
 * Authenticator, Microsoft Authenticator, 1Password and similar apps.
 * Pure Node crypto, no extra dependency. Secrets are kept encrypted in the
 * database with a key derived from AUTH_SECRET, so a database leak alone
 * does not hand out working codes.
 */

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const STEP_SECONDS = 30;

export function base32Encode(buffer: Buffer) {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of buffer) {
    value = ((value << 8) | byte) & 0xffff;
    bits += 8;
    while (bits >= 5) {
      output += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += ALPHABET[(value << (5 - bits)) & 31];
  return output;
}

export function base32Decode(input: string) {
  const clean = input.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of clean) {
    value = ((value << 5) | ALPHABET.indexOf(char)) & 0xffff;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

/** A new random secret, base32 (what authenticator apps expect). */
export function generateTotpSecret() {
  return base32Encode(randomBytes(20));
}

/** The 6-digit code for a given 30-second step. */
export function totpCode(secret: string, step: number) {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const hmac = createHmac("sha1", base32Decode(secret)).update(counter).digest();
  const offset = hmac[hmac.length - 1] & 15;
  const binary = ((hmac[offset] & 127) << 24) | (hmac[offset + 1] << 16) | (hmac[offset + 2] << 8) | hmac[offset + 3];
  return String(binary % 1_000_000).padStart(6, "0");
}

export function currentStep(now = Date.now()) {
  return Math.floor(now / 1000 / STEP_SECONDS);
}

/**
 * Checks a code, allowing one step either side for clock drift. Returns the
 * step it matched (store it to stop the same code being used twice), or null.
 */
export function verifyTotp(secret: string, code: string, lastUsedStep: number | null | undefined, now = Date.now()): number | null {
  const digits = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(digits)) return null;
  const step = currentStep(now);
  for (const candidate of [step, step - 1, step + 1]) {
    if (lastUsedStep != null && candidate <= lastUsedStep) continue;
    const expected = Buffer.from(totpCode(secret, candidate));
    if (timingSafeEqual(expected, Buffer.from(digits))) return candidate;
  }
  return null;
}

/** The link authenticator apps read from a QR code. */
export function otpauthUrl(secret: string, accountName: string, issuer = "RoomsNow") {
  const label = encodeURIComponent(`${issuer}:${accountName}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=${STEP_SECONDS}`;
}

function encryptionKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is missing.");
  return createHash("sha256").update(`roomsnow-totp:${secret}`).digest();
}

/** Encrypts a TOTP secret for storage (AES-256-GCM). */
export function sealTotpSecret(secret: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const data = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return `v1.${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${data.toString("base64url")}`;
}

export function openTotpSecret(sealed: string) {
  const [version, iv, tag, data] = sealed.split(".");
  if (version !== "v1" || !iv || !tag || !data) throw new Error("Unreadable two-step secret.");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8");
}

/** Ten one-time recovery codes like "7KQM-2XPA", and their hashes for storage. */
export function generateRecoveryCodes() {
  const codes = Array.from({ length: 10 }, () => {
    const raw = base32Encode(randomBytes(5)).slice(0, 8);
    return `${raw.slice(0, 4)}-${raw.slice(4)}`;
  });
  return { codes, hashes: codes.map(hashRecoveryCode) };
}

export function hashRecoveryCode(code: string) {
  return createHash("sha256").update(code.toUpperCase().replace(/[^A-Z0-9]/g, "")).digest("hex");
}
