import assert from "node:assert/strict";
import test from "node:test";
import { base32Encode, generateRecoveryCodes, hashRecoveryCode, openTotpSecret, sealTotpSecret, totpCode, verifyTotp } from "../src/lib/totp";

const secret = base32Encode(Buffer.from("12345678901234567890"));

test("matches the RFC 6238 SHA-1 test vectors", () => {
  assert.equal(totpCode(secret, Math.floor(59 / 30)), "287082");
  assert.equal(totpCode(secret, Math.floor(1111111109 / 30)), "081804");
  assert.equal(totpCode(secret, Math.floor(1234567890 / 30)), "005924");
});

test("accepts the current code once and rejects reuse", () => {
  const now = 1_800_000_000_000;
  const code = totpCode(secret, Math.floor(now / 30000));
  const step = verifyTotp(secret, code, null, now);
  assert.notEqual(step, null);
  assert.equal(verifyTotp(secret, code, step, now), null);
  assert.equal(verifyTotp(secret, "000000", null, now) === null || totpCode(secret, Math.floor(now / 30000)) === "000000", true);
});

test("secrets round-trip through encryption and recovery codes hash consistently", () => {
  process.env.AUTH_SECRET ??= "test-secret-that-is-long-enough-1234567890";
  assert.equal(openTotpSecret(sealTotpSecret(secret)), secret);
  const { codes, hashes } = generateRecoveryCodes();
  assert.equal(codes.length, 10);
  assert.equal(hashRecoveryCode(codes[0].toLowerCase()), hashes[0]);
});
