import assert from "node:assert/strict";
import test from "node:test";
import { firstReplyMinutes, median, responseLabel } from "../src/lib/response-label";
import { isSummaryTime } from "../src/lib/uk-time";

const at = (iso: string) => new Date(iso);
const team = new Set(["provider"]);

test("response badge needs at least three conversations", () => {
  assert.equal(responseLabel(30, 2), null);
  assert.equal(responseLabel(30, 3), "Usually replies within an hour");
});

test("response badge bands", () => {
  assert.equal(responseLabel(60, 5), "Usually replies within an hour");
  assert.equal(responseLabel(120, 5), "Usually replies within a few hours");
  assert.equal(responseLabel(600, 5), "Usually replies within a day");
  assert.equal(responseLabel(2000, 5), null);
  assert.equal(responseLabel(null, 5), null);
});

test("first reply is timed from the first outside message", () => {
  const minutes = firstReplyMinutes(
    [
      { senderId: "tenant", createdAt: at("2026-09-21T10:00:00Z") },
      { senderId: "tenant", createdAt: at("2026-09-21T10:05:00Z") },
      { senderId: "provider", createdAt: at("2026-09-21T11:30:00Z") },
    ],
    team,
  );
  assert.equal(minutes, 90);
});

test("conversations the provider started don't count", () => {
  assert.equal(
    firstReplyMinutes([{ senderId: "provider", createdAt: at("2026-09-21T10:00:00Z") }, { senderId: "tenant", createdAt: at("2026-09-21T10:10:00Z") }], team),
    null,
  );
});

test("unanswered messages count as a week once a week has passed, and are skipped before that", () => {
  const message = [{ senderId: "tenant", createdAt: at("2026-09-01T10:00:00Z") }];
  assert.equal(firstReplyMinutes(message, team, at("2026-09-03T10:00:00Z")), null);
  assert.equal(firstReplyMinutes(message, team, at("2026-09-20T10:00:00Z")), 7 * 24 * 60);
});

test("median handles odd and even lists", () => {
  assert.equal(median([]), null);
  assert.equal(median([5, 1, 3]), 3);
  assert.equal(median([1, 2, 3, 10]), 3);
});

test("the weekly summary goes out from 8am UK time on Mondays, including in summer time", () => {
  // Monday 28 September 2026 is British Summer Time (UTC+1).
  assert.equal(isSummaryTime(at("2026-09-28T06:30:00Z")), false); // 07:30 in London
  assert.equal(isSummaryTime(at("2026-09-28T07:00:00Z")), true); // 08:00 in London
  assert.equal(isSummaryTime(at("2026-09-29T07:00:00Z")), false); // Tuesday
  // Monday 7 December 2026 is GMT.
  assert.equal(isSummaryTime(at("2026-12-07T07:30:00Z")), false);
  assert.equal(isSummaryTime(at("2026-12-07T08:00:00Z")), true);
});
