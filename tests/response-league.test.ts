import assert from "node:assert/strict";
import test from "node:test";
import { formatReplyTime, rankResponders } from "../src/lib/response-league";

test("league ranks by median reply time and needs enough replies", () => {
  const ranked = rankResponders(new Map([
    ["slow", [300, 400, 500]],
    ["fast", [5, 10, 200]],
    ["tooFew", [1, 1]],
    ["tie", [10, 10, 10, 10]],
    ["ignores", [10080, 10080, 10080]],
  ]));
  assert.deepEqual(ranked.map((r) => r.companyId), ["tie", "fast", "slow"]);
  assert.equal(ranked[1].minutes, 10);
});

test("reply times read naturally", () => {
  assert.equal(formatReplyTime(0), "1 min");
  assert.equal(formatReplyTime(45), "45 min");
  assert.equal(formatReplyTime(125), "2 hr 5 min");
  assert.equal(formatReplyTime(60 * 27), "1 day 3 hr");
});
