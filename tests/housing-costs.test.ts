import assert from "node:assert/strict";
import test from "node:test";
import { birminghamRatesCurrent, BIRMINGHAM_MONTHLY_UC_LHA, rentCapEstimate } from "../src/lib/housing-costs";

test("rent comparison caps at rent and never reports a negative gap", () => {
  assert.equal(rentCapEstimate(100, "weekly", 78.61, "HB")?.shortfall.toFixed(2), "21.39");
  assert.equal(rentCapEstimate(50, "weekly", 78.61, "HB")?.maximum, 50);
  assert.equal(rentCapEstimate(50, "weekly", 78.61, "HB")?.shortfall, 0);
  assert.equal(rentCapEstimate(150, "weekly", 600, "UC")?.rent, 650);
  assert.equal(rentCapEstimate(650, "monthly", 150, "HB")?.rent, 150);
  assert.equal(rentCapEstimate(0, "weekly", 78.61, "HB")?.maximum, 0);
  assert.equal(rentCapEstimate(100, "weekly", BIRMINGHAM_MONTHLY_UC_LHA[0], "UC")?.maximum, 341.58);
});
test("invalid amounts and stale rate examples are rejected", () => {
  for (const value of [-1, NaN, Infinity, 100001]) assert.equal(rentCapEstimate(value, "monthly", 600, "UC"), null);
  assert.equal(birminghamRatesCurrent(new Date("2026-04-01")), true);
  assert.equal(birminghamRatesCurrent(new Date("2027-04-01")), false);
  assert.equal(birminghamRatesCurrent(new Date("2026-03-31")), false);
});
