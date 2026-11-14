import assert from "node:assert/strict";
import test from "node:test";
import { matchesNeighbourhood, postcodeDistrict, neighbourhoodFromSlug, neighbourhoodGuides } from "../src/lib/neighbourhood-guides";

const guide = (slug: string) => neighbourhoodFromSlug(slug)!;

test("neighbourhoods do not show rooms from similarly named places", () => {
  assert.equal(matchesNeighbourhood(guide("handsworth"), { city: "Sheffield", area: "Handsworth", postcode: "S13 9AB" }), false);
  assert.equal(matchesNeighbourhood(guide("handsworth"), { city: "Birmingham", area: "Handsworth Wood", postcode: "B20 1AA" }), false);
  assert.equal(matchesNeighbourhood(guide("small-heath"), { city: " birmingham ", area: "Small-Heath" }), true);
  assert.equal(matchesNeighbourhood(guide("erdington"), { city: "Birmingham", area: null }), false);
});

test("rooms without an area are matched by postcode district", () => {
  assert.equal(postcodeDistrict("b23 6ub"), "B23");
  assert.equal(postcodeDistrict("B66UB"), "B6");
  assert.equal(matchesNeighbourhood(guide("erdington"), { city: "Birmingham", area: null, postcode: "B24 8AD" }), true);
  assert.equal(matchesNeighbourhood(guide("aston"), { city: "Birmingham", area: null, postcode: "B66 1AA" }), false);
  assert.equal(matchesNeighbourhood(guide("sutton-coldfield"), { city: "Sutton Coldfield", area: "Sutton Coldfield", postcode: "" }), true);
});
test("guides have unique routes and HTTPS source links", () => {
  assert.equal(new Set(neighbourhoodGuides.map((guide) => guide.slug)).size, neighbourhoodGuides.length);
  assert.equal(neighbourhoodFromSlug("unknown"), null);
  for (const guide of neighbourhoodGuides) for (const resource of guide.resources) assert.equal(new URL(resource.url).protocol, "https:");
});
