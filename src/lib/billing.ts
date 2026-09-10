import "server-only";
import Stripe from "stripe";
import { db } from "./db";
import { SPONSOR_PACKAGES, type SponsorPackage } from "./sponsor-packages";
import {
  BOOST_DURATION_MS,
  BOOST_PACKAGES,
  BOOST_PRIORITY_MS,
  type BoostPack,
} from "./boost-packages";
import { highestProviderMembership, highestReferrerMembership } from "./membership-access";
import type { MembershipTier, SubscriptionStatus } from "@prisma/client";

export type CheckoutRequest = {
  companyId: string;
  tier: MembershipTier;
  successUrl: string;
  cancelUrl: string;
};
export type SponsorCheckoutRequest = {
  companyId: string;
  listingId: string;
  pkg: SponsorPackage;
  successUrl: string;
  cancelUrl: string;
};
export type BoostCheckoutRequest = {
  companyId: string;
  pack: BoostPack;
  successUrl: string;
  cancelUrl: string;
};
export type CheckoutSession = { url: string; externalId: string | null; provider: string };

export type ReferrerCheckoutRequest = {
  userId: string;
  tier: MembershipTier;
  successUrl: string;
  cancelUrl: string;
};

interface BillingDriver {
  readonly name: string;
  startCheckout(req: CheckoutRequest): Promise<CheckoutSession>;
  startSponsorCheckout(req: SponsorCheckoutRequest): Promise<CheckoutSession>;
  startBoostCheckout(req: BoostCheckoutRequest): Promise<CheckoutSession>;
  cancel(companyId: string, atPeriodEnd: boolean): Promise<void>;
  billingPortalUrl(companyId: string, returnUrl: string): Promise<string | null>;
  /** The referrer-plan twin of startCheckout/cancel — a subscription against a
   * User rather than a Company. Mirrors the company path exactly so the mock
   * and Stripe drivers stay symmetrical. */
  startReferrerCheckout(req: ReferrerCheckoutRequest): Promise<CheckoutSession>;
  cancelReferrer(userId: string, atPeriodEnd: boolean): Promise<void>;
  referrerBillingPortalUrl(userId: string, returnUrl: string): Promise<string | null>;
}

const mockDriver: BillingDriver = {
  name: "mock",
  async startCheckout({ companyId, tier, successUrl }) {
    await applySubscriptionChange({ companyId, tier, provider: "mock", status: "ACTIVE" });
    return { url: `${successUrl}?billing=complete`, externalId: null, provider: "mock" };
  },
  async startSponsorCheckout({ companyId, listingId, pkg, successUrl }) {
    await activateSponsorship({ companyId, listingId, pkg, provider: "mock", externalPaymentId: `mock-${Date.now()}` });
    return { url: `${successUrl}?sponsored=complete`, externalId: null, provider: "mock" };
  },
  async startBoostCheckout({ companyId, pack, successUrl }) {
    await grantBoostPack({ companyId, pack, externalPaymentId: `mock-boost-${Date.now()}` });
    return { url: `${successUrl}?boost_pack=complete`, externalId: null, provider: "mock" };
  },
  async cancel(companyId, atPeriodEnd) {
    await db.subscription.update({ where: { companyId }, data: atPeriodEnd ? { cancelAtPeriodEnd: true } : { status: "CANCELLED", cancelAtPeriodEnd: true } });
  },
  async billingPortalUrl() { return null; },
  async startReferrerCheckout({ userId, tier, successUrl }) {
    await applyReferrerSubscriptionChange({ userId, tier, provider: "mock", status: "ACTIVE" });
    return { url: `${successUrl}?billing=complete`, externalId: null, provider: "mock" };
  },
  async cancelReferrer(userId, atPeriodEnd) {
    await db.referrerSubscription.update({ where: { userId }, data: atPeriodEnd ? { cancelAtPeriodEnd: true } : { status: "CANCELLED", cancelAtPeriodEnd: true } });
  },
  async referrerBillingPortalUrl() { return null; },
};

const disabledDriver: BillingDriver = {
  name: "disabled",
  async startCheckout() { throw new Error("Payments are not configured yet."); },
  async startSponsorCheckout() { throw new Error("Payments are not configured yet."); },
  async startBoostCheckout() { throw new Error("Payments are not configured yet."); },
  async cancel() { throw new Error("Payments are not configured yet."); },
  async billingPortalUrl() { return null; },
  async startReferrerCheckout() { throw new Error("Payments are not configured yet."); },
  async cancelReferrer() { throw new Error("Payments are not configured yet."); },
  async referrerBillingPortalUrl() { return null; },
};

let stripeClient: Stripe | null = null;
export function stripe() {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) throw new Error("STRIPE_SECRET_KEY is missing.");
  stripeClient ??= new Stripe(secret);
  return stripeClient;
}

async function stripeCustomer(companyId: string) {
  const subscription = await db.subscription.findUnique({ where: { companyId }, select: { externalCustomerId: true } });
  if (subscription?.externalCustomerId) return subscription.externalCustomerId;
  const company = await db.company.findUniqueOrThrow({ where: { id: companyId }, select: { name: true, email: true } });
  const customer = await stripe().customers.create({ name: company.name, email: company.email, metadata: { companyId } });
  await db.subscription.updateMany({ where: { companyId }, data: { externalCustomerId: customer.id, billingProvider: "stripe" } });
  return customer.id;
}

async function stripeReferrerCustomer(userId: string) {
  const subscription = await db.referrerSubscription.findUnique({ where: { userId }, select: { externalCustomerId: true } });
  if (subscription?.externalCustomerId) return subscription.externalCustomerId;
  const user = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { firstName: true, lastName: true, email: true } });
  const customer = await stripe().customers.create({ name: `${user.firstName} ${user.lastName}`, email: user.email, metadata: { userId } });
  await db.referrerSubscription.updateMany({ where: { userId }, data: { externalCustomerId: customer.id, billingProvider: "stripe" } });
  return customer.id;
}

const stripeDriver: BillingDriver = {
  name: "stripe",
  async startCheckout({ companyId, tier, successUrl, cancelUrl }) {
    const price = priceIdFor(tier);
    if (!price) throw new Error(`A Stripe price has not been configured for ${tier.toLowerCase()}.`);
    const customer = await stripeCustomer(companyId);
    const session = await stripe().checkout.sessions.create({
      mode: "subscription",
      customer,
      line_items: [{ price, quantity: 1 }],
      success_url: `${successUrl}${successUrl.includes("?") ? "&" : "?"}billing=complete&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${cancelUrl}${cancelUrl.includes("?") ? "&" : "?"}billing=cancelled`,
      allow_promotion_codes: true,
      billing_address_collection: "required",
      client_reference_id: companyId,
      metadata: { kind: "membership", companyId, tier },
      subscription_data: { metadata: { kind: "membership", companyId, tier } },
    });
    if (!session.url) throw new Error("Stripe did not return a checkout page.");
    return { url: session.url, externalId: session.id, provider: "stripe" };
  },
  async startSponsorCheckout({ companyId, listingId, pkg, successUrl, cancelUrl }) {
    const plan = SPONSOR_PACKAGES[pkg];
    const customer = await stripeCustomer(companyId);
    const session = await stripe().checkout.sessions.create({
      mode: "payment",
      customer,
      line_items: [{
        quantity: 1,
        price_data: {
          currency: "gbp",
          unit_amount: plan.amount,
          product_data: { name: `Sponsored advert — ${plan.label}`, description: "Labelled priority placement in matching search results." },
        },
      }],
      success_url: `${successUrl}${successUrl.includes("?") ? "&" : "?"}sponsored=complete&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${cancelUrl}${cancelUrl.includes("?") ? "&" : "?"}sponsored=cancelled`,
      client_reference_id: companyId,
      metadata: { kind: "sponsorship", companyId, listingId, package: pkg },
      payment_intent_data: { metadata: { kind: "sponsorship", companyId, listingId, package: pkg } },
    });
    if (!session.url) throw new Error("Stripe did not return a checkout page.");
    return { url: session.url, externalId: session.id, provider: "stripe" };
  },
  async startBoostCheckout({ companyId, pack, successUrl, cancelUrl }) {
    const boostPack = BOOST_PACKAGES[pack];
    const configuredPrice = boostPriceIdFor(pack);
    const customer = await stripeCustomer(companyId);
    const lineItem: Stripe.Checkout.SessionCreateParams.LineItem = configuredPrice
      ? { price: configuredPrice, quantity: 1 }
      : {
          quantity: 1,
          price_data: {
            currency: "gbp",
            unit_amount: boostPack.amount,
            product_data: {
              name: `RoomsNow ${boostPack.label}`,
              description: `${boostPack.credits} credit${boostPack.credits === 1 ? "" : "s"} for 24-hour property boosts. Credits do not expire.`,
            },
          },
        };
    const session = await stripe().checkout.sessions.create({
      mode: "payment",
      customer,
      line_items: [lineItem],
      success_url: `${successUrl}${successUrl.includes("?") ? "&" : "?"}boost_pack=complete&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${cancelUrl}${cancelUrl.includes("?") ? "&" : "?"}boost_pack=cancelled`,
      allow_promotion_codes: true,
      client_reference_id: companyId,
      metadata: { kind: "boost_pack", companyId, pack },
      payment_intent_data: { metadata: { kind: "boost_pack", companyId, pack } },
    });
    if (!session.url) throw new Error("Stripe did not return a checkout page.");
    return { url: session.url, externalId: session.id, provider: "stripe" };
  },
  async cancel(companyId, atPeriodEnd) {
    const subscription = await db.subscription.findUnique({ where: { companyId }, select: { externalSubscriptionId: true } });
    if (!subscription?.externalSubscriptionId) throw new Error("No Stripe subscription was found.");
    if (atPeriodEnd) await stripe().subscriptions.update(subscription.externalSubscriptionId, { cancel_at_period_end: true });
    else await stripe().subscriptions.cancel(subscription.externalSubscriptionId);
    await db.subscription.update({ where: { companyId }, data: { cancelAtPeriodEnd: atPeriodEnd, ...(!atPeriodEnd ? { status: "CANCELLED" as const } : {}) } });
  },
  async billingPortalUrl(companyId, returnUrl) {
    const customer = await stripeCustomer(companyId);
    const session = await stripe().billingPortal.sessions.create({ customer, return_url: returnUrl });
    return session.url;
  },
  async startReferrerCheckout({ userId, tier, successUrl, cancelUrl }) {
    const price = referrerPriceIdFor(tier);
    if (!price) throw new Error(`A Stripe price has not been configured for ${tier.toLowerCase()}.`);
    const customer = await stripeReferrerCustomer(userId);
    const session = await stripe().checkout.sessions.create({
      mode: "subscription",
      customer,
      line_items: [{ price, quantity: 1 }],
      success_url: `${successUrl}${successUrl.includes("?") ? "&" : "?"}billing=complete&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${cancelUrl}${cancelUrl.includes("?") ? "&" : "?"}billing=cancelled`,
      allow_promotion_codes: true,
      client_reference_id: userId,
      metadata: { kind: "referrer_membership", userId, tier },
      subscription_data: { metadata: { kind: "referrer_membership", userId, tier } },
    });
    if (!session.url) throw new Error("Stripe did not return a checkout page.");
    return { url: session.url, externalId: session.id, provider: "stripe" };
  },
  async cancelReferrer(userId, atPeriodEnd) {
    const subscription = await db.referrerSubscription.findUnique({ where: { userId }, select: { externalSubscriptionId: true } });
    if (!subscription?.externalSubscriptionId) throw new Error("No Stripe subscription was found.");
    if (atPeriodEnd) await stripe().subscriptions.update(subscription.externalSubscriptionId, { cancel_at_period_end: true });
    else await stripe().subscriptions.cancel(subscription.externalSubscriptionId);
    await db.referrerSubscription.update({ where: { userId }, data: { cancelAtPeriodEnd: atPeriodEnd, ...(!atPeriodEnd ? { status: "CANCELLED" as const } : {}) } });
  },
  async referrerBillingPortalUrl(userId, returnUrl) {
    const customer = await stripeReferrerCustomer(userId);
    const session = await stripe().billingPortal.sessions.create({ customer, return_url: returnUrl });
    return session.url;
  },
};

const mockAllowed = process.env.NODE_ENV !== "production" || process.env.ALLOW_MOCK_BILLING === "true";
export const billing: BillingDriver = process.env.BILLING_DRIVER === "stripe" ? stripeDriver : mockAllowed ? mockDriver : disabledDriver;
export const billingIsLive = () => process.env.BILLING_DRIVER === "stripe" && Boolean(process.env.STRIPE_SECRET_KEY);
export const billingAvailable = () => billingIsLive() || mockAllowed;

export function priceIdFor(tier: MembershipTier) {
  return { FREE: null, PROFESSIONAL: process.env.STRIPE_PRICE_PROFESSIONAL ?? null, BUSINESS: process.env.STRIPE_PRICE_BUSINESS ?? null, REFERRER_FREE: null, REFERRER_PRO: null }[tier];
}

export function referrerPriceIdFor(tier: MembershipTier) {
  return { REFERRER_FREE: null, REFERRER_PRO: process.env.STRIPE_PRICE_REFERRER_PRO ?? null, FREE: null, PROFESSIONAL: null, BUSINESS: null }[tier];
}

export function boostPriceIdFor(pack: BoostPack) {
  return {
    SINGLE: process.env.STRIPE_PRICE_BOOST_1 ?? null,
    THREE: process.env.STRIPE_PRICE_BOOST_3 ?? null,
    TEN: process.env.STRIPE_PRICE_BOOST_10 ?? null,
  }[pack];
}

/**
 * Older production databases pre-date referrer memberships. `prisma db push`
 * creates the columns and tables, but it deliberately does not create catalogue
 * rows. Create only the missing defaults here so referrer pages self-repair
 * without running the full demo seed or overwriting admin-edited pricing.
 */
export async function ensureReferrerMembershipCatalogue() {
  await db.$transaction([
    db.membership.upsert({
      where: { tier: "REFERRER_FREE" },
      update: {},
      create: {
        tier: "REFERRER_FREE",
        audience: "REFERRER",
        name: "Free",
        priceMonthly: 0,
        maxListings: 0,
        maxRooms: 0,
        maxStaff: 0,
        maxClients: 5,
        maxSharesPerClient: 1,
        description: "Enough for a small caseload — try the whole flow before you commit to anything.",
      },
    }),
    db.membership.upsert({
      where: { tier: "REFERRER_PRO" },
      update: {},
      create: {
        tier: "REFERRER_PRO",
        audience: "REFERRER",
        name: "Pro",
        priceMonthly: 1900,
        priceYearly: 19000,
        maxListings: 0,
        maxRooms: 0,
        maxStaff: 0,
        maxClients: -1,
        maxSharesPerClient: -1,
        priorityRouting: true,
        description: "For referral agencies and professionals managing a full caseload — unlimited clients and provider sharing.",
      },
    }),
  ]);
}

/**
 * Keeps the PROVIDER membership catalogue (Free / Professional / Business)
 * in sync with the limits defined here. Unlike ensureReferrerMembershipCatalogue
 * above, this updates existing rows too — plan limits are a product decision
 * made in code, and a deploy that changes them should take effect everywhere
 * that reads the catalogue (pricing page, enforcement, admin) without a
 * separate manual database step. Pricing (priceMonthly/priceYearly) is left
 * out of `update` so it isn't clobbered if it's ever adjusted by hand.
 */
export async function ensureProviderMembershipCatalogue() {
  const pence = (pounds: number) => Math.round(pounds * 100);
  await db.$transaction([
    db.membership.upsert({
      where: { tier: "FREE" },
      update: { maxListings: 2, maxRooms: 10, maxStaff: 2, maxPhotos: 8, featuredCredits: 0 },
      create: {
        tier: "FREE",
        audience: "PROVIDER",
        name: "Free",
        priceMonthly: 0,
        maxListings: 2,
        maxRooms: 10,
        maxStaff: 2,
        maxPhotos: 8,
        featuredCredits: 0,
        description: "Get started and see whether the site works for you.",
      },
    }),
    db.membership.upsert({
      where: { tier: "PROFESSIONAL" },
      update: {
        maxListings: 15,
        maxRooms: -1,
        maxStaff: 8,
        maxPhotos: 20,
        videoUploads: true,
        analytics: true,
        featuredCredits: 1,
        enhancedProfile: true,
        description:
          "For growing providers managing up to 15 live adverts, with no cap on rooms per property. Includes one free 7-day sponsored placement running at a time.",
      },
      create: {
        tier: "PROFESSIONAL",
        audience: "PROVIDER",
        name: "Professional",
        priceMonthly: pence(49),
        priceYearly: pence(490),
        maxListings: 15,
        maxRooms: -1,
        maxStaff: 8,
        maxPhotos: 20,
        videoUploads: true,
        analytics: true,
        featuredCredits: 1,
        enhancedProfile: true,
        description:
          "For growing providers managing up to 15 live adverts, with no cap on rooms per property. Includes one free 7-day sponsored placement running at a time.",
      },
    }),
    db.membership.upsert({
      where: { tier: "BUSINESS" },
      update: {
        maxListings: 25,
        maxRooms: -1,
        maxStaff: 25,
        maxPhotos: 40,
        videoUploads: true,
        analytics: true,
        priorityPlacement: true,
        featuredCredits: 2,
        enhancedProfile: true,
        prioritySupport: true,
        description:
          "For larger portfolios managing up to 25 live adverts, with no cap on rooms per property, priority placement and support. Includes two free 7-day sponsored placements running at a time.",
      },
      create: {
        tier: "BUSINESS",
        audience: "PROVIDER",
        name: "Business",
        priceMonthly: pence(149),
        priceYearly: pence(1490),
        maxListings: 25,
        maxRooms: -1,
        maxStaff: 25,
        maxPhotos: 40,
        videoUploads: true,
        analytics: true,
        priorityPlacement: true,
        featuredCredits: 2,
        enhancedProfile: true,
        prioritySupport: true,
        description:
          "For larger portfolios managing up to 25 live adverts, with no cap on rooms per property, priority placement and support. Includes two free 7-day sponsored placements running at a time.",
      },
    }),
  ]);
}

export async function applySubscriptionChange(params: {
  companyId: string;
  tier: MembershipTier;
  provider: string;
  status?: SubscriptionStatus;
  externalCustomerId?: string;
  externalSubscriptionId?: string;
  periodStart?: Date;
  periodEnd?: Date;
  cancelAtPeriodEnd?: boolean;
}) {
  const membership = await db.membership.findUnique({ where: { tier: params.tier } });
  if (!membership) throw new Error(`Unknown membership tier ${params.tier}`);
  return db.subscription.upsert({
    where: { companyId: params.companyId },
    create: {
      companyId: params.companyId, membershipId: membership.id, status: params.status ?? "ACTIVE",
      billingProvider: params.provider, externalCustomerId: params.externalCustomerId,
      externalSubscriptionId: params.externalSubscriptionId, currentPeriodEnd: params.periodEnd,
      currentPeriodStart: params.periodStart,
      cancelAtPeriodEnd: params.cancelAtPeriodEnd ?? false,
    },
    update: {
      membershipId: membership.id, status: params.status ?? "ACTIVE", billingProvider: params.provider,
      ...(params.externalCustomerId ? { externalCustomerId: params.externalCustomerId } : {}),
      ...(params.externalSubscriptionId ? { externalSubscriptionId: params.externalSubscriptionId } : {}),
      ...(params.periodStart ? { currentPeriodStart: params.periodStart } : {}),
      ...(params.periodEnd ? { currentPeriodEnd: params.periodEnd } : {}),
      cancelAtPeriodEnd: params.cancelAtPeriodEnd ?? false,
    },
  });
}

/**
 * Returns the current complimentary plan without touching the provider's paid
 * subscription. Expired and revoked grants remain available for audit history
 * but never contribute permissions.
 */
export async function activeProviderMembershipGrant(companyId: string) {
  const now = new Date();
  return db.membershipGrant.findFirst({
    where: {
      companyId,
      startsAt: { lte: now },
      revokedAt: null,
      membership: { audience: "PROVIDER", tier: { in: ["PROFESSIONAL", "BUSINESS"] } },
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    include: { membership: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function activateSponsorship(params: {
  companyId: string;
  listingId: string;
  pkg: SponsorPackage;
  provider: string;
  externalPaymentId?: string;
}) {
  const plan = SPONSOR_PACKAGES[params.pkg];
  const listing = await db.listing.findFirst({ where: { id: params.listingId, companyId: params.companyId, status: "ACTIVE" }, select: { id: true, featuredUntil: true } });
  if (!listing) throw new Error("Only a live advert owned by this provider can be sponsored.");
  const from = listing.featuredUntil && listing.featuredUntil > new Date() ? listing.featuredUntil : new Date();
  await db.$transaction([
    db.listing.update({ where: { id: listing.id }, data: { featured: true, featuredUntil: new Date(from.getTime() + plan.days * 86400000), sponsoredBid: plan.bid } }),
    db.payment.upsert({
      where: { externalPaymentId: params.externalPaymentId ?? `internal-${params.companyId}-${params.listingId}-${Date.now()}` },
      create: { companyId: params.companyId, kind: "FEATURED_LISTING", amount: plan.amount, status: "PAID", description: `Sponsored placement, ${plan.label}`, externalPaymentId: params.externalPaymentId },
      update: { status: "PAID" },
    }),
  ]);
}

/** Adds purchased credits exactly once, even if Stripe retries its webhook. */
export async function grantBoostPack(params: {
  companyId: string;
  pack: BoostPack;
  externalPaymentId: string;
  amountPaid?: number;
}) {
  const boostPack = BOOST_PACKAGES[params.pack];
  return db.$transaction(async (tx) => {
    const existing = await tx.payment.findUnique({ where: { externalPaymentId: params.externalPaymentId } });
    if (existing) return { payment: existing, granted: false };
    const payment = await tx.payment.create({
      data: {
        companyId: params.companyId,
        kind: "BOOST_PACK",
        amount: params.amountPaid ?? boostPack.amount,
        status: "PAID",
        description: `${boostPack.label} pack`,
        externalPaymentId: params.externalPaymentId,
      },
    });
    await tx.company.update({
      where: { id: params.companyId },
      data: { boostCredits: { increment: boostPack.credits } },
    });
    return { payment, granted: true };
  });
}

function includedBoostPeriodStart(subscription: { currentPeriodStart: Date } | null) {
  if (subscription) return subscription.currentPeriodStart;
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/** Current included and purchased balance. Purchased credits never expire. */
export async function boostAllowance(companyId: string) {
  const limits = await planLimits(companyId);
  const periodStart = includedBoostPeriodStart(
    limits.source === "PAID_SUBSCRIPTION" ? limits.subscription : null,
  );
  const [includedUsed, company] = await Promise.all([
    db.payment.count({
      where: {
        companyId,
        kind: "BOOST",
        boostSource: "INCLUDED",
        createdAt: { gte: periodStart },
      },
    }),
    db.company.findUniqueOrThrow({ where: { id: companyId }, select: { boostCredits: true } }),
  ]);
  const includedTotal = limits.membership.includedBoosts;
  return {
    includedTotal,
    includedUsed,
    includedRemaining: Math.max(0, includedTotal - includedUsed),
    purchasedRemaining: company.boostCredits,
    totalRemaining: Math.max(0, includedTotal - includedUsed) + company.boostCredits,
    periodStart,
  };
}

/** Activates one truthful 24-hour boost and records which balance paid for it. */
export async function activateListingBoost(params: {
  companyId: string;
  listingId: string;
  source: "INCLUDED" | "PURCHASED";
  includedTotal: number;
  includedPeriodStart: Date;
}) {
  const now = new Date();
  const listing = await db.listing.findFirst({
    where: { id: params.listingId, companyId: params.companyId, status: "ACTIVE" },
    select: { id: true, boostedUntil: true },
  });
  if (!listing) throw new Error("Only a live advert owned by this provider can be boosted.");
  if (listing.boostedUntil && listing.boostedUntil > now) throw new Error("This advert already has an active boost.");

  await db.$transaction(async (tx) => {
    const claimed = await tx.listing.updateMany({
      where: {
        id: listing.id,
        companyId: params.companyId,
        status: "ACTIVE",
        OR: [{ boostedUntil: null }, { boostedUntil: { lte: now } }],
      },
      data: {
        boostStartsAt: now,
        boostPriorityUntil: new Date(now.getTime() + BOOST_PRIORITY_MS),
        boostedUntil: new Date(now.getTime() + BOOST_DURATION_MS),
      },
    });
    if (claimed.count !== 1) throw new Error("This advert already has an active boost.");

    if (params.source === "INCLUDED") {
      const includedUsed = await tx.payment.count({
        where: {
          companyId: params.companyId,
          kind: "BOOST",
          boostSource: "INCLUDED",
          createdAt: { gte: params.includedPeriodStart },
        },
      });
      if (includedUsed >= params.includedTotal) throw new Error("No membership boosts remain in this billing period.");
    }
    if (params.source === "PURCHASED") {
      const spent = await tx.company.updateMany({
        where: { id: params.companyId, boostCredits: { gt: 0 } },
        data: { boostCredits: { decrement: 1 } },
      });
      if (spent.count !== 1) throw new Error("No purchased boost credits remain.");
    }
    await tx.payment.create({
      data: {
        companyId: params.companyId,
        kind: "BOOST",
        amount: 0,
        status: "PAID",
        description: `${params.source === "INCLUDED" ? "Membership" : "Purchased"} 24-hour boost used`,
        externalPaymentId: `boost-${params.source.toLowerCase()}-${params.companyId}-${listing.id}-${now.getTime()}`,
        boostSource: params.source,
        boostListingId: listing.id,
      },
    });
  }, { isolationLevel: "Serializable" });

  return {
    startsAt: now,
    priorityUntil: new Date(now.getTime() + BOOST_PRIORITY_MS),
    expiresAt: new Date(now.getTime() + BOOST_DURATION_MS),
  };
}

export async function planLimits(companyId: string) {
  await ensureProviderMembershipCatalogue();
  const [subscription, grant, freeMembership] = await Promise.all([
    db.subscription.findUnique({ where: { companyId }, include: { membership: true } }),
    activeProviderMembershipGrant(companyId),
    db.membership.findUnique({ where: { tier: "FREE" } }),
  ]);
  const entitled = subscription && ["ACTIVE", "TRIALING", "PAST_DUE"].includes(subscription.status);
  const paidMembership = entitled ? subscription.membership : null;
  const membership = highestProviderMembership(paidMembership, grant?.membership ?? null, freeMembership);
  if (!membership) throw new Error("Membership catalogue is empty. Run npm run db:seed.");
  const [listings, rooms, staff] = await Promise.all([
    db.listing.count({ where: { companyId, status: { in: ["ACTIVE", "PENDING_REVIEW", "PAUSED"] } } }),
    db.room.count({ where: { property: { companyId } } }),
    db.companyStaff.count({ where: { companyId } }),
  ]);
  const under = (used: number, max: number) => max === -1 || used < max;
  return {
    membership,
    subscription,
    grant,
    source: grant?.membershipId === membership.id ? "ADMIN_GRANT" as const : entitled ? "PAID_SUBSCRIPTION" as const : "FREE" as const,
    used: { listings, rooms, staff },
    canAddListing: under(listings, membership.maxListings),
    canAddRoom: under(rooms, membership.maxRooms),
    canAddStaff: under(staff, membership.maxStaff),
  };
}

export async function applyReferrerSubscriptionChange(params: {
  userId: string;
  tier: MembershipTier;
  provider: string;
  status?: SubscriptionStatus;
  externalCustomerId?: string;
  externalSubscriptionId?: string;
  periodStart?: Date;
  periodEnd?: Date;
  cancelAtPeriodEnd?: boolean;
}) {
  await ensureReferrerMembershipCatalogue();
  const membership = await db.membership.findUnique({ where: { tier: params.tier } });
  if (!membership) throw new Error(`Unknown membership tier ${params.tier}`);
  return db.referrerSubscription.upsert({
    where: { userId: params.userId },
    create: {
      userId: params.userId, membershipId: membership.id, status: params.status ?? "ACTIVE",
      billingProvider: params.provider, externalCustomerId: params.externalCustomerId,
      externalSubscriptionId: params.externalSubscriptionId, currentPeriodEnd: params.periodEnd,
      currentPeriodStart: params.periodStart,
      cancelAtPeriodEnd: params.cancelAtPeriodEnd ?? false,
    },
    update: {
      membershipId: membership.id, status: params.status ?? "ACTIVE", billingProvider: params.provider,
      ...(params.externalCustomerId ? { externalCustomerId: params.externalCustomerId } : {}),
      ...(params.externalSubscriptionId ? { externalSubscriptionId: params.externalSubscriptionId } : {}),
      ...(params.periodStart ? { currentPeriodStart: params.periodStart } : {}),
      ...(params.periodEnd ? { currentPeriodEnd: params.periodEnd } : {}),
      cancelAtPeriodEnd: params.cancelAtPeriodEnd ?? false,
    },
  });
}

export async function activeReferrerMembershipGrant(userId: string) {
  const now = new Date();
  return db.userMembershipGrant.findFirst({
    where: {
      userId,
      startsAt: { lte: now },
      revokedAt: null,
      membership: { audience: "REFERRER", tier: "REFERRER_PRO" },
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    include: { membership: true },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * A referrer's plan gates two things: how many active clients they can hold at
 * once, and (inside shareClientAction) how many providers one client's
 * profile can be shared with simultaneously. Both default to unlimited on the
 * catalogue's REFERRER_FREE row unless you tighten it in the seed.
 */
export async function referrerPlanLimits(userId: string) {
  await ensureReferrerMembershipCatalogue();
  const [subscription, grant, freeMembership] = await Promise.all([
    db.referrerSubscription.findUnique({ where: { userId }, include: { membership: true } }),
    activeReferrerMembershipGrant(userId),
    db.membership.findUnique({ where: { tier: "REFERRER_FREE" } }),
  ]);
  const entitled = subscription && ["ACTIVE", "TRIALING", "PAST_DUE"].includes(subscription.status);
  const membership = highestReferrerMembership(
    entitled ? subscription.membership : null,
    grant?.membership ?? null,
    freeMembership,
  );
  if (!membership) throw new Error("Referrer membership catalogue is empty. Run npm run db:seed.");
  const clients = await db.client.count({ where: { referrerId: userId, status: { not: "ARCHIVED" } } });
  const canAddClient = membership.maxClients === -1 || clients < membership.maxClients;
  return {
    membership,
    subscription,
    grant,
    source: grant?.membershipId === membership.id ? "ADMIN_GRANT" as const : entitled ? "PAID_SUBSCRIPTION" as const : "FREE" as const,
    used: { clients },
    canAddClient,
  };
}
