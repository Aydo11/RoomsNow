import assert from "node:assert/strict";
import test from "node:test";
import { whatsappAdvertUrl, whatsappNumber } from "../src/lib/whatsapp";

test("WhatsApp normalises UK and explicit international numbers", () => {
  assert.equal(whatsappNumber("07700 900123"), "447700900123");
  assert.equal(whatsappNumber("+44 (7700) 900123"), "447700900123");
  assert.equal(whatsappNumber("0044 7700 900123"), "447700900123");
  assert.equal(whatsappNumber("+1 202 555 0100"), "12025550100");
  for (const invalid of ["", "abc07700900123", "123", "2025550100", "+00000", "+1234567890123456", "++447700900123", "44+7700900123"]) assert.equal(whatsappNumber(invalid), null);
});

test("WhatsApp links are opt-in and safely encode the advert", () => {
  assert.equal(whatsappAdvertUrl(false, "447700900123", "Room", "https://example.com"), null);
  assert.equal(whatsappAdvertUrl(true, null, "Room", "https://example.com"), null);
  const link = new URL(whatsappAdvertUrl(true, "447700900123", "Room & home", "https://example.com/listings/1")!);
  assert.equal(link.hostname, "wa.me");
  assert.equal(link.pathname, "/447700900123");
  assert.match(link.searchParams.get("text")!, /Room & home.*available\?/);
  assert.match(link.searchParams.get("text")!, /https:\/\/example.com\/listings\/1/);
});
