import assert from "node:assert/strict";
import test from "node:test";
import { alertMatchesListing, maskContact, normaliseEmail, normaliseUkMobile } from "../src/lib/room-alert-rules";
import { plainSummaries } from "../src/lib/plain-summary-i18n";
import type { PlainSummaryInput } from "../src/lib/plain-summary";
import { inCouncilArea, parseAreas } from "../src/lib/council-areas";
import { shortlistFacts } from "../src/lib/shortlist-facts";

test("UK mobiles are normalised and other numbers refused", () => {
  assert.equal(normaliseUkMobile("07700 900123"), "+447700900123");
  assert.equal(normaliseUkMobile("+44 7700 900123"), "+447700900123");
  assert.equal(normaliseUkMobile("0121 496 0000"), null);
  assert.equal(normaliseEmail(" Sam@Example.com "), "sam@example.com");
  assert.equal(normaliseEmail("not-an-email"), null);
  assert.equal(maskContact("+447700900123"), "••••••••••123");
});

test("room alerts match by place, postcode prefix and support", () => {
  const listing = { supportTypes: ["mental-health"], property: { city: "Birmingham", area: "Handsworth", postcode: "B21 9ES" } };
  assert.ok(alertMatchesListing({ where: "Birmingham", support: [] }, listing));
  assert.ok(alertMatchesListing({ where: "b21", support: ["mental-health"] }, listing));
  assert.ok(!alertMatchesListing({ where: "Coventry", support: [] }, listing));
  assert.ok(!alertMatchesListing({ where: "", support: ["care-leavers"] }, listing));
});

const input: PlainSummaryInput = {
  accommodationType: "SHARED_ACCOMMODATION",
  area: "Handsworth",
  city: "Birmingham",
  weeklyRentFrom: 15000,
  weeklyRentTo: 15000,
  billsIncluded: true,
  housingBenefit: true,
  supportTypes: ["mental-health", "homelessness"],
  genderArrangement: "FEMALE_ONLY",
  minAge: 18,
  maxAge: 25,
  referralRoutes: ["SELF_REFERRAL"],
  wheelchairAccess: true,
  petsAllowed: true,
  availableRooms: 3,
  availableFrom: null,
};

test("every language says the same number of things as English", () => {
  const all = plainSummaries(input);
  for (const [lang, lines] of Object.entries(all)) {
    assert.equal(lines.length, all.en.length, lang);
    assert.ok(lines.every((line) => line.trim().length > 3), lang);
  }
  assert.ok(all.pl.includes("Teraz wolne są 3 pokoje."));
  assert.ok(all.ar.includes("توجد 3 غرف متاحة الآن."));
  assert.ok(all.ro.includes("Trebuie să aveți între 18 și 25 de ani."));
  assert.ok(all.ur.some((line) => line.includes("£150")));
});

test("council areas: town names and postcode prefixes", () => {
  assert.deepEqual(parseAreas("Birmingham, B, B21 ,Birmingham"), ["Birmingham", "B", "B21"]);
  const handsworth = { city: "Birmingham", area: "Handsworth", postcode: "B21 9ES" };
  const bath = { city: "Bath", area: null, postcode: "BA1 1AA" };
  assert.ok(inCouncilArea(["B"], handsworth));
  assert.ok(!inCouncilArea(["B"], bath));
  assert.ok(inCouncilArea(["B21"], handsworth));
  assert.ok(!inCouncilArea(["B23"], handsworth));
  assert.ok(inCouncilArea(["Handsworth"], handsworth));
  assert.ok(!inCouncilArea([], handsworth));
});

test("shortlist facts read plainly", () => {
  const facts = shortlistFacts(
    {
      accommodationType: "SINGLE_ROOM",
      genderArrangement: "ANY",
      minAge: 18,
      maxAge: null,
      wheelchairAccess: false,
      ensuite: true,
      furnished: true,
      selfContained: false,
      petsAllowed: false,
      housingBenefit: true,
      billsIncluded: false,
      referralRoutes: ["PROFESSIONAL_REFERRAL"],
      weeklyRentFrom: 14000,
      weeklyRentTo: null,
      availableFrom: null,
      supportTypes: ["mental-health"],
      rooms: [{ status: "AVAILABLE", availableFrom: null, weeklyRent: 14000, name: "Room 2" }],
      company: { name: "Example Homes", verification: "APPROVED", responseMinutes: 30, responseSampleSize: 5, accreditations: [{ scheme: "CQC", rating: "Good" }] },
    },
    { name: "Room 2", weeklyRent: 14000 },
  );
  assert.equal(facts.Rent, "£140 per week (Room 2)");
  assert.equal(facts["Room free"], "1 now");
  assert.equal(facts.Ages, "18–any");
  assert.equal(facts.Provider, "Example Homes · Verified · CQC (Good)");
  assert.equal(facts.Replies, "Usually replies within an hour");
});
