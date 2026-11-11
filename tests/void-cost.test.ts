import assert from "node:assert/strict";
import test from "node:test";
import { voidCalculator } from "../src/lib/void-cost";

test("public void calculator adds bills to lost rent and ignores bad input", () => {
  const r = voidCalculator({ rooms: 3, weeklyRent: 150, weeklyBills: 25, weeksEmpty: 6 });
  assert.equal(r.weekly, 525);
  assert.equal(r.monthly, 2275);
  assert.equal(r.yearly, 27300);
  assert.equal(r.soFar, 3150);
  assert.equal(voidCalculator({ rooms: Number.NaN, weeklyRent: -5, weeklyBills: 0, weeksEmpty: 1 }).weekly, 0);
});
