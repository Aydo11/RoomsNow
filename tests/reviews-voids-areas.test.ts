import assert from "node:assert/strict";
import test from "node:test";
import { containsContactDetails, summariseResidentReviews, yesNo } from "../src/lib/review-rules";
import { emptyFor, pounds, voidCost, weeklyRentFor } from "../src/lib/void-cost";
import { areaStats, areaTitle, inPlace, needFromSlug, placesFrom } from "../src/lib/area-pages";
import { NEXT_STEPS, NEXT_STEP_IDS, stepForStatus } from "../src/lib/next-steps";

test("reviews keep phone numbers and emails out", () => {
  assert.ok(containsContactDetails("call me on 07700 900123"));
  assert.ok(containsContactDetails("ring +44 7700 900123"));
  assert.ok(containsContactDetails("email sam@example.com"));
  assert.ok(!containsContactDetails("Lovely staff, 5 stars, lived here 12 weeks"));
  assert.equal(yesNo("yes"), true);
  assert.equal(yesNo("no"), false);
  assert.equal(yesNo(""), null);
});

test("resident review summary", () => {
  const summary = summariseResidentReviews([
    { rating: 5, feelSafe: true, supportHelpful: true },
    { rating: 4, feelSafe: true, supportHelpful: null },
    { rating: 2, feelSafe: false, supportHelpful: false },
  ]);
  assert.equal(summary.count, 3);
  assert.equal(summary.average, 3.7);
  assert.equal(summary.feelSafePct, 67);
  assert.equal(summary.supportHelpfulPct, 50);
  assert.deepEqual(summariseResidentReviews([]), { count: 0, average: 0, feelSafePct: null, supportHelpfulPct: null });
});

test("void cost adds up lost rent on empty rooms only", () => {
  const now = new Date("2026-10-01T00:00:00Z");
  const weeksAgo = (w: number) => new Date(now.getTime() - w * 7 * 24 * 3600 * 1000);
  const listing = { id: "l1", title: "Grove House", weeklyRentFrom: 15000, weeklyRentTo: null };
  const cost = voidCost(
    [
      { id: "a", name: "Room 1", status: "AVAILABLE", weeklyRent: 20000, monthlyRent: null, vacantSince: weeksAgo(2), updatedAt: now, listing },
      { id: "b", name: "Room 2", status: "VOID", weeklyRent: null, monthlyRent: null, vacantSince: null, updatedAt: weeksAgo(4), listing },
      { id: "c", name: "Room 3", status: "OCCUPIED", weeklyRent: 20000, monthlyRent: null, vacantSince: null, updatedAt: now, listing },
      { id: "d", name: "Room 4", status: "AVAILABLE", weeklyRent: null, monthlyRent: null, vacantSince: weeksAgo(1), updatedAt: now, listing: null },
    ],
    now,
  );
  assert.equal(cost.emptyRooms, 3);
  assert.equal(cost.weeklyCost, 35000);
  assert.equal(cost.lostSoFar, 20000 * 2 + 15000 * 4);
  assert.equal(cost.unpriced, 1);
  assert.equal(cost.rooms[0].id, "b");
  assert.equal(weeklyRentFor({ weeklyRent: null, monthlyRent: 65000, listing: null }), 15000);
  assert.equal(pounds(123456), "£1,235");
  assert.equal(emptyFor(0.5), "3 days");
  assert.equal(emptyFor(1.5), "10 days");
  assert.equal(emptyFor(3), "3 weeks");
  assert.equal(emptyFor(6), "6 weeks");
  assert.equal(emptyFor(20), "4 months");
});

test("area pages: towns win over neighbourhoods and stats add up", () => {
  const places = placesFrom([
    { city: "Birmingham", area: "Handsworth" },
    { city: "Birmingham", area: "Aston" },
    { city: "Walsall", area: "Birmingham" },
  ]);
  assert.deepEqual(places.map((p) => `${p.kind}:${p.slug}`), ["city:birmingham", "city:walsall", "area:handsworth", "area:aston"]);
  const handsworth = places.find((p) => p.slug === "handsworth")!;
  assert.ok(inPlace(handsworth, { city: "Birmingham", area: "Handsworth" }));
  assert.ok(!inPlace(handsworth, { city: "Birmingham", area: "Aston" }));
  assert.equal(areaTitle(handsworth, needFromSlug("mental-health")), "Mental health accommodation in Handsworth");
  assert.equal(needFromSlug("prison-leavers")!.support, "ex-offenders");
  assert.equal(needFromSlug("nonsense"), null);

  const stats = areaStats([
    { weeklyRentFrom: 15000, weeklyRentTo: null, housingBenefit: true, billsIncluded: true, supportTypes: ["mental-health"], referralRoutes: ["SELF_REFERRAL"], companyId: "a", rooms: [{ status: "AVAILABLE" }, { status: "OCCUPIED" }] },
    { weeklyRentFrom: 20000, weeklyRentTo: null, housingBenefit: false, billsIncluded: false, supportTypes: ["mental-health", "homelessness"], referralRoutes: ["PROFESSIONAL_REFERRAL"], companyId: "a", rooms: [{ status: "AVAILABLE" }] },
    { weeklyRentFrom: null, weeklyRentTo: null, housingBenefit: true, billsIncluded: false, supportTypes: [], referralRoutes: [], companyId: "b", rooms: [] },
  ]);
  assert.equal(stats.adverts, 3);
  assert.equal(stats.roomsFree, 2);
  assert.equal(stats.providers, 2);
  assert.equal(stats.lowestRent, 15000);
  assert.equal(stats.typicalRent, 15000);
  assert.equal(stats.housingBenefit, 2);
  assert.equal(stats.selfReferral, 1);
  assert.deepEqual(stats.needs.map((n) => [n.need.slug, n.adverts]), [["mental-health", 2], ["homeless", 1]]);
});

test("what happens next: every language has every step, and statuses map to a step", () => {
  for (const [lang, text] of Object.entries(NEXT_STEPS)) {
    assert.deepEqual(text.steps.map((s) => s.id), NEXT_STEP_IDS, lang);
    text.steps.forEach((step, index) => assert.equal(step.points.length, NEXT_STEPS.en.steps[index].points.length, `${lang} ${step.id}`));
  }
  assert.equal(stepForStatus("SUBMITTED"), "applied");
  assert.equal(stepForStatus("ASSESSMENT"), "viewing");
  assert.equal(stepForStatus("ACCEPTED"), "rent");
  assert.equal(stepForStatus("MOVED_IN"), "first-week");
  assert.equal(stepForStatus("DECLINED"), null);
});
