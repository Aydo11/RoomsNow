import assert from "node:assert/strict";
import test from "node:test";
import { guides, relatedGuides } from "../src/lib/guides";

test("every public guide has contextual internal recommendations", () => {
  for (const guide of guides) {
    const related = relatedGuides(guide.slug);
    assert.ok(related.length > 0, `${guide.slug} should link to related guidance`);
    assert.ok(related.every((item) => item.slug !== guide.slug), `${guide.slug} must not link to itself`);
    assert.equal(new Set(related.map((item) => item.slug)).size, related.length, `${guide.slug} should not repeat recommendations`);
  }
});

test("guide recommendations only point to published guides", () => {
  const published = new Set(guides.map((guide) => guide.slug));
  for (const guide of guides) {
    for (const related of relatedGuides(guide.slug)) {
      assert.ok(published.has(related.slug), `${guide.slug} points to an unpublished guide`);
    }
  }
});
