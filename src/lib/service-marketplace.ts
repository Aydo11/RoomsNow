/**
 * External Services Marketplace — the rules, in one place and free of I/O so
 * they can be unit tested. Pages and actions load rows from the database and
 * ask these functions what the viewer is allowed to see or do. Nothing here
 * trusts the browser: redaction happens before data is handed to a component.
 */

export type ServiceBusinessStatusValue = "ONBOARDING" | "PENDING_REVIEW" | "CHANGES_REQUESTED" | "APPROVED" | "REJECTED" | "SUSPENDED";
export type ServiceAdvertStatusValue = "DRAFT" | "PENDING_REVIEW" | "ACTIVE" | "PAUSED" | "REJECTED" | "ARCHIVED";
export type ServiceQuoteStatusValue = "NEW" | "VIEWED" | "QUOTED" | "ACCEPTED" | "DECLINED" | "COMPLETED" | "CANCELLED";
export type ServicePlanTierValue = "STANDARD" | "PRO";
export type ServicePriceTypeValue = "FIXED" | "FROM" | "RANGE" | "HOURLY" | "QUOTE";
export type ServiceEvidenceTypeValue = "PUBLIC_LIABILITY" | "EMPLOYERS_LIABILITY" | "INCORPORATION" | "QUALIFICATION" | "LICENCE" | "ACCREDITATION" | "OTHER";
export type ServiceUrgencyValue = "FLEXIBLE" | "WITHIN_A_MONTH" | "WITHIN_A_WEEK" | "URGENT" | "EMERGENCY";

// ------------------------------------------------------------------ taxonomy

export const SERVICE_CATEGORIES: Array<{ slug: string; label: string; subcategories: string[] }> = [
  { slug: "cleaning", label: "Cleaning", subcategories: ["End of tenancy", "Regular communal cleaning", "Deep clean", "Hoarding and clearance cleans", "Carpet and upholstery"] },
  { slug: "electrical", label: "Electrical", subcategories: ["EICR testing", "PAT testing", "Emergency lighting", "Fire alarm installation", "General repairs"] },
  { slug: "gas-heating", label: "Gas and heating", subcategories: ["Gas safety certificates", "Boiler servicing", "Boiler installation", "Heating repairs"] },
  { slug: "plumbing", label: "Plumbing", subcategories: ["Leaks and repairs", "Bathroom fitting", "Drainage", "Legionella risk assessment"] },
  { slug: "fire-safety", label: "Fire safety", subcategories: ["Fire risk assessment", "Fire doors", "Extinguishers and servicing", "Alarm maintenance"] },
  { slug: "maintenance", label: "Handyman and maintenance", subcategories: ["General repairs", "Decorating", "Locks and security", "Flooring", "Void turnarounds"] },
  { slug: "pest-control", label: "Pest control", subcategories: ["Bed bugs", "Mice and rats", "Cockroaches", "Proofing"] },
  { slug: "furniture", label: "Furniture and furnishing", subcategories: ["Furniture packs", "White goods", "Beds and mattresses", "Delivery and assembly"] },
  { slug: "waste", label: "Waste and clearance", subcategories: ["House clearance", "Bulky waste", "Garden clearance"] },
  { slug: "security", label: "Security and CCTV", subcategories: ["CCTV installation", "Door entry systems", "Keyholding", "Security staff"] },
  { slug: "compliance", label: "Compliance and certificates", subcategories: ["EPC", "HMO licence support", "Inventory and check-in", "Health and safety audits"] },
  { slug: "support-services", label: "Support and training", subcategories: ["Staff training", "Safeguarding training", "Mental health first aid", "Floating support"] },
  { slug: "professional", label: "Professional services", subcategories: ["Accountancy", "Legal", "Insurance broking", "IT and software", "Marketing"] },
  { slug: "other", label: "Other services", subcategories: [] },
];

export function categoryLabel(slug: string | null | undefined) {
  return SERVICE_CATEGORIES.find((c) => c.slug === slug)?.label ?? (slug ? slug : "Service");
}

export function isServiceCategory(slug: string) {
  return SERVICE_CATEGORIES.some((c) => c.slug === slug);
}

export function isSubcategoryOf(category: string, subcategory: string) {
  const found = SERVICE_CATEGORIES.find((c) => c.slug === category);
  return Boolean(found && (found.subcategories.includes(subcategory) || found.slug === "other"));
}

// ------------------------------------------------------------------ plans

export const SERVICE_TRIAL_DAYS = 14;

export const SERVICE_PLANS: Record<ServicePlanTierValue, {
  tier: ServicePlanTierValue;
  name: string;
  monthly: number;
  maxAdverts: number;
  maxServiceAreas: number;
  boostCreditsPerMonth: number;
  enhancedProfile: boolean;
  advancedAnalytics: boolean;
  leadTracking: boolean;
  enquiryReports: boolean;
  teamAccess: boolean;
  priorityPlacement: boolean;
  features: string[];
}> = {
  STANDARD: {
    tier: "STANDARD",
    name: "Marketplace Standard",
    monthly: 7500,
    maxAdverts: 5,
    maxServiceAreas: 3,
    boostCreditsPerMonth: 0,
    enhancedProfile: false,
    advancedAnalytics: false,
    leadTracking: false,
    enquiryReports: false,
    teamAccess: false,
    priorityPlacement: false,
    features: [
      "1 business profile",
      "Up to 5 live adverts",
      "Messages and quote requests from paying providers",
      "Up to 3 service areas",
      "Basic analytics",
      "Verified badge once our checks are complete",
    ],
  },
  PRO: {
    tier: "PRO",
    name: "Marketplace Pro",
    monthly: 12900,
    maxAdverts: 20,
    maxServiceAreas: 25,
    boostCreditsPerMonth: 3,
    enhancedProfile: true,
    advancedAnalytics: true,
    leadTracking: true,
    enquiryReports: true,
    teamAccess: true,
    priorityPlacement: true,
    features: [
      "Enhanced profile with portfolio",
      "Up to 20 live adverts",
      "Up to 25 service areas",
      "Priority placement (just below boosted adverts)",
      "3 boost credits every month",
      "Lead tracking and downloadable enquiry reports",
      "Advanced analytics",
    ],
  },
};

export function isServicePlanTier(value: unknown): value is ServicePlanTierValue {
  return value === "STANDARD" || value === "PRO";
}

export type ServiceSubscriptionLike = {
  tier: ServicePlanTierValue;
  status: string;
  trialEndsAt: Date | null;
  currentPeriodEnd?: Date | null;
} | null | undefined;

/** A trial only counts until it ends; a cancelled plan never counts. */
export function serviceSubscriptionActive(subscription: ServiceSubscriptionLike, now = new Date()) {
  if (!subscription) return false;
  if (subscription.status === "ACTIVE" || subscription.status === "PAST_DUE") return true;
  if (subscription.status === "TRIALING") return !subscription.trialEndsAt || subscription.trialEndsAt.getTime() > now.getTime();
  return false;
}

export function servicePlanFor(subscription: ServiceSubscriptionLike, now = new Date()) {
  return serviceSubscriptionActive(subscription, now) && subscription ? SERVICE_PLANS[subscription.tier] : null;
}

/** Adverts that count against the plan's limit. Drafts and archived ones don't. */
export const COUNTED_ADVERT_STATUSES: ServiceAdvertStatusValue[] = ["PENDING_REVIEW", "ACTIVE", "PAUSED"];

export function canSubmitAnotherAdvert(subscription: ServiceSubscriptionLike, liveCount: number, now = new Date()) {
  const plan = servicePlanFor(subscription, now);
  if (!plan) return { ok: false as const, reason: "Choose a marketplace plan to publish adverts." };
  if (liveCount >= plan.maxAdverts) {
    return { ok: false as const, reason: `${plan.name} includes ${plan.maxAdverts} live adverts. Pause or archive one, or upgrade.` };
  }
  return { ok: true as const };
}

/** Adverts are only ever shown to providers when every one of these is true. */
export function isAdvertPublic(
  advert: { status: string },
  business: { status: string },
  subscription: ServiceSubscriptionLike,
  now = new Date(),
) {
  return advert.status === "ACTIVE" && business.status === "APPROVED" && serviceSubscriptionActive(subscription, now);
}

// ------------------------------------------------------------------ boosts

export const SERVICE_BOOSTS = {
  WEEK: { key: "WEEK", days: 7, amount: 1900, label: "7-day boost" },
  MONTH: { key: "MONTH", days: 30, amount: 5900, label: "30-day boost" },
  QUARTER: { key: "QUARTER", days: 90, amount: 14900, label: "90-day boost" },
} as const;
export type ServiceBoostKey = keyof typeof SERVICE_BOOSTS;
export function isServiceBoostKey(value: unknown): value is ServiceBoostKey {
  return value === "WEEK" || value === "MONTH" || value === "QUARTER";
}
/** A plan credit buys a 7-day boost. */
export const CREDIT_BOOST_DAYS = 7;
export const MAX_BOOSTED_SLOTS = 3;

/** A new boost on an advert that's already boosted extends it rather than overlapping. */
export function boostWindow(currentEnd: Date | null, days: number, now = new Date()) {
  const startsAt = currentEnd && currentEnd.getTime() > now.getTime() ? currentEnd : now;
  return { startsAt, endsAt: new Date(startsAt.getTime() + days * 24 * 60 * 60 * 1000) };
}

/** Period key used to top up Pro boost credits once a month. */
export function creditsPeriodKey(now = new Date()) {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

// ------------------------------------------------------------------ viewer access

export type MarketplaceViewer = {
  role: string;
  /** True when the accommodation provider is on a paid RoomsNow membership (subscription or paid admin grant). */
  paidProvider: boolean;
  isAdmin: boolean;
} | null;

export type MarketplaceAccess = "full" | "preview" | "none";

type MembershipPrice = { priceMonthly: number; priceYearly: number | null };
/**
 * Is an accommodation provider's company on a paid RoomsNow membership?
 * Mirrors planLimits(): an entitled subscription to a paid tier, or an active
 * admin grant of a paid tier. `grants` must already be narrowed to in-date,
 * unrevoked grants (getCurrentUser does this).
 */
export function isPaidProviderCompany(company: {
  status: string;
  subscription: { status: string; membership: MembershipPrice } | null;
  membershipGrants: Array<{ membership: MembershipPrice }>;
} | null | undefined) {
  if (!company || company.status !== "ACTIVE") return false;
  const paid = (m: MembershipPrice) => m.priceMonthly > 0 || (m.priceYearly ?? 0) > 0;
  if (company.membershipGrants.some((grant) => paid(grant.membership))) return true;
  const subscription = company.subscription;
  return Boolean(subscription && ["ACTIVE", "TRIALING", "PAST_DUE"].includes(subscription.status) && paid(subscription.membership));
}

/**
 * Full access: admins and accommodation providers on a paid membership.
 * Preview: accommodation providers on the free plan — categories and sample
 * info, never who the businesses are or how to reach them.
 * None: everyone else, including other service businesses.
 */
export function marketplaceAccess(viewer: MarketplaceViewer): MarketplaceAccess {
  if (!viewer) return "none";
  if (viewer.isAdmin) return "full";
  if (viewer.role === "PROVIDER") return viewer.paidProvider ? "full" : "preview";
  return "none";
}

export function canContactServiceBusiness(viewer: MarketplaceViewer) {
  // Admins can moderate but don't request quotes on anyone's behalf.
  return Boolean(viewer && viewer.role === "PROVIDER" && viewer.paidProvider);
}

// ------------------------------------------------------------------ evidence and trust

export const EVIDENCE_LABELS: Record<ServiceEvidenceTypeValue, string> = {
  PUBLIC_LIABILITY: "Public liability insurance",
  EMPLOYERS_LIABILITY: "Employer's liability insurance",
  INCORPORATION: "Company incorporation",
  QUALIFICATION: "Industry qualification",
  LICENCE: "Licence or registration",
  ACCREDITATION: "Accreditation or membership",
  OTHER: "Other document",
};

export type EvidenceLike = {
  type: ServiceEvidenceTypeValue;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  label: string;
  issuer: string | null;
  expiresAt: Date | null;
};

const EXPIRING_SOON_DAYS = 30;

export function evidenceCurrent(item: EvidenceLike, now = new Date()) {
  return !item.expiresAt || item.expiresAt.getTime() > now.getTime();
}

export type InsuranceState = "valid" | "expiring" | "expired" | "missing";

/** Based on accepted public liability evidence only. */
export function insuranceState(evidence: EvidenceLike[], now = new Date()): { state: InsuranceState; expiresAt: Date | null } {
  const accepted = evidence
    .filter((item) => item.type === "PUBLIC_LIABILITY" && item.status === "ACCEPTED")
    .sort((a, b) => (b.expiresAt?.getTime() ?? Infinity) - (a.expiresAt?.getTime() ?? Infinity));
  const best = accepted[0];
  if (!best) return { state: "missing", expiresAt: null };
  if (!evidenceCurrent(best, now)) return { state: "expired", expiresAt: best.expiresAt };
  if (best.expiresAt && best.expiresAt.getTime() - now.getTime() < EXPIRING_SOON_DAYS * 24 * 60 * 60 * 1000) {
    return { state: "expiring", expiresAt: best.expiresAt };
  }
  return { state: "valid", expiresAt: best.expiresAt };
}

/** What a business must upload before it can be sent for review. */
export function evidenceChecklist(evidence: EvidenceLike[], now = new Date()) {
  const has = (type: ServiceEvidenceTypeValue) =>
    evidence.some((item) => item.type === type && item.status !== "REJECTED" && evidenceCurrent(item, now));
  return [
    { key: "insurance", label: "Public liability insurance (in date)", done: has("PUBLIC_LIABILITY"), required: true },
    {
      key: "incorporation",
      label: "Proof of incorporation or sole trader registration",
      done: has("INCORPORATION"),
      required: true,
    },
    { key: "qualification", label: "Industry qualifications, licences or accreditations", done: has("QUALIFICATION") || has("LICENCE") || has("ACCREDITATION"), required: false },
  ];
}

export function readyForReview(
  business: { name: string; contactName: string; email: string; categories: string[]; areas: string[]; nationalCoverage: boolean; description: string | null; companyNumber: string | null },
  evidence: EvidenceLike[],
  now = new Date(),
) {
  const missing: string[] = [];
  if (!business.name.trim()) missing.push("business name");
  if (!business.contactName.trim()) missing.push("contact person");
  if (!business.categories.length) missing.push("at least one service category");
  if (!business.areas.length && !business.nationalCoverage) missing.push("the areas you cover");
  if (!business.description || business.description.trim().length < 60) missing.push("a description (60+ characters)");
  for (const item of evidenceChecklist(evidence, now)) if (item.required && !item.done) missing.push(item.label.toLowerCase());
  return { ready: missing.length === 0, missing };
}

/** The Verified badge needs approval and in-date accepted insurance. */
export function isVerifiedServiceBusiness(business: { status: string }, evidence: EvidenceLike[], now = new Date()) {
  if (business.status !== "APPROVED") return false;
  const insurance = insuranceState(evidence, now).state;
  return insurance === "valid" || insurance === "expiring";
}

/**
 * The only evidence details that ever leave the admin area: what it is, who
 * issued it and when it expires. Never the file, policy number or reference.
 */
export function publicAccreditations(evidence: EvidenceLike[], now = new Date()) {
  return evidence
    .filter((item) => item.status === "ACCEPTED" && item.type !== "INCORPORATION" && item.type !== "OTHER" && evidenceCurrent(item, now))
    .map((item) => ({ type: item.type, label: item.label, issuer: item.issuer, expiresAt: item.expiresAt }));
}

// ------------------------------------------------------------------ adverts

export function advertTransitionAllowed(from: ServiceAdvertStatusValue, to: ServiceAdvertStatusValue, actor: "owner" | "admin") {
  if (from === to) return false;
  if (actor === "admin") {
    if (from === "PENDING_REVIEW") return to === "ACTIVE" || to === "REJECTED";
    if (from === "ACTIVE" || from === "PAUSED") return to === "REJECTED";
    return false;
  }
  if (to === "ARCHIVED") return true;
  if (to === "PENDING_REVIEW") return from === "DRAFT" || from === "REJECTED" || from === "ARCHIVED";
  if (from === "ACTIVE") return to === "PAUSED";
  if (from === "PAUSED") return to === "ACTIVE";
  if (from === "PENDING_REVIEW") return to === "DRAFT";
  return false;
}

/**
 * Editing anything a provider reads (text, price, images, areas) on an
 * approved advert sends it back for review, so nothing unchecked goes live.
 */
export function statusAfterEdit(current: ServiceAdvertStatusValue): ServiceAdvertStatusValue {
  if (current === "ACTIVE" || current === "PAUSED" || current === "REJECTED") return "PENDING_REVIEW";
  return current;
}

export function priceLabel(advert: { priceType: ServicePriceTypeValue; priceFrom: number | null; priceTo: number | null; priceUnit?: string | null }) {
  const gbp = (pence: number) => `£${(pence / 100).toLocaleString("en-GB", { minimumFractionDigits: pence % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;
  const unit = advert.priceUnit ? ` ${advert.priceUnit}` : "";
  if (advert.priceType === "QUOTE" || advert.priceFrom === null) return "Request a quote";
  if (advert.priceType === "FIXED") return `${gbp(advert.priceFrom)}${unit}`;
  if (advert.priceType === "HOURLY") return `${gbp(advert.priceFrom)} per hour`;
  if (advert.priceType === "RANGE" && advert.priceTo !== null && advert.priceTo > advert.priceFrom) return `${gbp(advert.priceFrom)}–${gbp(advert.priceTo)}${unit}`;
  return `From ${gbp(advert.priceFrom)}${unit}`;
}

/** Lowest comparable price in pence, for price sorting. Quote-only sorts last. */
export function sortablePrice(advert: { priceType: ServicePriceTypeValue; priceFrom: number | null }) {
  return advert.priceType === "QUOTE" || advert.priceFrom === null ? null : advert.priceFrom;
}

// ------------------------------------------------------------------ search and ranking

export const SERVICE_SORTS = ["recommended", "rating", "price_low", "price_high", "response", "newest"] as const;
export type ServiceSort = (typeof SERVICE_SORTS)[number];
export function isServiceSort(value: unknown): value is ServiceSort {
  return typeof value === "string" && (SERVICE_SORTS as readonly string[]).includes(value);
}

export type ServiceFilters = {
  q?: string;
  category?: string;
  location?: string;
  radius?: number;
  verifiedOnly?: boolean;
  emergency?: boolean;
  minRating?: number;
  maxPrice?: number; // pence
  sort?: ServiceSort;
};

export type RankableAdvert = {
  id: string;
  title: string;
  description: string;
  category: string;
  subcategory: string | null;
  locations: string[];
  nationwide: boolean;
  priceType: ServicePriceTypeValue;
  priceFrom: number | null;
  emergency: boolean;
  sameDay: boolean;
  publishedAt: Date | null;
  business: {
    id: string;
    name: string;
    tradingName: string | null;
    areas: string[];
    postcodes: string[];
    nationalCoverage: boolean;
    latitude: number | null;
    longitude: number | null;
    radiusMiles: number | null;
    verified: boolean;
    rating: number | null;
    reviewCount: number;
    responseMinutes: number | null;
    tier: ServicePlanTierValue;
  };
  boostedUntil: Date | null;
};

const normalise = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");

function outward(postcode: string) {
  const compact = postcode.toUpperCase().replace(/\s+/g, "");
  const match = compact.match(/^([A-Z]{1,2}\d[A-Z\d]?)(\d[A-Z]{2})?$/);
  return match ? match[1] : null;
}

function milesBetween(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude));
  return 3958.8 * 2 * Math.asin(Math.sqrt(h));
}

/**
 * An advert covers a place when it's nationwide, names the place (or its
 * outward postcode), or — when we know where the search is centred — its
 * business's base is within the search radius plus the distance it travels.
 */
export function coversLocation(
  advert: RankableAdvert,
  location: string | undefined,
  point: { latitude: number; longitude: number } | null = null,
  radiusMiles = 0,
) {
  if (!location?.trim()) return true;
  if (advert.nationwide || advert.business.nationalCoverage) return true;
  const wanted = normalise(location);
  const places = [...advert.locations, ...advert.business.areas].map(normalise);
  if (places.some((place) => place === wanted || place.includes(wanted) || wanted.includes(place))) return true;
  const code = outward(location);
  if (code && advert.business.postcodes.some((p) => outward(p) === code || p.toUpperCase().replace(/\s+/g, "") === code)) return true;
  if (point && advert.business.latitude !== null && advert.business.longitude !== null) {
    const reach = (advert.business.radiusMiles ?? 0) + radiusMiles;
    if (reach > 0 && milesBetween(point, { latitude: advert.business.latitude, longitude: advert.business.longitude }) <= reach) return true;
  }
  return false;
}

export function matchesFilters(
  advert: RankableAdvert,
  filters: ServiceFilters,
  point: { latitude: number; longitude: number } | null = null,
) {
  if (filters.category && advert.category !== filters.category) return false;
  if (!coversLocation(advert, filters.location, point, filters.radius ?? 0)) return false;
  if (filters.verifiedOnly && !advert.business.verified) return false;
  if (filters.emergency && !advert.emergency && !advert.sameDay) return false;
  if (filters.minRating && (advert.business.rating ?? 0) < filters.minRating) return false;
  if (filters.maxPrice !== undefined) {
    const price = sortablePrice(advert);
    if (price !== null && price > filters.maxPrice) return false;
  }
  if (filters.q?.trim()) {
    const q = normalise(filters.q);
    const haystack = normalise([advert.title, advert.description, advert.subcategory ?? "", advert.business.name, advert.business.tradingName ?? ""].join(" "));
    if (!q.split(" ").every((word) => haystack.includes(word))) return false;
  }
  return true;
}

/** Deterministic per-day shuffle key so organic order rotates fairly but doesn't jump on every refresh. */
export function rotationKey(id: string, seed: string) {
  let hash = 2166136261;
  for (const char of `${seed}:${id}`) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function isBoosted(advert: { boostedUntil: Date | null }, now = new Date()) {
  return Boolean(advert.boostedUntil && advert.boostedUntil.getTime() > now.getTime());
}

/**
 * Boosts only earn the top slots when the viewer has narrowed to a category
 * or a place, and the advert matches every filter they chose (it already
 * does, having passed matchesFilters). With no filters there's nothing to be
 * relevant to, so everyone rotates fairly.
 */
export function boostPlacementApplies(filters: ServiceFilters) {
  return Boolean(filters.category || filters.location?.trim());
}

export type RankedAdvert<T extends RankableAdvert> = T & { promoted: boolean };

export function rankAdverts<T extends RankableAdvert>(adverts: T[], filters: ServiceFilters, seed: string, now = new Date()): RankedAdvert<T>[] {
  const sort = filters.sort ?? "recommended";
  const rotate = (a: T, b: T) => rotationKey(a.id, seed) - rotationKey(b.id, seed);
  const byRecommended = (a: T, b: T) => {
    const tier = (x: T) => (x.business.tier === "PRO" ? 0 : 1);
    return tier(a) - tier(b) || Number(b.business.verified) - Number(a.business.verified) || rotate(a, b);
  };
  const nullsLast = (a: number | null, b: number | null, dir: 1 | -1) => (a === null ? (b === null ? 0 : 1) : b === null ? -1 : (a - b) * dir);
  const comparators: Record<ServiceSort, (a: T, b: T) => number> = {
    recommended: byRecommended,
    rating: (a, b) => nullsLast(a.business.rating, b.business.rating, -1) || b.business.reviewCount - a.business.reviewCount || rotate(a, b),
    price_low: (a, b) => nullsLast(sortablePrice(a), sortablePrice(b), 1) || rotate(a, b),
    price_high: (a, b) => nullsLast(sortablePrice(a), sortablePrice(b), -1) || rotate(a, b),
    response: (a, b) => nullsLast(a.business.responseMinutes, b.business.responseMinutes, 1) || rotate(a, b),
    newest: (a, b) => (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0),
  };

  const promoted = boostPlacementApplies(filters)
    ? adverts.filter((advert) => isBoosted(advert, now)).sort(rotate).slice(0, MAX_BOOSTED_SLOTS)
    : [];
  const promotedIds = new Set(promoted.map((advert) => advert.id));
  const organic = adverts.filter((advert) => !promotedIds.has(advert.id)).sort(comparators[sort]);
  return [
    ...promoted.map((advert) => ({ ...advert, promoted: true })),
    ...organic.map((advert) => ({ ...advert, promoted: false })),
  ];
}

// ------------------------------------------------------------------ preview redaction

export type ServicePreviewCard = {
  category: string;
  categoryLabel: string;
  subcategory: string | null;
  area: string;
  priceLabel: string;
  emergency: boolean;
  verified: boolean;
  rating: number | null;
  reviewCount: number;
};

/**
 * What a free provider is allowed to see. Built from scratch rather than by
 * deleting fields, so a new column added later can't leak by accident. No
 * id, title, description, business name, images, links or contact details.
 */
export function previewCard(advert: RankableAdvert): ServicePreviewCard {
  const area = advert.nationwide || advert.business.nationalCoverage ? "Nationwide" : advert.locations[0] ?? advert.business.areas[0] ?? "Local";
  return {
    category: advert.category,
    categoryLabel: categoryLabel(advert.category),
    subcategory: advert.subcategory,
    area,
    priceLabel: priceLabel({ priceType: advert.priceType, priceFrom: advert.priceFrom, priceTo: null }),
    emergency: advert.emergency || advert.sameDay,
    verified: advert.business.verified,
    rating: advert.business.rating === null ? null : Math.round(advert.business.rating * 2) / 2,
    reviewCount: advert.business.reviewCount,
  };
}

// ------------------------------------------------------------------ quotes

export const QUOTE_STATUS_LABELS: Record<ServiceQuoteStatusValue, string> = {
  NEW: "New",
  VIEWED: "Viewed",
  QUOTED: "Quote sent",
  ACCEPTED: "Accepted",
  DECLINED: "Declined",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const URGENCY_LABELS: Record<ServiceUrgencyValue, string> = {
  FLEXIBLE: "Flexible",
  WITHIN_A_MONTH: "Within a month",
  WITHIN_A_WEEK: "Within a week",
  URGENT: "Urgent (48 hours)",
  EMERGENCY: "Emergency (today)",
};

export const OPEN_QUOTE_STATUSES: ServiceQuoteStatusValue[] = ["NEW", "VIEWED", "QUOTED", "ACCEPTED"];

/**
 * Who can move a quote request where.
 * The business: views it, sends (or revises) a quote, declines, or marks an accepted job done.
 * The requesting provider: accepts or declines a quote, cancels while open, marks an accepted job done.
 */
export function quoteTransitionAllowed(from: ServiceQuoteStatusValue, to: ServiceQuoteStatusValue, actor: "business" | "requester") {
  if (actor === "business") {
    if (to === "VIEWED") return from === "NEW";
    if (to === "QUOTED") return from === "NEW" || from === "VIEWED" || from === "QUOTED";
    if (to === "DECLINED") return from === "NEW" || from === "VIEWED";
    if (to === "COMPLETED") return from === "ACCEPTED";
    return false;
  }
  if (to === "ACCEPTED" || to === "DECLINED") return from === "QUOTED";
  if (to === "CANCELLED") return OPEN_QUOTE_STATUSES.includes(from);
  if (to === "COMPLETED") return from === "ACCEPTED";
  return false;
}

export function canReviewQuote(
  quote: { status: ServiceQuoteStatusValue; companyId: string; hasReview: boolean },
  viewerCompanyIds: string[],
) {
  return quote.status === "COMPLETED" && !quote.hasReview && viewerCompanyIds.includes(quote.companyId);
}

export type ServiceReviewScores = { rating: number; quality: number; communication: number; timeliness: number; value: number };

export function summariseServiceReviews(reviews: ServiceReviewScores[]) {
  if (!reviews.length) return { count: 0, rating: null, quality: null, communication: null, timeliness: null, value: null };
  const avg = (key: keyof ServiceReviewScores) => Math.round((reviews.reduce((sum, r) => sum + r[key], 0) / reviews.length) * 10) / 10;
  return { count: reviews.length, rating: avg("rating"), quality: avg("quality"), communication: avg("communication"), timeliness: avg("timeliness"), value: avg("value") };
}

export function responseLabel(minutes: number | null) {
  if (minutes === null) return null;
  if (minutes <= 60) return "Usually replies within an hour";
  if (minutes <= 60 * 4) return "Usually replies within a few hours";
  if (minutes <= 60 * 24) return "Usually replies within a day";
  return "Usually replies within a few days";
}

/** Median of first-reply times in minutes, or null with too little history. */
export function medianMinutes(values: number[]) {
  if (values.length < 2) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return Math.round(sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2);
}

export function conversionRate(quotes: number, accepted: number) {
  return quotes > 0 ? Math.round((accepted / quotes) * 100) : 0;
}

export const PAYMENTS_DISCLAIMER =
  "RoomsNow introduces you to service businesses. Contracts, payments and guarantees are agreed directly between your organisation and the business — RoomsNow isn't a party to them and doesn't take payment for jobs.";
