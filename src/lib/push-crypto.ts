import { createCipheriv, createECDH, createHmac, createPrivateKey, randomBytes, sign } from "node:crypto";

/**
 * Web Push without a third-party library: VAPID (RFC 8292) to identify
 * RoomsNow to the push services, and aes128gcm payload encryption (RFC 8291)
 * so Apple, Google and Mozilla only ever see ciphertext.
 *
 * Keys: VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY (base64url) if set. Otherwise a
 * key pair is derived from AUTH_SECRET, so push works with no extra setup.
 * Changing AUTH_SECRET changes the derived keys, and people then need to turn
 * notifications on again.
 */

export type PushMessage = { title: string; body?: string; url?: string; tag?: string };

const b64url = (buffer: Buffer) => buffer.toString("base64url");
const fromB64url = (value: string) => Buffer.from(value, "base64url");

// Order of the P-256 group; a private key must be below it.
const P256_ORDER = BigInt("0xffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551");

export type VapidKeys = { publicKey: Buffer; privateKey: Buffer };
let cachedKeys: VapidKeys | null = null;

function derivedKeys(secret: string): VapidKeys {
  for (let counter = 0; counter < 16; counter++) {
    const candidate = createHmac("sha256", secret).update(`roomsnow-vapid-${counter}`).digest();
    const value = BigInt(`0x${candidate.toString("hex")}`);
    if (value === BigInt(0) || value >= P256_ORDER) continue;
    const ecdh = createECDH("prime256v1");
    ecdh.setPrivateKey(candidate);
    return { publicKey: ecdh.getPublicKey(), privateKey: candidate };
  }
  throw new Error("Could not derive a VAPID key");
}

export function vapidKeys(): VapidKeys | null {
  if (cachedKeys) return cachedKeys;
  const envPublic = process.env.VAPID_PUBLIC_KEY;
  const envPrivate = process.env.VAPID_PRIVATE_KEY;
  if (envPublic && envPrivate) {
    cachedKeys = { publicKey: fromB64url(envPublic), privateKey: fromB64url(envPrivate) };
    return cachedKeys;
  }
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) return null;
  cachedKeys = derivedKeys(secret);
  return cachedKeys;
}

/** The key browsers need when subscribing (applicationServerKey). */
export function vapidPublicKey(): string | null {
  const keys = vapidKeys();
  return keys ? b64url(keys.publicKey) : null;
}

function signingKey(keys: VapidKeys) {
  return createPrivateKey({
    key: {
      kty: "EC",
      crv: "P-256",
      d: b64url(keys.privateKey),
      x: b64url(keys.publicKey.subarray(1, 33)),
      y: b64url(keys.publicKey.subarray(33, 65)),
    },
    format: "jwk",
  });
}

/** The VAPID Authorization header for one push service. */
export function vapidAuthorization(endpoint: string, keys: VapidKeys, now = Date.now()): string {
  const audience = new URL(endpoint).origin;
  const subject = `mailto:${process.env.VAPID_SUBJECT_EMAIL ?? "info@roomsnow.co.uk"}`;
  const header = b64url(Buffer.from(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const claims = b64url(Buffer.from(JSON.stringify({ aud: audience, exp: Math.floor(now / 1000) + 12 * 60 * 60, sub: subject })));
  const unsigned = `${header}.${claims}`;
  const signature = sign("sha256", Buffer.from(unsigned), { key: signingKey(keys), dsaEncoding: "ieee-p1363" });
  return `vapid t=${unsigned}.${b64url(signature)}, k=${b64url(keys.publicKey)}`;
}

function hkdf(salt: Buffer, ikm: Buffer, info: Buffer, length: number) {
  const prk = createHmac("sha256", salt).update(ikm).digest();
  return createHmac("sha256", prk).update(Buffer.concat([info, Buffer.from([1])])).digest().subarray(0, length);
}

/**
 * RFC 8291 encryption of one message for one subscription. The optional
 * salt and sender key are only for tests.
 */
export function encryptPayload(
  payload: Buffer,
  subscription: { p256dh: string; auth: string },
  fixed?: { salt: Buffer; senderPrivateKey: Buffer },
): Buffer {
  const receiverPublic = fromB64url(subscription.p256dh);
  const authSecret = fromB64url(subscription.auth);
  const sender = createECDH("prime256v1");
  if (fixed) sender.setPrivateKey(fixed.senderPrivateKey);
  else sender.generateKeys();
  const senderPublic = sender.getPublicKey();
  const shared = sender.computeSecret(receiverPublic);
  const salt = fixed?.salt ?? randomBytes(16);

  const keyInfo = Buffer.concat([Buffer.from("WebPush: info\0"), receiverPublic, senderPublic]);
  const ikm = hkdf(authSecret, shared, keyInfo, 32);
  const cek = hkdf(salt, ikm, Buffer.from("Content-Encoding: aes128gcm\0"), 16);
  const nonce = hkdf(salt, ikm, Buffer.from("Content-Encoding: nonce\0"), 12);

  const cipher = createCipheriv("aes-128-gcm", cek, nonce);
  // A single record: the content, then the 0x02 "last record" delimiter.
  const encrypted = Buffer.concat([cipher.update(Buffer.concat([payload, Buffer.from([2])])), cipher.final(), cipher.getAuthTag()]);

  const recordSize = Buffer.alloc(4);
  recordSize.writeUInt32BE(4096);
  return Buffer.concat([salt, recordSize, Buffer.from([senderPublic.length]), senderPublic, encrypted]);
}

