import assert from "node:assert/strict";
import test from "node:test";
import { showWhatsappContact, type WhatsappDisplayCompany } from "../src/lib/whatsapp-display";

const company: WhatsappDisplayCompany = { status: "ACTIVE", whatsappEnabled: true, whatsappNumber: "447700900123", whatsappAddonStatus: "ACTIVE", subscription: { status: "ACTIVE", membership: { tier: "PROFESSIONAL" } }, membershipGrants: [] };

test("WhatsApp cards require a live advert, paid access, number and opt-in", () => {
  assert.equal(showWhatsappContact("ACTIVE", company), true);
  for (const change of [{ whatsappEnabled: false }, { whatsappNumber: null }, { whatsappNumber: "invalid" }, { status: "SUSPENDED" }, { whatsappAddonStatus: "CANCELLED" }, { subscription: null }]) {
    assert.equal(showWhatsappContact("ACTIVE", { ...company, ...change }), false);
  }
  assert.equal(showWhatsappContact("ARCHIVED", company), false);
  assert.equal(showWhatsappContact("ACTIVE", {}), false);
});

test("Business and live grants show WhatsApp without an add-on", () => {
  assert.equal(showWhatsappContact("ACTIVE", { ...company, whatsappAddonStatus: null, subscription: { status: "ACTIVE", membership: { tier: "BUSINESS" } } }), true);
  assert.equal(showWhatsappContact("ACTIVE", { ...company, subscription: null, whatsappGrantActive: true }), true);
  assert.equal(showWhatsappContact("ACTIVE", { ...company, subscription: null, whatsappGrantActive: true, whatsappGrantExpiresAt: new Date(0) }), false);
});
