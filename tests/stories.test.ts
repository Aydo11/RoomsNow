import assert from "node:assert/strict";
import test from "node:test";
import { cleanCaption, groupStories, STORY_CAPTION_MAX, storyExpiry } from "../src/lib/stories";

test("stories expire 24 hours after posting", () => {
  const from = new Date("2026-11-03T09:00:00Z");
  assert.equal(storyExpiry(from).toISOString(), "2026-11-04T09:00:00.000Z");
});

test("captions are tidied, capped and optional", () => {
  assert.equal(cleanCaption("  Double room   free now "), "Double room free now");
  assert.equal(cleanCaption("x".repeat(STORY_CAPTION_MAX + 20))?.length, STORY_CAPTION_MAX);
  assert.equal(cleanCaption("   "), null);
});

test("stories group by provider, play in order, newest provider first", () => {
  const groups = groupStories([
    { companyId: "a", createdAt: "2026-11-03T08:00:00Z" },
    { companyId: "b", createdAt: "2026-11-03T09:00:00Z" },
    { companyId: "a", createdAt: "2026-11-03T07:00:00Z" },
  ]);
  assert.deepEqual(groups.map((g) => g.companyId), ["b", "a"]);
  assert.deepEqual(groups[1].stories.map((s) => s.createdAt), ["2026-11-03T07:00:00Z", "2026-11-03T08:00:00Z"]);
});
