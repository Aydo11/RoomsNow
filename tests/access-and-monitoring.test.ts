import test from "node:test";
import assert from "node:assert/strict";
import { hasAdminPermission } from "../src/lib/admin-permissions";
import { sanitiseError } from "../src/lib/sentry-options";
import { bool } from "../src/server/form";
import { decodeFeedback, encodeFeedback } from "../src/lib/feedback";
import { highestProviderMembership, highestReferrerMembership } from "../src/lib/membership-access";
import { hasProviderMapAccess } from "../src/lib/entitlements";
import { BOOST_PACKAGES, rankBoosted } from "../src/lib/boost-packages";

test("boolean form values accept native checkboxes and explicit one values", () => {
  for (const value of ["on", "true", "1"]) {
    const data = new FormData();
    data.set("accepted", value);
    assert.equal(bool(data, "accepted"), true);
  }
  assert.equal(bool(new FormData(), "accepted"), false);
});

test("site feedback keeps its category, title, page and message in the review queue", () => {
  const encoded = encodeFeedback("FEATURE", "Map controls", "Please add a clearer zoom control.", "https://www.roomsnow.co.uk/search");
  assert.deepEqual(decodeFeedback(encoded), {
    category: "FEATURE",
    title: "Map controls",
    pageUrl: "https://www.roomsnow.co.uk/search",
    message: "Please add a clearer zoom control.",
  });
});

test("non-admins cannot gain access from the default permissions field", () => {
  for (const role of ["USER", "PROVIDER", "REFERRER"]) {
    assert.equal(hasAdminPermission({ role, adminPermissions: ["ALL"] }), false);
    assert.equal(hasAdminPermission({ role, adminPermissions: ["ALL"] }, "MODERATION"), false);
  }
  assert.equal(hasAdminPermission(null), false);
});
test("moderators have no full administrator access", () => {
  const moderator = { role: "ADMIN", adminPermissions: ["MODERATION"] };
  assert.equal(hasAdminPermission(moderator), false);
  assert.equal(hasAdminPermission(moderator, "MODERATION"), true);
  assert.equal(hasAdminPermission({ role: "ADMIN", adminPermissions: [] }), false);
});
test("full administrators retain moderation access", () => {
  const admin = { role: "ADMIN", adminPermissions: ["ALL"] };
  assert.equal(hasAdminPermission(admin), true);
  assert.equal(hasAdminPermission(admin, "MODERATION"), true);
});
test("an admin grant raises access without reducing a higher paid plan", () => {
  const free = { id: "free", tier: "FREE" };
  const professional = { id: "professional", tier: "PROFESSIONAL" };
  const business = { id: "business", tier: "BUSINESS" };

  assert.equal(highestProviderMembership(null, professional, free)?.id, "professional");
  assert.equal(highestProviderMembership(professional, business, free)?.id, "business");
  assert.equal(highestProviderMembership(business, professional, free)?.id, "business");
  assert.equal(highestProviderMembership(null, null, free)?.id, "free");

  const referrerFree = { id: "referrer-free", tier: "REFERRER_FREE" };
  const referrerPro = { id: "referrer-pro", tier: "REFERRER_PRO" };
  assert.equal(highestReferrerMembership(null, referrerPro, referrerFree)?.id, "referrer-pro");
  assert.equal(highestReferrerMembership(referrerPro, null, referrerFree)?.id, "referrer-pro");
});
test("a provider subscription or active admin grant makes advert maps public", () => {
  const free = { priceMonthly: 0, priceYearly: null };
  const paid = { priceMonthly: 4900, priceYearly: 49000 };
  const activeGrant = { startsAt: new Date(Date.now() - 1000), expiresAt: null, revokedAt: null, membership: paid };

  assert.equal(hasProviderMapAccess({ subscription: { status: "ACTIVE", membership: paid }, membershipGrants: [] }), true);
  assert.equal(hasProviderMapAccess({ subscription: null, membershipGrants: [activeGrant] }), true);
  assert.equal(hasProviderMapAccess({ subscription: { status: "CANCELLED", membership: paid }, membershipGrants: [] }), false);
  assert.equal(hasProviderMapAccess({ subscription: { status: "ACTIVE", membership: free }, membershipGrants: [] }), false);
});
test("boost packs keep the advertised prices and credit counts", () => {
  assert.deepEqual(
    Object.values(BOOST_PACKAGES).map(({ credits, amount }) => [credits, amount]),
    [[1, 500], [3, 1000], [10, 3000]],
  );
});
test("active boosts prioritise new placements, expire truthfully and rotate hourly", () => {
  const now = new Date("2026-09-10T12:00:00.000Z");
  const hour = 60 * 60 * 1000;
  const item = (id: string, startHoursAgo: number, priorityHoursLeft: number, expiryHoursLeft: number) => ({
    id,
    boostStartsAt: new Date(now.getTime() - startHoursAgo * hour),
    boostPriorityUntil: new Date(now.getTime() + priorityHoursLeft * hour),
    boostedUntil: new Date(now.getTime() + expiryHoursLeft * hour),
  });
  const items = [
    item("old-a", 8, -5, 16),
    item("new", 1, 2, 23),
    item("old-b", 7, -4, 17),
    item("expired", 25, -22, -1),
  ];

  const firstHour = rankBoosted(items, now);
  const nextHour = rankBoosted(items, new Date(now.getTime() + hour));
  assert.equal(firstHour[0]?.id, "new");
  assert.equal(nextHour[0]?.id, "new");
  assert.equal(firstHour.some(({ id }) => id === "expired"), false);
  assert.notEqual(firstHour[1]?.id, nextHour[1]?.id);
});
test("error monitoring strips submitted data and identity", () => {
  const event = sanitiseError({
    type: undefined,
    user: { email: "private@example.com" }, request: { data: "private record" },
    breadcrumbs: [{ message: "private message" }], extra: { password: "secret" },
    contexts: { privateRecord: { name: "Private" } }, message: "Private error",
    exception: { values: [{ type: "Error", value: "Query containing private data", stacktrace: {
      frames: [{ filename: "https://example.com/app.js?token=private", vars: { name: "Private" } }],
    } }] },
  });
  for (const key of ["user", "request", "breadcrumbs", "extra", "contexts", "message"]) assert.equal(key in event, false);
  assert.equal(event.exception?.values?.[0].value, "Application error (message redacted)");
  assert.equal(event.exception?.values?.[0].stacktrace?.frames?.[0].filename, "https://example.com/app.js");
  assert.equal(event.exception?.values?.[0].stacktrace?.frames?.[0].vars, undefined);
});
