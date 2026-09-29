import test from "node:test";
import assert from "node:assert/strict";
import {
  advertFactsSchema,
  advertHtmlToPlainText,
  factsForPrompt,
  outwardPostcode,
  parseAdvertCopy,
  plainTextToAdvertHtml,
  templateAdvert,
} from "../src/lib/advert-writer";
import { sanitiseHtml } from "../src/lib/sanitise";

const facts = advertFactsSchema.parse({
  propertyName: "Bramble House",
  city: "Birmingham",
  area: "Handsworth",
  postcode: "B21 9ES",
  accommodationType: "SHARED_ACCOMMODATION",
  bedrooms: 5,
  roomCount: 2,
  weeklyRentFrom: 150,
  weeklyRentTo: 165,
  genderArrangement: "MALE_ONLY",
  minAge: 18,
  features: ["ensuite", "housingBenefit", "billsIncluded"],
  supportTypes: ["mental-health"],
  supportAvailability: "weekdays 9–5",
  referralRoutes: ["PROFESSIONAL_REFERRAL"],
  notes: "Big garden, newly decorated",
});

test("advert writer: template uses only the facts given and never the full postcode", () => {
  const copy = templateAdvert(facts);
  assert.match(copy.title, /Handsworth, Birmingham/);
  assert.match(copy.title, /en-suite/);
  assert.ok(copy.title.length <= 90);
  assert.match(copy.summary, /£150–£165 per week/);
  assert.match(copy.description, /Big garden, newly decorated\./);
  assert.match(copy.description, /- En-suite rooms/);
  assert.ok(!copy.description.includes("9ES"));
  assert.equal(outwardPostcode("b21 9es"), "B21");
  assert.ok(factsForPrompt(facts).includes("Postcode district: B21"));
  assert.ok(!factsForPrompt(facts).includes("9ES"));
});

test("advert writer: works with almost nothing filled in", () => {
  const copy = templateAdvert(advertFactsSchema.parse({}));
  assert.ok(copy.title.length >= 6);
  assert.ok(copy.description.length > 20);
});

test("advert writer: reads the model's JSON even with extra text around it", () => {
  const copy = parseAdvertCopy('Here you go:\n{"title":"Rooms in Handsworth","summary":"Two rooms.","description":"A calm shared house.\\n\\n\\n\\nGet in touch through RoomsNow."}');
  assert.ok(copy);
  assert.equal(copy.title, "Rooms in Handsworth");
  assert.equal(copy.description, "A calm shared house.\n\nGet in touch through RoomsNow.");
  assert.equal(parseAdvertCopy("no json here"), null);
});

test("advert writer: plain-text descriptions keep paragraphs and bullets, and round-trip for editing", () => {
  const text = "A calm shared house.\n\nWhat's included:\n- En-suite rooms\n- Bills included\n\nSay hello <3";
  const html = sanitiseHtml(plainTextToAdvertHtml(text));
  assert.equal(html, "<p>A calm shared house.</p><p>What's included:</p><ul><li>En-suite rooms</li><li>Bills included</li></ul><p>Say hello &lt;3</p>");
  // Editing shows readable text, and saving it again gives the same HTML.
  const editable = advertHtmlToPlainText(html);
  assert.ok(!editable.includes("<p>"));
  assert.equal(sanitiseHtml(plainTextToAdvertHtml(editable)), html);
  // Existing rich HTML is left untouched either way.
  assert.equal(plainTextToAdvertHtml("<p>Hi <strong>there</strong></p>"), "<p>Hi <strong>there</strong></p>");
  assert.equal(advertHtmlToPlainText("<h3>Rooms</h3><p>x</p>"), "<h3>Rooms</h3><p>x</p>");
});
