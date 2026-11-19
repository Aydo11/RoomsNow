import assert from "node:assert/strict";
import test from "node:test";
import { NEW_PROVIDER_SPOTLIGHT_MS, spotlightEndsAt } from "../src/lib/new-provider";

test("new provider spotlight lasts 72 hours from the first advert going live", () => {
  const now = Date.UTC(2026, 10, 19, 12);
  const hoursAgo = (h: number) => new Date(now - h * 3_600_000);
  assert.equal(NEW_PROVIDER_SPOTLIGHT_MS, 72 * 3_600_000);
  assert.equal(spotlightEndsAt(hoursAgo(1), now)?.getTime(), now + 71 * 3_600_000);
  assert.ok(spotlightEndsAt(hoursAgo(71.9), now));
  assert.equal(spotlightEndsAt(hoursAgo(72), now), null);
  assert.equal(spotlightEndsAt(null, now), null);
});
