import assert from "node:assert/strict";
import test from "node:test";
import { scamSignals } from "../src/lib/scam-signal-patterns";

test("flags common rental scam phrases", () => {
  assert.ok(scamSignals("Please send the deposit before the viewing so I can hold it").length > 0);
  assert.ok(scamSignals("Can you do a bank transfer today? Sort code 12-34-56").includes("a bank transfer"));
  assert.ok(scamSignals("I'm abroad at the moment, I'll post the keys to you").length >= 2);
  assert.ok(scamSignals("Pay with a gift card please").includes("untraceable payment"));
});

test("leaves ordinary messages alone", () => {
  assert.deepEqual(scamSignals("Hi, is the room still available? Can I view it on Tuesday?"), []);
  assert.deepEqual(scamSignals("Rent is covered by housing benefit, bills included."), []);
});
