import assert from "node:assert/strict";
import test from "node:test";
import { areaStats, filterAreaInventory } from "../src/lib/area-pages";

test("shared-room landing inventory excludes self-contained homes and unavailable adverts", () => {
  const base = { weeklyRentFrom: 15000, weeklyRentTo: null, housingBenefit: true, billsIncluded: true, supportTypes: [], referralRoutes: [], companyId: "shared-provider" };
  const listings = [
    { ...base, id: "shared", accommodationType: "SHARED_ACCOMMODATION", rooms: [{ status: "AVAILABLE" }, { status: "OCCUPIED" }] },
    { ...base, id: "supported-shared", accommodationType: "SHARED_ACCOMMODATION", supportTypes: ["mental-health"], rooms: [{ status: "AVAILABLE" }] },
    { ...base, id: "flat", companyId: "flat-provider", accommodationType: "SELF_CONTAINED", rooms: [{ status: "AVAILABLE" }, { status: "AVAILABLE" }] },
    { ...base, id: "reserved", accommodationType: "SHARED_ACCOMMODATION", rooms: [{ status: "RESERVED" }] },
    { ...base, id: "empty", accommodationType: "SHARED_ACCOMMODATION", rooms: [] },
  ];
  const selected = filterAreaInventory(listings, { accommodationType: "SHARED_ACCOMMODATION", availableOnly: true });
  assert.deepEqual(selected.map((listing) => listing.id), ["shared", "supported-shared"]);
  assert.equal(areaStats(selected).roomsFree, 2);
  assert.equal(areaStats(selected).adverts, 2);
  assert.equal(areaStats(selected).providers, 1);
  assert.deepEqual(filterAreaInventory(listings), listings, "existing area pages retain their default scope");
  assert.deepEqual(filterAreaInventory([], { availableOnly: true }), []);
});
