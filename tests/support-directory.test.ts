import test from "node:test";
import assert from "node:assert/strict";
import {
  directionsHref,
  isSupportCategory,
  postIsCurrent,
  slugify,
  SUPPORT_SEED,
  telHref,
} from "../src/lib/support-directory";

test("support directory: seed data is well formed", () => {
  const keys = new Set<string>();
  for (const seed of SUPPORT_SEED) {
    assert.ok(!keys.has(seed.seedKey), `duplicate seed ${seed.seedKey}`);
    keys.add(seed.seedKey);
    assert.ok(seed.categories.length > 0 && seed.categories.every(isSupportCategory), seed.name);
    assert.ok(seed.phone || seed.textNumber || seed.website, `${seed.name} has no way to get in touch`);
    if (seed.website) assert.match(seed.website, /^https:\/\//);
    for (const location of seed.locations ?? []) {
      assert.match(location.postcode, /^[A-Z]{1,2}\d[A-Z\d]? \d[A-Z]{2}$/, `${seed.name}: ${location.postcode}`);
    }
    if (seed.scope === "LOCAL") assert.ok(seed.areas?.length, `${seed.name} needs an area`);
  }
  assert.ok(keys.has("kikit") && keys.has("cgl-birmingham") && keys.has("samaritans"));
});

test("support directory: tap-to-call and directions links", () => {
  assert.equal(telHref("0121 448 3883"), "tel:01214483883");
  assert.equal(telHref("116 123"), "tel:116123");
  assert.equal(directionsHref("153 Stratford Road, Birmingham B11 1RD"), "https://www.google.com/maps/dir/?api=1&destination=153%20Stratford%20Road%2C%20Birmingham%20B11%201RD");
  assert.equal(slugify("Change Grow Live – Birmingham"), "change-grow-live-birmingham");
});

test("support directory: posts drop off once they're over", () => {
  const now = new Date("2026-10-10T12:00:00Z");
  const base = { createdAt: new Date("2026-10-01T09:00:00Z"), removedAt: null, endsAt: null };
  assert.equal(postIsCurrent({ ...base, startsAt: new Date("2026-10-12T10:00:00Z") }, now), true);
  // Started this morning: still shown for the rest of the day.
  assert.equal(postIsCurrent({ ...base, startsAt: new Date("2026-10-10T09:00:00Z") }, now), true);
  assert.equal(postIsCurrent({ ...base, startsAt: new Date("2026-10-08T09:00:00Z") }, now), false);
  // News with no date shows for 90 days.
  assert.equal(postIsCurrent({ ...base, startsAt: null }, now), true);
  assert.equal(postIsCurrent({ ...base, startsAt: null, createdAt: new Date("2026-06-01T09:00:00Z") }, now), false);
  assert.equal(postIsCurrent({ ...base, startsAt: null, removedAt: new Date() }, now), false);
});
