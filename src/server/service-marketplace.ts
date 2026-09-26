import "server-only";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser, AuthorisationError } from "@/lib/rbac";
import { hasAdminPermission } from "@/lib/admin-permissions";
import type { CurrentUser } from "@/lib/session";
import { slugify } from "./form";
import {
  creditsPeriodKey,
  isAdvertPublic,
  isVerifiedServiceBusiness,
  marketplaceAccess,
  publicAccreditations,
  SERVICE_PLANS,
  serviceSubscriptionActive,
  summariseServiceReviews,
  insuranceState,
  isPaidProviderCompany,
  type EvidenceLike,
  type MarketplaceViewer,
  type RankableAdvert,
} from "@/lib/service-marketplace";

/** Is this accommodation provider on a paid RoomsNow membership? See isPaidProviderCompany. */
export function providerIsPaid(user: CurrentUser | null) {
  return isPaidProviderCompany(user?.staffOf[0]?.company);
}

export function marketplaceViewer(user: CurrentUser | null): MarketplaceViewer {
  if (!user) return null;
  return { role: user.role, paidProvider: user.role === "PROVIDER" && providerIsPaid(user), isAdmin: hasAdminPermission(user, "MODERATION") };
}

export function viewerAccess(user: CurrentUser | null) {
  return marketplaceAccess(marketplaceViewer(user));
}

/** Throws unless the viewer is a paid accommodation provider (used by every buyer-side action). */
export function assertPaidProvider(user: CurrentUser) {
  if (user.role !== "PROVIDER" || !providerIsPaid(user)) {
    throw new AuthorisationError("Provider Services is included with paid RoomsNow memberships.");
  }
  return user.staffOf[0].companyId;
}

export async function uniqueServiceSlug(name: string, fallbackId: string) {
  const base = slugify(name) || "service";
  if (!(await db.serviceBusiness.findUnique({ where: { slug: base }, select: { id: true } }))) return base;
  return `${base}-${fallbackId.slice(-5)}`;
}

/** The signed-in service business owner and their business. Anyone else is sent away. */
export async function requireServiceBusiness() {
  const user = await requireUser("/service-provider");
  if (user.role !== "SERVICE_PROVIDER") {
    if (user.role === "PROVIDER") redirect("/services");
    throw new AuthorisationError("This area is for service businesses.");
  }
  let business = await db.serviceBusiness.findUnique({ where: { ownerId: user.id }, include: { subscription: true } });
  if (!business) {
    const name = user.organisation || `${user.firstName} ${user.lastName}`;
    business = await db.serviceBusiness.create({
      data: {
        ownerId: user.id,
        name,
        slug: await uniqueServiceSlug(name, user.id),
        contactName: `${user.firstName} ${user.lastName}`,
        email: user.email,
        phone: user.phone,
      },
      include: { subscription: true },
    });
  }
  if (business.subscription) business.subscription = await refreshServiceCredits(business.subscription);
  return { user, business };
}

/** Pro plans get their monthly boost credits the first time they're looked at in a new month. */
export async function refreshServiceCredits<T extends { id: string; tier: "STANDARD" | "PRO"; status: string; trialEndsAt: Date | null; creditsPeriod: string | null; boostCredits: number }>(subscription: T): Promise<T> {
  const period = creditsPeriodKey();
  const perMonth = SERVICE_PLANS[subscription.tier].boostCreditsPerMonth;
  if (!perMonth || subscription.creditsPeriod === period || !serviceSubscriptionActive(subscription)) return subscription;
  const updated = await db.serviceSubscription.updateMany({
    where: { id: subscription.id, OR: [{ creditsPeriod: null }, { creditsPeriod: { not: period } }] },
    data: { boostCredits: perMonth, creditsPeriod: period },
  });
  return updated.count ? { ...subscription, boostCredits: perMonth, creditsPeriod: period } : subscription;
}

const EVIDENCE_SELECT = { type: true, status: true, label: true, issuer: true, expiresAt: true } as const;
const REVIEW_SCORES = { rating: true, quality: true, communication: true, timeliness: true, value: true } as const;

export type MarketAdvert = RankableAdvert & {
  priceTo: number | null;
  priceUnit: string | null;
  image: string | null;
  availability: string | null;
  business: RankableAdvert["business"] & { slug: string; logoUrl: string | null; displayName: string };
};

/**
 * Every advert a paying provider can see. Only called for viewers with full
 * access — preview callers redact the result with previewCard() before it
 * reaches a component.
 */
export async function loadPublicAdverts(now = new Date()): Promise<MarketAdvert[]> {
  const rows = await db.serviceAdvert.findMany({
    where: {
      status: "ACTIVE",
      business: { status: "APPROVED", subscription: { is: { status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] } } } },
    },
    orderBy: { publishedAt: "desc" },
    take: 2000,
    include: {
      boosts: { where: { startsAt: { lte: now }, endsAt: { gt: now } }, select: { endsAt: true }, orderBy: { endsAt: "desc" }, take: 1 },
      business: {
        include: {
          subscription: true,
          evidence: { where: { status: "ACCEPTED" }, select: EVIDENCE_SELECT },
          reviews: { where: { hiddenAt: null }, select: REVIEW_SCORES },
        },
      },
    },
  });

  return rows
    .filter((row) => isAdvertPublic(row, row.business, row.business.subscription, now))
    .map((row) => {
      const summary = summariseServiceReviews(row.business.reviews);
      return {
        id: row.id,
        title: row.title,
        description: row.description,
        category: row.category,
        subcategory: row.subcategory,
        locations: row.locations,
        nationwide: row.nationwide,
        priceType: row.priceType,
        priceFrom: row.priceFrom,
        priceTo: row.priceTo,
        priceUnit: row.priceUnit,
        image: row.images[0] ?? null,
        availability: row.availability,
        emergency: row.emergency,
        sameDay: row.sameDay,
        publishedAt: row.publishedAt,
        boostedUntil: row.boosts[0]?.endsAt ?? null,
        business: {
          id: row.business.id,
          slug: row.business.slug,
          name: row.business.name,
          tradingName: row.business.tradingName,
          displayName: row.business.tradingName || row.business.name,
          logoUrl: row.business.logoUrl,
          areas: row.business.areas,
          postcodes: row.business.postcodes,
          nationalCoverage: row.business.nationalCoverage,
          latitude: row.business.latitude,
          longitude: row.business.longitude,
          radiusMiles: row.business.radiusMiles,
          verified: isVerifiedServiceBusiness(row.business, row.business.evidence as EvidenceLike[], now),
          rating: summary.rating,
          reviewCount: summary.count,
          responseMinutes: row.business.responseMinutes,
          tier: row.business.subscription!.tier,
        },
      };
    });
}

/** Trust facts shown on a profile: all outcomes, nothing from the private evidence files. */
export async function businessTrust(businessId: string, now = new Date()) {
  const [business, evidence, reviews, completedJobs] = await Promise.all([
    db.serviceBusiness.findUniqueOrThrow({ where: { id: businessId }, select: { status: true, createdAt: true, responseMinutes: true, verifiedAt: true } }),
    db.serviceEvidence.findMany({ where: { businessId, status: "ACCEPTED" }, select: EVIDENCE_SELECT }),
    db.serviceReview.findMany({
      where: { businessId, hiddenAt: null },
      orderBy: { createdAt: "desc" },
      select: { id: true, ...REVIEW_SCORES, comment: true, reply: true, replyAt: true, createdAt: true, quote: { select: { service: true } } },
      take: 50,
    }),
    db.serviceQuoteRequest.count({ where: { businessId, status: "COMPLETED" } }),
  ]);
  const typed = evidence as EvidenceLike[];
  return {
    verified: isVerifiedServiceBusiness(business, typed, now),
    insurance: insuranceState(typed, now),
    accreditations: publicAccreditations(typed, now),
    summary: summariseServiceReviews(reviews),
    reviews,
    completedJobs,
    responseMinutes: business.responseMinutes,
    memberSince: business.createdAt,
  };
}

export async function recordServiceEvent(event: { businessId?: string | null; advertId?: string | null; type: string; category?: string | null; location?: string | null }) {
  try {
    await db.serviceEvent.create({
      data: {
        businessId: event.businessId ?? null,
        advertId: event.advertId ?? null,
        type: event.type,
        category: event.category ?? null,
        location: event.location?.trim().slice(0, 80) || null,
      },
    });
  } catch (error) {
    console.error("Service analytics event failed:", error);
  }
}

/** For detail pages: anyone without full access goes back to the (preview) marketplace page. */
export async function requireFullMarketplace(next: string) {
  const user = await requireUser(next);
  if (viewerAccess(user) !== "full") redirect("/services");
  return user;
}
