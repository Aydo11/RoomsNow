import assert from "node:assert/strict";
import test from "node:test";
import { blockedContent, matchingPhrases } from "../src/lib/blocked-content-patterns";

test("blocks payment links, bank details and wallets", () => {
  assert.ok(blockedContent("pay the deposit here paypal.me/roomsuk"));
  assert.ok(blockedContent("Send it to monzo.me/jsmith please"));
  assert.ok(blockedContent("https://revolut.me/abc123"));
  assert.ok(blockedContent("My cashtag is $roomlord"));
  assert.ok(blockedContent("sort code 20-45-77 account number 12345678"));
  assert.ok(blockedContent("IBAN GB33BUKB20201555555555"));
  assert.ok(blockedContent("wallet 0x52908400098527886E0F7030069857D2E4169EE7"));
});

test("leaves ordinary messages and adverts alone", () => {
  assert.equal(blockedContent("Rent is £150 a week, bills included. Viewing Tuesday 2pm?"), null);
  assert.equal(blockedContent("Housing benefit accepted. Call 07700 900123 to arrange a viewing."), null);
  assert.equal(blockedContent("We pay your first week of council tax and support is $0 extra"), null);
});

test("admin words match whole words, any case", () => {
  assert.ok(blockedContent("please use Western Union", ["western union"]));
  assert.equal(blockedContent("the westernunionstreet flat", ["western union"]), null);
  assert.deepEqual(matchingPhrases("Holding FEE needed", ["holding fee", "crypto"]), ["holding fee"]);
});
