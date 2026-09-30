import test from "node:test";
import assert from "node:assert/strict";
import { WELCOME_NOTIFICATION, WELCOME_SERVICES, WELCOME_STEPS, WELCOME_TIP } from "../src/lib/welcome-content";
import { seekerAudienceWhere } from "../src/lib/seeker-audience";

test("welcome content: every service links somewhere on the site", () => {
  assert.ok(WELCOME_SERVICES.length >= 6);
  for (const service of WELCOME_SERVICES) {
    assert.match(service.href, /^\/[a-z]/, service.title);
    assert.ok(service.title && service.body && service.cta, service.title);
  }
  assert.equal(new Set(WELCOME_SERVICES.map((service) => service.title)).size, WELCOME_SERVICES.length);
  assert.equal(WELCOME_STEPS.length, 3);
  assert.ok(WELCOME_TIP.points.some((point) => /number/i.test(point)));
  assert.match(WELCOME_NOTIFICATION.title, /thank you/i);
});

test("seeker audience: only active, confirmed people looking for a room", () => {
  const all = seekerAudienceWhere("ALL");
  assert.equal(all.role, "USER");
  assert.equal(all.status, "ACTIVE");
  assert.equal(all.deletedAt, null);
  assert.deepEqual(all.emailVerified, { not: null });

  const now = new Date("2026-09-30T12:00:00Z");
  const recent = seekerAudienceWhere("RECENT", now);
  assert.equal(recent.role, "USER");
  assert.deepEqual(recent.createdAt, { gte: new Date("2026-08-31T12:00:00Z") });

  const noAdvert = seekerAudienceWhere("NO_ADVERT");
  assert.deepEqual(noAdvert.lookingForAds, { none: {} });
  assert.deepEqual(noAdvert.emailVerified, { not: null });
});
