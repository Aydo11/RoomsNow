import assert from "node:assert/strict";
import test from "node:test";
import { appliedSearchFilters, removeSearchFilter, submitSearchQuery } from "../src/lib/search-query";

test("Find rooms preserves selected filters and sort, resets paging and removes cleared form fields", () => {
 const query = submitSearchQuery("where=Birmingham&type=MOTHER_AND_BABY_UNIT&ensuite=1&maxRent=80&sort=rent&support=mental-health&vetted=1&from=2026-11-01&page=3", { where: " Birmingham ", support: "", from: "", vetted: false });
 assert.equal(query.get("type"), "MOTHER_AND_BABY_UNIT");
 assert.equal(query.get("ensuite"), "1");
 assert.equal(query.get("maxRent"), "80");
 assert.equal(query.get("sort"), "rent");
 for (const key of ["page", "support", "vetted", "from"]) assert.equal(query.has(key), false);
});

test("changing location clears an old map area without clearing accommodation type", () => {
 const query = submitSearchQuery("where=Birmingham&bbox=1,2,3,4&type=HOUSE", { where: "Leeds", support: "homelessness", from: "", vetted: false });
 assert.equal(query.has("bbox"), false);
 assert.equal(query.get("type"), "HOUSE");
});

test("active filters include accommodation types, dates and budgets; removing one keeps the others", () => {
 const current = "type=MOTHER_AND_BABY_UNIT,HOUSE&support=mental-health,homelessness&from=2026-11-01&minRent=20&furnished=1&referral=LOCAL_AUTHORITY&page=2";
 const labels = appliedSearchFilters(new URLSearchParams(current)).map((filter) => filter.label);
 assert.ok(labels.includes("Mother and baby unit"));
 assert.ok(labels.includes("Move in by 2026-11-01"));
 assert.ok(labels.includes("From £20/wk"));
 assert.ok(labels.includes("Furnished"));
 assert.ok(labels.includes("Local authority"));
 const query = removeSearchFilter(current, "support", "mental-health");
 assert.equal(query.get("support"), "homelessness");
 assert.equal(query.get("type"), "MOTHER_AND_BABY_UNIT,HOUSE");
 assert.equal(query.has("page"), false);
 assert.equal(removeSearchFilter(query.toString(), "support", "homelessness").has("support"), false);
});
