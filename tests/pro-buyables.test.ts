import assert from "node:assert/strict";
import test from "node:test";
import { PRO_BUYABLES, hourlyCharge, proBuyable } from "../src/lib/pro-services";

test("every Pro Services item has a unique key and a positive price", () => {
  const keys = PRO_BUYABLES.map((b) => b.key);
  assert.equal(new Set(keys).size, keys.length);
  for (const b of PRO_BUYABLES) assert.ok(Number.isInteger(b.amount) && b.amount > 0, b.key);
  assert.equal(proBuyable("expert_mentoring")?.amount, 99500);
  assert.equal(proBuyable("nope"), undefined);
});

test("Business members pay 10% less per expert hour", () => {
  assert.equal(hourlyCharge(15000, false), 15000);
  assert.equal(hourlyCharge(15000, true), 13500);
});
