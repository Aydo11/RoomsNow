import test from "node:test";
import assert from "node:assert/strict";
import { mentionsPhone, normaliseUkPhone, withContactNumber } from "../src/lib/contact-number";

test("contact number: tidies UK numbers and rejects junk", () => {
  assert.equal(normaliseUkPhone("07700900123"), "07700 900123");
  assert.equal(normaliseUkPhone("+44 7700 900123"), "07700 900123");
  assert.equal(normaliseUkPhone("0121 448 3883"), "0121 448 3883");
  assert.equal(normaliseUkPhone("020 7946 0018"), "020 7946 0018");
  assert.equal(normaliseUkPhone("12345"), null);
  assert.equal(normaliseUkPhone("call me"), null);
  assert.equal(normaliseUkPhone(""), null);
});

test("contact number: spots a number already in the message", () => {
  assert.equal(mentionsPhone("Hi, my number is 07700 900123 thanks"), true);
  assert.equal(mentionsPhone("Ring me on +44 7700 900 123"), true);
  assert.equal(mentionsPhone("Is the room still available? Moving on 12/10/2026"), false);
  assert.equal(mentionsPhone("£150 per week, 3 rooms"), false);
});

test("contact number: adds the number once", () => {
  assert.match(withContactNumber("Is it available?", "07700 900123"), /My number is 07700 900123/);
  assert.equal(withContactNumber("Call 07700 900123", "07700 900123"), "Call 07700 900123");
  assert.equal(withContactNumber("Hello", null), "Hello");
});

test("contact number: accepts international numbers, rejects words", async () => {
  const { contactNumberFromInput } = await import("../src/lib/contact-number");
  assert.equal(contactNumberFromInput(""), null);
  assert.equal(contactNumberFromInput("07700900123"), "07700 900123");
  assert.equal(contactNumberFromInput("+353 85 123 4567"), "+353 85 123 4567");
  assert.equal(contactNumberFromInput("ring me"), "invalid");
  assert.equal(contactNumberFromInput("12"), "invalid");
});
