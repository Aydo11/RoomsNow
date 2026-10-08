import { test } from "node:test";
import assert from "node:assert/strict";
import { whatsappAccess, whatsappPlanLine } from "../src/lib/whatsapp-access";
import { effectiveProviderTier } from "../src/lib/entitlements";

test("WhatsApp is included on Business, an add-on on Professional, unavailable on Free", () => {
  assert.deepEqual(whatsappAccess("BUSINESS", null), { allowed: true, reason: "INCLUDED" });
  assert.deepEqual(whatsappAccess("PROFESSIONAL", null), { allowed: false, reason: "NEEDS_ADDON" });
  assert.deepEqual(whatsappAccess("PROFESSIONAL", "CANCELLED"), { allowed: false, reason: "NEEDS_ADDON" });
  assert.deepEqual(whatsappAccess("PROFESSIONAL", "ACTIVE"), { allowed: true, reason: "ADDON" });
  assert.deepEqual(whatsappAccess("FREE", "ACTIVE"), { allowed: false, reason: "NEEDS_UPGRADE" });
  assert.equal(whatsappPlanLine("FREE").enabled, false);
  assert.match(whatsappPlanLine("PROFESSIONAL").text, /£20/);
});

test("effective tier takes the higher of a paid plan and a live grant", () => {
  const past = new Date(Date.now() - 1000);
  const future = new Date(Date.now() + 86_400_000);
  assert.equal(effectiveProviderTier({ subscription: null, membershipGrants: [] }), "FREE");
  assert.equal(effectiveProviderTier({ subscription: { status: "ACTIVE", membership: { tier: "PROFESSIONAL" } }, membershipGrants: [] }), "PROFESSIONAL");
  assert.equal(effectiveProviderTier({ subscription: { status: "CANCELLED", membership: { tier: "BUSINESS" } }, membershipGrants: [] }), "FREE");
  assert.equal(
    effectiveProviderTier({
      subscription: { status: "ACTIVE", membership: { tier: "PROFESSIONAL" } },
      membershipGrants: [{ startsAt: past, expiresAt: future, revokedAt: null, membership: { tier: "BUSINESS" } }],
    }),
    "BUSINESS",
  );
  assert.equal(
    effectiveProviderTier({ subscription: null, membershipGrants: [{ startsAt: past, expiresAt: past, revokedAt: null, membership: { tier: "BUSINESS" } }] }),
    "FREE",
  );
});

test("an admin WhatsApp grant works on any plan until it expires", () => {
  const future = new Date(Date.now() + 86_400_000);
  const past = new Date(Date.now() - 1000);
  assert.deepEqual(whatsappAccess("FREE", null, { whatsappGrantActive: true, whatsappGrantExpiresAt: null }), { allowed: true, reason: "GRANTED" });
  assert.deepEqual(whatsappAccess("PROFESSIONAL", null, { whatsappGrantActive: true, whatsappGrantExpiresAt: future }), { allowed: true, reason: "GRANTED" });
  assert.deepEqual(whatsappAccess("FREE", null, { whatsappGrantActive: true, whatsappGrantExpiresAt: past }), { allowed: false, reason: "NEEDS_UPGRADE" });
  assert.deepEqual(whatsappAccess("FREE", null, { whatsappGrantActive: false, whatsappGrantExpiresAt: null }), { allowed: false, reason: "NEEDS_UPGRADE" });
  assert.deepEqual(whatsappAccess("BUSINESS", null, { whatsappGrantActive: true, whatsappGrantExpiresAt: null }), { allowed: true, reason: "INCLUDED" });
});
