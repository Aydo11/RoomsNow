import assert from "node:assert/strict";
import test from "node:test";
import {
  advertTransitionAllowed,
  boostWindow,
  canContactServiceBusiness,
  canReviewQuote,
  canSubmitAnotherAdvert,
  coversLocation,
  evidenceChecklist,
  insuranceState,
  isAdvertPublic,
  isVerifiedServiceBusiness,
  marketplaceAccess,
  matchesFilters,
  medianMinutes,
  previewCard,
  priceLabel,
  publicAccreditations,
  quoteTransitionAllowed,
  rankAdverts,
  readyForReview,
  serviceSubscriptionActive,
  statusAfterEdit,
  summariseServiceReviews,
  type EvidenceLike,
  type RankableAdvert,
} from "../src/lib/service-marketplace";

const now = new Date("2026-10-05T12:00:00Z");
const days = (n: number) => new Date(now.getTime() + n * 24 * 60 * 60 * 1000);

function advert(id: string, overrides: Partial<RankableAdvert> = {}, business: Partial<RankableAdvert["business"]> = {}): RankableAdvert {
  return {
    id,
    title: `Advert ${id}`,
    description: "Gas safety certificates for HMOs",
    category: "gas-heating",
    subcategory: "Gas safety certificates",
    locations: ["Birmingham"],
    nationwide: false,
    priceType: "FIXED",
    priceFrom: 6000,
    emergency: false,
    sameDay: false,
    publishedAt: now,
    boostedUntil: null,
    ...overrides,
    business: {
      id: `b-${id}`,
      name: `Business ${id}`,
      tradingName: null,
      areas: [],
      postcodes: [],
      nationalCoverage: false,
      latitude: null,
      longitude: null,
      radiusMiles: null,
      verified: true,
      rating: 4.5,
      reviewCount: 3,
      responseMinutes: 90,
      tier: "STANDARD",
      ...business,
    },
  };
}

test("only paid accommodation providers and admins get full marketplace access", () => {
  assert.equal(marketplaceAccess({ role: "PROVIDER", paidProvider: true, isAdmin: false }), "full");
  assert.equal(marketplaceAccess({ role: "PROVIDER", paidProvider: false, isAdmin: false }), "preview");
  assert.equal(marketplaceAccess({ role: "ADMIN", paidProvider: false, isAdmin: true }), "full");
  assert.equal(marketplaceAccess({ role: "SERVICE_PROVIDER", paidProvider: false, isAdmin: false }), "none");
  assert.equal(marketplaceAccess({ role: "REFERRER", paidProvider: false, isAdmin: false }), "none");
  assert.equal(marketplaceAccess({ role: "USER", paidProvider: true, isAdmin: false }), "none");
  assert.equal(marketplaceAccess(null), "none");
  assert.equal(canContactServiceBusiness({ role: "PROVIDER", paidProvider: false, isAdmin: false }), false);
  assert.equal(canContactServiceBusiness({ role: "PROVIDER", paidProvider: true, isAdmin: false }), true);
  assert.equal(canContactServiceBusiness({ role: "ADMIN", paidProvider: false, isAdmin: true }), false);
});

test("preview cards for free providers carry no identity or contact details", () => {
  const card = previewCard(advert("x", { title: "Smith & Sons — call 07700 900123", description: "email smith@example.com" }, { name: "Smith & Sons Ltd" }));
  const serialised = JSON.stringify(card);
  for (const secret of ["Smith", "07700", "example.com", "Advert x", "b-x", "\"x\""]) assert.ok(!serialised.includes(secret), secret);
  assert.deepEqual(Object.keys(card).sort(), ["area", "category", "categoryLabel", "emergency", "priceLabel", "rating", "reviewCount", "subcategory", "verified"]);
  assert.equal(card.categoryLabel, "Gas and heating");
  assert.equal(card.area, "Birmingham");
});

test("service subscriptions: trials end, cancelled plans stop, limits are enforced", () => {
  assert.equal(serviceSubscriptionActive({ tier: "STANDARD", status: "TRIALING", trialEndsAt: days(3) }, now), true);
  assert.equal(serviceSubscriptionActive({ tier: "STANDARD", status: "TRIALING", trialEndsAt: days(-1) }, now), false);
  assert.equal(serviceSubscriptionActive({ tier: "PRO", status: "ACTIVE", trialEndsAt: null }, now), true);
  assert.equal(serviceSubscriptionActive({ tier: "PRO", status: "PAST_DUE", trialEndsAt: null }, now), true);
  assert.equal(serviceSubscriptionActive({ tier: "PRO", status: "CANCELLED", trialEndsAt: null }, now), false);
  assert.equal(serviceSubscriptionActive(null, now), false);

  const standard = { tier: "STANDARD" as const, status: "ACTIVE", trialEndsAt: null };
  assert.equal(canSubmitAnotherAdvert(standard, 4, now).ok, true);
  assert.equal(canSubmitAnotherAdvert(standard, 5, now).ok, false);
  assert.equal(canSubmitAnotherAdvert({ ...standard, tier: "PRO" }, 19, now).ok, true);
  assert.equal(canSubmitAnotherAdvert({ ...standard, tier: "PRO" }, 20, now).ok, false);
  assert.equal(canSubmitAnotherAdvert(null, 0, now).ok, false);
});

test("an advert is public only when active, approved and paid for", () => {
  const paid = { tier: "STANDARD" as const, status: "ACTIVE", trialEndsAt: null };
  assert.equal(isAdvertPublic({ status: "ACTIVE" }, { status: "APPROVED" }, paid, now), true);
  assert.equal(isAdvertPublic({ status: "ACTIVE" }, { status: "PENDING_REVIEW" }, paid, now), false);
  assert.equal(isAdvertPublic({ status: "ACTIVE" }, { status: "SUSPENDED" }, paid, now), false);
  assert.equal(isAdvertPublic({ status: "PENDING_REVIEW" }, { status: "APPROVED" }, paid, now), false);
  assert.equal(isAdvertPublic({ status: "ACTIVE" }, { status: "APPROVED" }, { ...paid, status: "CANCELLED" }, now), false);
  assert.equal(isAdvertPublic({ status: "ACTIVE" }, { status: "APPROVED" }, { ...paid, status: "TRIALING", trialEndsAt: days(-1) }, now), false);
});

test("advert status changes need review before going live", () => {
  assert.ok(advertTransitionAllowed("DRAFT", "PENDING_REVIEW", "owner"));
  assert.ok(!advertTransitionAllowed("DRAFT", "ACTIVE", "owner"));
  assert.ok(!advertTransitionAllowed("PENDING_REVIEW", "ACTIVE", "owner"));
  assert.ok(!advertTransitionAllowed("REJECTED", "ACTIVE", "owner"));
  assert.ok(advertTransitionAllowed("ACTIVE", "PAUSED", "owner"));
  assert.ok(advertTransitionAllowed("PAUSED", "ACTIVE", "owner"));
  assert.ok(advertTransitionAllowed("ACTIVE", "ARCHIVED", "owner"));
  assert.ok(advertTransitionAllowed("PENDING_REVIEW", "ACTIVE", "admin"));
  assert.ok(advertTransitionAllowed("PENDING_REVIEW", "REJECTED", "admin"));
  assert.ok(!advertTransitionAllowed("DRAFT", "ACTIVE", "admin"));
  assert.equal(statusAfterEdit("ACTIVE"), "PENDING_REVIEW");
  assert.equal(statusAfterEdit("PAUSED"), "PENDING_REVIEW");
  assert.equal(statusAfterEdit("DRAFT"), "DRAFT");
});

test("evidence: insurance state, verified badge and public-safe accreditations", () => {
  const insurance = (status: EvidenceLike["status"], expiresAt: Date | null): EvidenceLike => ({ type: "PUBLIC_LIABILITY", status, label: "Public liability £5m", issuer: "Hiscox", expiresAt });
  assert.equal(insuranceState([], now).state, "missing");
  assert.equal(insuranceState([insurance("PENDING", days(200))], now).state, "missing");
  assert.equal(insuranceState([insurance("ACCEPTED", days(200))], now).state, "valid");
  assert.equal(insuranceState([insurance("ACCEPTED", days(10))], now).state, "expiring");
  assert.equal(insuranceState([insurance("ACCEPTED", days(-1))], now).state, "expired");
  assert.equal(insuranceState([insurance("ACCEPTED", days(-1)), insurance("ACCEPTED", days(300))], now).state, "valid");

  assert.equal(isVerifiedServiceBusiness({ status: "APPROVED" }, [insurance("ACCEPTED", days(200))], now), true);
  assert.equal(isVerifiedServiceBusiness({ status: "APPROVED" }, [insurance("ACCEPTED", days(-5))], now), false);
  assert.equal(isVerifiedServiceBusiness({ status: "PENDING_REVIEW" }, [insurance("ACCEPTED", days(200))], now), false);

  const evidence: EvidenceLike[] = [
    insurance("ACCEPTED", days(200)),
    { type: "INCORPORATION", status: "ACCEPTED", label: "Certificate of incorporation", issuer: "Companies House", expiresAt: null },
    { type: "QUALIFICATION", status: "PENDING", label: "Gas Safe", issuer: "Gas Safe Register", expiresAt: days(100) },
    { type: "LICENCE", status: "ACCEPTED", label: "Waste carrier licence", issuer: "Environment Agency", expiresAt: days(-2) },
  ];
  const shown = publicAccreditations(evidence, now);
  assert.deepEqual(shown.map((item) => item.label), ["Public liability £5m"]);
  assert.deepEqual(Object.keys(shown[0]).sort(), ["expiresAt", "issuer", "label", "type"]);
});

test("a business can't be sent for review without insurance, incorporation and a real profile", () => {
  const business = { name: "Sparks Ltd", contactName: "Ade", email: "a@b.co", categories: ["electrical"], areas: ["Walsall"], nationalCoverage: false, description: "x".repeat(80), companyNumber: "12345678" };
  const missing = readyForReview(business, [], now);
  assert.equal(missing.ready, false);
  assert.equal(missing.missing.length, 2);
  const docs: EvidenceLike[] = [
    { type: "PUBLIC_LIABILITY", status: "PENDING", label: "PL", issuer: null, expiresAt: days(100) },
    { type: "INCORPORATION", status: "PENDING", label: "Inc", issuer: null, expiresAt: null },
  ];
  assert.equal(readyForReview(business, docs, now).ready, true);
  assert.equal(readyForReview({ ...business, areas: [] }, docs, now).ready, false);
  assert.equal(readyForReview({ ...business, areas: [], nationalCoverage: true }, docs, now).ready, true);
  assert.equal(evidenceChecklist([{ ...docs[0], expiresAt: days(-1) }], now)[0].done, false);
});

test("location matching: named places, postcodes, radius and nationwide", () => {
  const local = advert("a", { locations: ["Walsall"] }, { postcodes: ["WS1", "B21"], latitude: 52.586, longitude: -1.982, radiusMiles: 10 });
  assert.ok(coversLocation(local, "walsall"));
  assert.ok(coversLocation(local, "B21 9QX"));
  assert.ok(!coversLocation(local, "Leeds"));
  // Wolverhampton is about 6 miles from Walsall.
  assert.ok(coversLocation(local, "Wolverhampton", { latitude: 52.586, longitude: -2.128 }, 0));
  assert.ok(!coversLocation(local, "Leeds", { latitude: 53.8, longitude: -1.549 }, 5));
  assert.ok(coversLocation(advert("n", { nationwide: true }), "Leeds"));
  assert.ok(coversLocation(local, ""));
});

test("filters: category, verified, emergency, rating, price and keywords", () => {
  const a = advert("a", { emergency: true });
  assert.ok(matchesFilters(a, { category: "gas-heating", location: "Birmingham" }));
  assert.ok(!matchesFilters(a, { category: "plumbing" }));
  assert.ok(!matchesFilters(advert("u", {}, { verified: false }), { verifiedOnly: true }));
  assert.ok(matchesFilters(a, { emergency: true }));
  assert.ok(!matchesFilters(advert("b"), { emergency: true }));
  assert.ok(!matchesFilters(advert("r", {}, { rating: 3.9 }), { minRating: 4 }));
  assert.ok(!matchesFilters(advert("p", { priceFrom: 20000 }), { maxPrice: 10000 }));
  assert.ok(matchesFilters(advert("q", { priceType: "QUOTE", priceFrom: null }), { maxPrice: 10000 }));
  assert.ok(matchesFilters(a, { q: "gas safety" }));
  assert.ok(!matchesFilters(a, { q: "pest" }));
});

test("ranking: boosts go first only when filters are set, then Pro, then fair rotation", () => {
  const boosted = advert("boost", { boostedUntil: days(3) });
  const expired = advert("expired", { boostedUntil: days(-1) });
  const pro = advert("pro", {}, { tier: "PRO" });
  const plain = [advert("s1"), advert("s2"), advert("s3")];
  const all = [...plain, expired, pro, boosted];

  const filtered = rankAdverts(all, { category: "gas-heating" }, "2026-10-05", now);
  assert.equal(filtered[0].id, "boost");
  assert.equal(filtered[0].promoted, true);
  assert.equal(filtered[1].id, "pro");
  assert.equal(filtered.filter((row) => row.promoted).length, 1);

  const unfiltered = rankAdverts(all, {}, "2026-10-05", now);
  assert.equal(unfiltered.some((row) => row.promoted), false);
  assert.equal(unfiltered[0].id, "pro");

  // Same seed, same order; different seed, organic order can change but every advert stays.
  assert.deepEqual(rankAdverts(all, {}, "d1", now).map((r) => r.id), rankAdverts(all, {}, "d1", now).map((r) => r.id));
  assert.equal(new Set(rankAdverts(all, {}, "d2", now).map((r) => r.id)).size, all.length);

  const manyBoosts = Array.from({ length: 6 }, (_, i) => advert(`b${i}`, { boostedUntil: days(2) }));
  assert.equal(rankAdverts(manyBoosts, { location: "Birmingham" }, "x", now).filter((r) => r.promoted).length, 3);

  const byPrice = rankAdverts([advert("c", { priceFrom: 9000 }), advert("q", { priceType: "QUOTE", priceFrom: null }), advert("d", { priceFrom: 3000 })], { sort: "price_low" }, "x", now);
  assert.deepEqual(byPrice.map((r) => r.id), ["d", "c", "q"]);
});

test("boosts extend rather than overlap", () => {
  const fresh = boostWindow(null, 7, now);
  assert.equal(fresh.startsAt.getTime(), now.getTime());
  assert.equal(fresh.endsAt.getTime(), days(7).getTime());
  const extended = boostWindow(days(3), 30, now);
  assert.equal(extended.startsAt.getTime(), days(3).getTime());
  assert.equal(extended.endsAt.getTime(), days(33).getTime());
});

test("quote workflow permissions", () => {
  assert.ok(quoteTransitionAllowed("NEW", "VIEWED", "business"));
  assert.ok(quoteTransitionAllowed("VIEWED", "QUOTED", "business"));
  assert.ok(quoteTransitionAllowed("QUOTED", "QUOTED", "business"));
  assert.ok(quoteTransitionAllowed("NEW", "DECLINED", "business"));
  assert.ok(!quoteTransitionAllowed("QUOTED", "ACCEPTED", "business"));
  assert.ok(!quoteTransitionAllowed("NEW", "CANCELLED", "business"));
  assert.ok(quoteTransitionAllowed("QUOTED", "ACCEPTED", "requester"));
  assert.ok(!quoteTransitionAllowed("NEW", "ACCEPTED", "requester"));
  assert.ok(quoteTransitionAllowed("ACCEPTED", "COMPLETED", "requester"));
  assert.ok(quoteTransitionAllowed("ACCEPTED", "COMPLETED", "business"));
  assert.ok(!quoteTransitionAllowed("QUOTED", "COMPLETED", "requester"));
  assert.ok(quoteTransitionAllowed("NEW", "CANCELLED", "requester"));
  assert.ok(!quoteTransitionAllowed("COMPLETED", "CANCELLED", "requester"));
});

test("reviews only after a completed job, once, by the requesting organisation", () => {
  assert.ok(canReviewQuote({ status: "COMPLETED", companyId: "c1", hasReview: false }, ["c1"]));
  assert.ok(!canReviewQuote({ status: "ACCEPTED", companyId: "c1", hasReview: false }, ["c1"]));
  assert.ok(!canReviewQuote({ status: "COMPLETED", companyId: "c1", hasReview: true }, ["c1"]));
  assert.ok(!canReviewQuote({ status: "COMPLETED", companyId: "c1", hasReview: false }, ["c2"]));
  const summary = summariseServiceReviews([
    { rating: 5, quality: 5, communication: 4, timeliness: 5, value: 4 },
    { rating: 4, quality: 4, communication: 4, timeliness: 3, value: 4 },
  ]);
  assert.equal(summary.count, 2);
  assert.equal(summary.rating, 4.5);
  assert.equal(summary.timeliness, 4);
  assert.equal(summariseServiceReviews([]).rating, null);
});

test("price labels and response medians", () => {
  assert.equal(priceLabel({ priceType: "QUOTE", priceFrom: null, priceTo: null }), "Request a quote");
  assert.equal(priceLabel({ priceType: "FIXED", priceFrom: 6500, priceTo: null, priceUnit: "per certificate" }), "£65 per certificate");
  assert.equal(priceLabel({ priceType: "RANGE", priceFrom: 10000, priceTo: 25000, priceUnit: null }), "£100–£250");
  assert.equal(priceLabel({ priceType: "FROM", priceFrom: 4950, priceTo: null }), "From £49.50");
  assert.equal(priceLabel({ priceType: "HOURLY", priceFrom: 3500, priceTo: null }), "£35 per hour");
  assert.equal(medianMinutes([30]), null);
  assert.equal(medianMinutes([30, 90, 10]), 30);
  assert.equal(medianMinutes([10, 20, 30, 40]), 25);
});
