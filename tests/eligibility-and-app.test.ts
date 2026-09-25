import assert from "node:assert/strict";
import test from "node:test";
import { createDecipheriv, createECDH, createHmac, createPublicKey, verify } from "node:crypto";
import { EMPTY_ANSWERS, eligibilityParams, parseAge } from "../src/lib/eligibility";
import { plainSummary, speechChunks, type PlainSummaryInput } from "../src/lib/plain-summary";
import { htmlToText } from "../src/lib/html-text";
import { isPushEndpoint } from "../src/lib/push-endpoint";

test("eligibility answers become ordinary search filters", () => {
  const params = eligibilityParams({
    ...EMPTY_ANSWERS,
    where: " Birmingham ",
    age: "19",
    resident: "woman",
    support: ["mental-health", "young-people"],
    stepFree: true,
    rent: "hb",
    helper: "no",
  });
  assert.equal(params.get("where"), "Birmingham");
  assert.equal(params.get("minAge"), "19");
  assert.equal(params.get("resident"), "woman");
  assert.equal(params.get("support"), "mental-health,young-people");
  assert.equal(params.get("wheelchair"), "1");
  assert.equal(params.get("hb"), "1");
  assert.equal(params.get("referral"), "SELF_REFERRAL,ANY");
});

test("skipped or neutral answers add no filters", () => {
  const params = eligibilityParams({ ...EMPTY_ANSWERS, resident: "skip", support: ["none"], rent: "unsure", helper: "yes" });
  assert.equal(params.toString(), "");
});

test("ages outside 16-99 are ignored", () => {
  assert.equal(parseAge("15"), null);
  assert.equal(parseAge("16"), 16);
  assert.equal(parseAge(""), null);
  assert.equal(parseAge("abc"), null);
});

const base: PlainSummaryInput = {
  accommodationType: "SHARED_ACCOMMODATION",
  area: "Handsworth",
  city: "Birmingham",
  weeklyRentFrom: 15000,
  weeklyRentTo: 15000,
  billsIncluded: true,
  housingBenefit: true,
  supportTypes: ["mental-health", "young-people"],
  genderArrangement: "FEMALE_ONLY",
  minAge: 18,
  maxAge: 25,
  referralRoutes: ["SELF_REFERRAL"],
  wheelchairAccess: true,
  petsAllowed: false,
  availableRooms: 2,
  availableFrom: null,
};

test("simple summary uses short, plain sentences", () => {
  const lines = plainSummary(base);
  assert.deepEqual(lines, [
    "This is a room in a shared home in Handsworth, Birmingham.",
    "2 rooms are free now.",
    "The rent is £150 a week.",
    "Bills are included in the rent.",
    "You can pay with Housing Benefit.",
    "Staff can help with mental health and young people.",
    "It is for women only.",
    "You need to be aged 18 to 25.",
    "You can apply yourself.",
    "It has step-free access.",
  ]);
});

test("simple summary handles ranges, future dates and professional-only referrals", () => {
  const lines = plainSummary(
    { ...base, weeklyRentTo: 17500, availableFrom: "2026-11-02T00:00:00Z", referralRoutes: ["PROFESSIONAL_REFERRAL"], minAge: null, maxAge: null, genderArrangement: "ANY" },
    new Date("2026-09-26T00:00:00Z"),
  );
  assert.ok(lines.includes("The rent is £150 to £175 a week."));
  assert.ok(lines.includes("You can move in from 2 November."));
  assert.ok(lines.includes("A support worker or the council needs to refer you."));
  assert.ok(!lines.some((line) => line.includes("aged")));
});

test("speech chunks stay short enough for the browser", () => {
  const long = `${"word ".repeat(120)}end.`;
  const chunks = speechChunks(`Short one. ${long} Last.`);
  assert.equal(chunks[0], "Short one.");
  assert.ok(chunks.every((chunk) => chunk.length <= 220));
  assert.equal(chunks[chunks.length - 1], "Last.");
});

test("advert html becomes readable text", () => {
  assert.equal(htmlToText("<p>Hello&nbsp;there</p><p>Bills &amp; wifi</p>"), "Hello there\nBills & wifi");
  assert.equal(htmlToText("<p>abcdef</p>", 3), "abc…");
});

test("only real push services are accepted", () => {
  assert.ok(isPushEndpoint("https://fcm.googleapis.com/fcm/send/abc"));
  assert.ok(isPushEndpoint("https://web.push.apple.com/QGx"));
  assert.ok(isPushEndpoint("https://updates.push.services.mozilla.com/wpush/v2/x"));
  assert.ok(!isPushEndpoint("http://fcm.googleapis.com/x"));
  assert.ok(!isPushEndpoint("https://169.254.169.254/latest"));
  assert.ok(!isPushEndpoint("https://evil.com/push.apple.com"));
  assert.ok(!isPushEndpoint("https://fcm.googleapis.com:8443/x"));
});

function hkdf(salt: Buffer, ikm: Buffer, info: Buffer, length: number) {
  const prk = createHmac("sha256", salt).update(ikm).digest();
  return createHmac("sha256", prk).update(Buffer.concat([info, Buffer.from([1])])).digest().subarray(0, length);
}

test("push payloads decrypt with the browser's keys (RFC 8291)", async () => {
  const { encryptPayload } = await import("../src/lib/push-crypto");
  const browser = createECDH("prime256v1");
  browser.generateKeys();
  const authSecret = Buffer.from("0123456789abcdef");
  const body = encryptPayload(Buffer.from('{"title":"Hi"}'), {
    p256dh: browser.getPublicKey().toString("base64url"),
    auth: authSecret.toString("base64url"),
  });

  // What the browser does on receipt.
  const salt = body.subarray(0, 16);
  const idLength = body[20];
  const senderPublic = body.subarray(21, 21 + idLength);
  const ciphertext = body.subarray(21 + idLength);
  const shared = browser.computeSecret(senderPublic);
  const keyInfo = Buffer.concat([Buffer.from("WebPush: info\0"), browser.getPublicKey(), senderPublic]);
  const ikm = hkdf(authSecret, shared, keyInfo, 32);
  const cek = hkdf(salt, ikm, Buffer.from("Content-Encoding: aes128gcm\0"), 16);
  const nonce = hkdf(salt, ikm, Buffer.from("Content-Encoding: nonce\0"), 12);
  const decipher = createDecipheriv("aes-128-gcm", cek, nonce);
  decipher.setAuthTag(ciphertext.subarray(ciphertext.length - 16));
  const plain = Buffer.concat([decipher.update(ciphertext.subarray(0, ciphertext.length - 16)), decipher.final()]);
  assert.equal(plain[plain.length - 1], 2);
  assert.equal(plain.subarray(0, -1).toString(), '{"title":"Hi"}');
});

test("VAPID header is a valid ES256 token for the push service", async () => {
  process.env.AUTH_SECRET = "a".repeat(40);
  const { vapidAuthorization, vapidKeys } = await import("../src/lib/push-crypto");
  const keys = vapidKeys();
  assert.ok(keys);
  assert.equal(keys.publicKey.length, 65);
  const header = vapidAuthorization("https://fcm.googleapis.com/fcm/send/abc", keys, Date.UTC(2026, 8, 26));
  const match = /^vapid t=([^,]+), k=(.+)$/.exec(header);
  assert.ok(match);
  const [head, claims, signature] = match[1].split(".");
  const payload = JSON.parse(Buffer.from(claims, "base64url").toString());
  assert.equal(payload.aud, "https://fcm.googleapis.com");
  assert.equal(match[2], keys.publicKey.toString("base64url"));
  const publicKey = createPublicKey({
    key: { kty: "EC", crv: "P-256", x: keys.publicKey.subarray(1, 33).toString("base64url"), y: keys.publicKey.subarray(33).toString("base64url") },
    format: "jwk",
  });
  assert.ok(verify("sha256", Buffer.from(`${head}.${claims}`), { key: publicKey, dsaEncoding: "ieee-p1363" }, Buffer.from(signature, "base64url")));
});
