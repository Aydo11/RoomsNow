import assert from "node:assert/strict";
import test from "node:test";
import { matchesNeighbourhood, neighbourhoodFromSlug, neighbourhoodGuides } from "../src/lib/neighbourhood-guides";

test("neighbourhoods do not show rooms from similarly named places", () => {
  assert.equal(matchesNeighbourhood("Handsworth", { city: "Sheffield", area: "Handsworth" }), false);
  assert.equal(matchesNeighbourhood("Handsworth", { city: "Birmingham", area: "Handsworth Wood" }), false);
  assert.equal(matchesNeighbourhood("Small Heath", { city: " birmingham ", area: "Small-Heath" }), true);
  assert.equal(matchesNeighbourhood("Erdington", { city: "Birmingham", area: null }), false);
});
test("guides have unique routes and HTTPS source links", () => {
  assert.equal(new Set(neighbourhoodGuides.map((guide) => guide.slug)).size, neighbourhoodGuides.length);
  assert.equal(neighbourhoodFromSlug("unknown"), null);
  for (const guide of neighbourhoodGuides) for (const resource of guide.resources) assert.equal(new URL(resource.url).protocol, "https:");
});
