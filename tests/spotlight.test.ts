import assert from "node:assert/strict";
import test from "node:test";
import { cleanSpotlightText, isSpotlightPackage, SPOTLIGHT_LIMITS } from "../src/lib/spotlight";

test("spotlight text is tidied and length-checked", () => {
  const ok = cleanSpotlightText({ headline: "  Supported   housing in Birmingham ", body: "24/7 staffed rooms for care leavers." });
  assert.deepEqual(ok, { ok: true, value: { headline: "Supported housing in Birmingham", body: "24/7 staffed rooms for care leavers." } });
  const tooLong = cleanSpotlightText({ headline: "x".repeat(SPOTLIGHT_LIMITS.headline + 1), body: "short" });
  assert.equal(tooLong.ok, false);
  if (!tooLong.ok) assert.ok(tooLong.errors.headline && tooLong.errors.body);
});

test("spotlight text can't carry links", () => {
  const result = cleanSpotlightText({ headline: "Great rooms", body: "Book now at www.example.com today" });
  assert.equal(result.ok, false);
});

test("only known packages are accepted", () => {
  assert.ok(isSpotlightPackage("WEEK"));
  assert.ok(isSpotlightPackage("MONTH"));
  assert.equal(isSpotlightPackage("YEAR"), false);
  assert.equal(isSpotlightPackage("toString"), false);
  assert.equal(isSpotlightPackage(null), false);
});
