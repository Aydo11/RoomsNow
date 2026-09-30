import test from "node:test";
import assert from "node:assert/strict";
import { optimisedImage } from "../src/lib/image-url";

test("image url: stored photos go through the optimiser at a sensible width", () => {
  const r2 = "https://pub-abc.r2.dev/listings/x/photo.jpg";
  assert.equal(optimisedImage(r2, 128), `/_next/image?url=${encodeURIComponent(r2)}&w=256&q=75`);
  assert.equal(optimisedImage(r2, 5000), `/_next/image?url=${encodeURIComponent(r2)}&w=1920&q=75`);
  assert.equal(optimisedImage("/uploads/listings/a.png", 44), "/_next/image?url=%2Fuploads%2Flistings%2Fa.png&w=96&q=75");
});

test("image url: everything else is left alone", () => {
  assert.equal(optimisedImage("blob:https://x/123", 100), "blob:https://x/123");
  assert.equal(optimisedImage("/uploads/seed/listing-1.svg", 100), "/uploads/seed/listing-1.svg");
  assert.equal(optimisedImage("https://example.com/a.jpg", 100), "https://example.com/a.jpg");
  assert.equal(optimisedImage("/api/clients/1/photo", 100), "/api/clients/1/photo");
  assert.equal(optimisedImage(null, 100), undefined);
});
