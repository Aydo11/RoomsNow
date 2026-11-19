import assert from "node:assert/strict";
import test from "node:test";
import { newListingLabel } from "../src/lib/format";

test("new tag shows for 7 days, then disappears", () => {
  const now = Date.UTC(2026, 10, 19, 12);
  const ago = (h: number) => new Date(now - h * 3_600_000);
  assert.equal(newListingLabel(ago(2), now), "today");
  assert.equal(newListingLabel(ago(30), now), "1 day ago");
  assert.equal(newListingLabel(ago(6 * 24 + 5), now), "6 days ago");
  assert.equal(newListingLabel(ago(7 * 24), now), null);
  assert.equal(newListingLabel(null, now), null);
});
