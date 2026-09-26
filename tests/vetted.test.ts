import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { vettedAccreditationWhere, vettedCompanyWhere } from "../src/lib/vetted";

test("vetted means an approved, in-date CQC or BVSC accreditation", () => {
  const now = new Date("2026-10-01T00:00:00Z");
  const where = vettedAccreditationWhere(undefined, now);
  assert.deepEqual(where.scheme, { in: ["CQC", "BVSC"] });
  assert.equal(where.status, "APPROVED");
  assert.deepEqual(where.OR, [{ expiresAt: null }, { expiresAt: { gte: now } }]);
  assert.deepEqual(vettedAccreditationWhere(["CQC"], now).scheme, { in: ["CQC"] });
  assert.equal(vettedCompanyWhere(undefined, now).status, "ACTIVE");
});

test("search honours the vetted filter and the vetted page is public", () => {
  const search = readFileSync("src/server/search.ts", "utf8");
  assert.match(search, /params\.vetted === "1" \? \{ accreditations: \{ some: vettedAccreditationWhere\(\) \} \}/);
  const page = readFileSync("src/app/(site)/vetted-providers/page.tsx", "utf8");
  assert.doesNotMatch(page, /require(User|Referrer|Admin|Company)\(/);
});
