import assert from "node:assert/strict";
import test from "node:test";
import { suggestedReplies } from "../src/lib/suggested-replies";

test("suggested messages fit who is writing and answer the last message", () => {
  assert.equal(suggestedReplies("seeker", null)[0], "Is the room still available?");
  assert.equal(suggestedReplies("provider", null)[0], "The room is still available.");
  assert.equal(suggestedReplies("referrer", null)[0], "Is the room still available for a referral?");
  assert.equal(suggestedReplies("seeker", "Thanks")[0], "You're welcome!");
  const answer = suggestedReplies("seeker", "Would you like to arrange a viewing?");
  assert.deepEqual(answer.slice(0, 3), ["Yes, that works for me.", "Sorry, not at the moment.", "What days and times suit you?"]);
  assert.ok(answer.length <= 7);
  assert.equal(new Set(answer).size, answer.length);
});
