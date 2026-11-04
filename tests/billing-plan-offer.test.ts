import assert from "node:assert/strict";
import test from "node:test";
import { planWasPrice } from "../src/lib/plan-offer";

test("was-price only shows when it's higher than the real price", () => {
  assert.equal(planWasPrice("PROFESSIONAL", 4900), 10000);
  assert.equal(planWasPrice("BUSINESS", 14900), 19999);
  assert.equal(planWasPrice("FREE", 0), null);
  assert.equal(planWasPrice("PROFESSIONAL", 12000), null);
});
