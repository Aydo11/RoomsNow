import assert from "node:assert/strict";
import test from "node:test";
import { listingSchema } from "../src/lib/validation";
import { assessmentFromForm } from "../src/lib/assessment";
import { buildSearchUrl, extractSearch } from "../src/lib/assistant/engine";
import { ACCOMMODATION_TYPES } from "../src/lib/taxonomy";

test("mother and baby units are valid advert types and survive referral assessment", () => {
  assert.equal(listingSchema.shape.accommodationType.parse("MOTHER_AND_BABY_UNIT"), "MOTHER_AND_BABY_UNIT");
  assert.equal(ACCOMMODATION_TYPES.MOTHER_AND_BABY_UNIT, "Mother and baby unit");
  const form = new FormData();
  form.append("accommodationTypes", "MOTHER_AND_BABY_UNIT");
  assert.deepEqual(assessmentFromForm(form).accommodationTypes, ["MOTHER_AND_BABY_UNIT"]);
});

test("assistant searches for explicitly requested mother and baby units", () => {
  for (const phrase of ["Find a mother and baby unit in Birmingham", "mum & baby unit in Birmingham"]) {
    const draft = extractSearch(phrase, { areas: ["Birmingham"], supportTypes: [] });
    assert.deepEqual(draft.type, ["MOTHER_AND_BABY_UNIT"]);
    assert.equal(new URL(buildSearchUrl(draft), "https://roomsnow.co.uk").searchParams.get("type"), "MOTHER_AND_BABY_UNIT");
  }
});
