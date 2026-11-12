import assert from "node:assert/strict";
import test from "node:test";
import { calendarDate, cleanNewsLink, httpsUrl, isNewsCategory, newsBannerCopy, newsParagraphs, newsSlug, readMinutes, ukLongDate, validateNewsPost } from "../src/lib/news";

test("news slugs are tidy and URL-safe", () => {
  assert.equal(newsSlug("Support our Gambia project!"), "support-our-gambia-project");
  assert.equal(newsSlug("  Rooms & référrals: 2026 "), "rooms-and-referrals-2026");
  assert.equal(newsSlug("!!!"), "post");
  assert.ok(newsSlug("a ".repeat(80)).length <= 70);
  assert.ok(!newsSlug("a ".repeat(80)).endsWith("-"));
});

test("news button links must be http(s) or a RoomsNow page", () => {
  assert.equal(cleanNewsLink(""), null);
  assert.equal(cleanNewsLink("/advertise"), "/advertise");
  assert.equal(cleanNewsLink("https://example.org/donate"), "https://example.org/donate");
  assert.equal(cleanNewsLink("javascript:alert(1)"), undefined);
  assert.equal(cleanNewsLink("//evil.example"), undefined);
  assert.equal(cleanNewsLink("not a link"), undefined);
});

test("news body splits into paragraphs on blank lines", () => {
  assert.deepEqual(newsParagraphs("One\nstill one\r\n\r\nTwo\n\n\n  \nThree  "), ["One\nstill one", "Two", "Three"]);
  assert.ok(isNewsCategory("CHARITY"));
  assert.ok(!isNewsCategory("toString"));
});

const base = { title: "Help us in The Gambia", summary: "A farm project that needs your support.", body: "Twenty characters or more of body text." };

test("appeal and source links are strict https", () => {
  assert.equal(httpsUrl("https://example.org/give"), "https://example.org/give");
  assert.equal(httpsUrl("http://example.org"), undefined);
  assert.equal(httpsUrl("https://user:pw@example.org"), undefined);
  assert.equal(httpsUrl("/donate"), undefined);
});

test("calendar dates must be real and display without drift", () => {
  assert.equal(calendarDate("2026-02-30"), undefined);
  assert.equal(calendarDate("2026-11-12"), "2026-11-12");
  assert.equal(ukLongDate("2026-11-12"), "12 November 2026");
});

test("charity drafts can be incomplete, publishing an open appeal cannot", () => {
  const draft = validateNewsPost({ ...base, category: "CHARITY", appealStatus: "OPEN" }, false);
  assert.ok(draft.ok);
  const live = validateNewsPost({ ...base, category: "CHARITY", appealStatus: "OPEN" }, true);
  assert.ok(!live.ok && live.errors.appealOrganiser && live.errors.appealDonateUrl);

  const volunteerOnly = validateNewsPost({ ...base, category: "CHARITY", appealStatus: "OPEN", appealOrganiser: "Ayden", appealRelationship: "Founder of RoomsNow", appealPurpose: "Tools and seeds", appealVolunteerUrl: "https://example.org/volunteer" }, true);
  assert.ok(volunteerOnly.ok);

  const donate = validateNewsPost({ ...base, category: "CHARITY", appealStatus: "OPEN", appealOrganiser: "Ayden", appealRelationship: "Founder", appealPurpose: "Seeds", appealDonateUrl: "https://example.org/give" }, true);
  assert.ok(!donate.ok && donate.errors.appealDonationRecipient && donate.errors.appealGiftAidStatus && donate.errors.appealCharityRegistration);

  const closed = validateNewsPost({ ...base, category: "CHARITY", appealStatus: "CLOSED", appealOrganiser: "Ayden", appealRelationship: "Founder", appealPurpose: "Seeds", linkUrl: "https://old.example/give" }, true);
  assert.ok(closed.ok && closed.data.linkUrl === null);

  const bogus = validateNewsPost({ ...base, category: "CHARITY", appealStatus: "PAUSED" }, false);
  assert.ok(!bogus.ok && bogus.errors.appealStatus);
});

test("fields from another category are cleared, sector posts need a checked source", () => {
  const switched = validateNewsPost({ ...base, category: "ROOMSNOW", appealStatus: "OPEN", appealOrganiser: "x", sectorSourceName: "y" }, true);
  assert.ok(switched.ok && switched.data.appealStatus === null && switched.data.appealOrganiser === null && switched.data.sectorSourceName === null);

  const missing = validateNewsPost({ ...base, category: "SECTOR" }, true);
  assert.ok(!missing.ok && missing.errors.sectorSourceName && missing.errors.sectorSourceUrl && missing.errors.sectorReviewedOn);

  const now = new Date("2026-11-12T10:00:00Z");
  const future = validateNewsPost({ ...base, category: "SECTOR", sectorSourceName: "DLUHC", sectorSourceUrl: "https://www.gov.uk/x", sectorReviewedOn: "2026-11-13" }, true, now);
  assert.ok(!future.ok && future.errors.sectorReviewedOn);
  const good = validateNewsPost({ ...base, category: "SECTOR", sectorSourceName: "DLUHC", sectorSourceUrl: "https://www.gov.uk/x", sectorReviewedOn: "2026-11-12" }, true, now);
  assert.ok(good.ok && good.data.sectorReviewedOn?.toISOString().startsWith("2026-11-12"));
});

test("homepage banner wording follows the category and hides closed appeals", () => {
  assert.equal(newsBannerCopy("CHARITY", "CLOSED"), null);
  assert.deepEqual(newsBannerCopy("CHARITY", "OPEN"), { label: "Open charity appeal", cta: "View appeal" });
  assert.equal(newsBannerCopy("CHARITY", null)?.label, "Charity spotlight");
  assert.equal(newsBannerCopy("SECTOR", null)?.cta, "Read article");
  assert.equal(newsBannerCopy("ROOMSNOW", null)?.label, "RoomsNow update");
});

test("reading time is at least a minute and rounds up", () => {
  assert.equal(readMinutes(""), 1);
  assert.equal(readMinutes("word ".repeat(200)), 1);
  assert.equal(readMinutes("word ".repeat(201)), 2);
});
