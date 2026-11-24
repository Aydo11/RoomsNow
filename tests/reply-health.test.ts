import assert from "node:assert/strict";
import test from "node:test";
import { REPLY_TIER, conversationWaiting, replyTier, slowReplyLabel } from "../src/lib/reply-health";

const DAY = 86_400_000;
const now = Date.UTC(2027, 0, 30, 12);
const daysAgo = (d: number) => new Date(now - d * DAY);

test("a conversation waits from the first unanswered outside message", () => {
  const team = new Set(["p"]);
  const w = conversationWaiting([
    { senderId: "s", createdAt: daysAgo(20) },
    { senderId: "p", createdAt: daysAgo(19) },
    { senderId: "s", createdAt: daysAgo(10) },
    { senderId: "s", createdAt: daysAgo(9) },
  ], team);
  assert.equal(w.waitingSince?.getTime(), daysAgo(10).getTime());
  assert.equal(w.waitingFrom, "s");
  assert.equal(w.lastTeamAt?.getTime(), daysAgo(19).getTime());
  assert.equal(conversationWaiting([{ senderId: "s", createdAt: daysAgo(3) }, { senderId: "p", createdAt: daysAgo(2) }], team).waitingSince, null);
});

test("tiers: fast, normal, slow after 14 silent days, never paused", () => {
  const base = { responseMinutes: 30, responseSampleSize: 5 };
  assert.equal(replyTier({ ...base, waitingSince: null, lastTeamReplyAt: null }, now), REPLY_TIER.FAST);
  assert.equal(replyTier({ responseMinutes: null, responseSampleSize: 0, waitingSince: null, lastTeamReplyAt: null }, now), REPLY_TIER.NORMAL);
  assert.equal(replyTier({ ...base, waitingSince: daysAgo(15), lastTeamReplyAt: daysAgo(40) }, now), REPLY_TIER.SLOW);
  // However long the silence, the worst is the label: adverts are never paused.
  assert.equal(replyTier({ ...base, waitingSince: daysAgo(90), lastTeamReplyAt: null }, now), REPLY_TIER.SLOW);
  // Replying to anyone recently means they are not silent, even with an old wait elsewhere.
  assert.equal(replyTier({ ...base, waitingSince: daysAgo(31), lastTeamReplyAt: daysAgo(2) }, now), REPLY_TIER.FAST);
  assert.equal(slowReplyLabel(REPLY_TIER.SLOW), "May be slow to reply");
  assert.equal(slowReplyLabel(REPLY_TIER.FAST), null);
});
