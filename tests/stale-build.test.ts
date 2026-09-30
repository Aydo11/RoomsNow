import test from "node:test";
import assert from "node:assert/strict";
import { isStaleBuildError } from "../src/lib/stale-build";

test("stale build: recognises the chunk errors browsers throw after a deploy", () => {
  const chunk = new Error("Loading chunk 8123 failed.\n(error: https://www.roomsnow.co.uk/_next/static/chunks/8123-abc.js)");
  chunk.name = "ChunkLoadError";
  assert.equal(isStaleBuildError(chunk), true);
  assert.equal(isStaleBuildError(new TypeError("Failed to fetch dynamically imported module: https://x/_next/static/chunks/app/admin/page.js")), true);
  assert.equal(isStaleBuildError(new TypeError("Importing a module script failed.")), true);
  assert.equal(isStaleBuildError(new Error("Loading CSS chunk 12 failed")), true);
});

test("stale build: leaves real errors alone", () => {
  assert.equal(isStaleBuildError(new Error("Listing not found.")), false);
  assert.equal(isStaleBuildError(new TypeError("Cannot read properties of undefined (reading 'id')")), false);
  assert.equal(isStaleBuildError(null), false);
});
