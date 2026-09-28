import "server-only";
import { db } from "./db";
import { billingAvailable, billingIsLive, stripe } from "./billing";
import { audit } from "./audit";
import {
  boostWindow,
  CREDIT_BOOST_DAYS,
  creditsPeriodKey,
  SERVICE_BOOSTS,
  SERVICE_PLANS,
  SERVICE_TRIAL_DAYS,
  type PaidServicePlanTierValue,
  type ServiceBoostKey,
} from "./service-marketplace";
import type { SubscriptionStatus } from "@prisma/client";
import { cataloguePriceId, type CataloguePlan } from "./stripe-catalogue";
import { BOOST_PACKAGES, type BoostPack } from "./boost-packages";
import { SPONSOR_PACKAGES, type SponsorPackage } from "./sponsor-packages";

/**
 * Billing for service businesses. Kept apart from the accommodation membership
 * driver so the two products can't be confused: a service plan is a Stripe
 * subscription with metadata.kind = "service_plan", a boost is a one-off
 * payment with metadata.kind = "service_boost". Outside production (or with
 * ALLOW_MOCK_BILLING) checkout completes immediately, like the other drivers.
 */

const withParam = (url: string, param: string) => `${url}${url.includes("?") ? "&" : "?"}${param}`;

async function serviceCustomer(businessId: string) {
  const existing = await db.serviceSubscription.findUnique({ where: { businessId }, select: { externalCustomerId: true } });
  if (existing?.externalCustomerId) return existing.externalCustomerId;
  const business = await db.serviceBusiness.findUniqueOrThrow({ where: { id: businessId }, select: { name: true, email: true } });
  const customer = await stripe().customers.create({ name: business.name, email: business.email, metadata: { serviceBusinessId: businessId } });
  await db.serviceSubscription.updateMany({ where: { businessId }, data: { externalCustomerId: customer.id, billingProvider: "stripe" } });
  return customer.id;
}

/** One free trial per business, ever. */
export async function trialAvailable(businessId: string) {
  const row = await db.serviceSubscription.findUnique({ where: { businessId }, select: { tier: true, status: true, externalSubscriptionId: true, trialEndsAt: true } });
  // An abandoned first checkout leaves an INCOMPLETE placeholder; that doesn't use the trial up.
  return !row || (!row.externalSubscriptionId && !row.trialEndsAt && (row.tier === "FREE" || row.status === "INCOMPLETE"));
}

export async function applyServicePlan(params: {
  businessId: string;
  tier: PaidServicePlanTierValue;
  status: SubscriptionStatus;
  provider: string;
  trialEndsAt?: Date | null;
  periodEnd?: Date | null;
  cancelAtPeriodEnd?: boolean;
  externalCustomerId?: string;
  externalSubscriptionId?: string;
}) {
  const perMonth = SERVICE_PLANS[params.tier].boostCreditsPerMonth;
  const period = creditsPeriodKey();
  const existing = await db.serviceSubscription.findUnique({ where: { businessId: params.businessId } });
  const topUp = perMonth > 0 && (!existing || existing.creditsPeriod !== period || existing.tier !== params.tier);
  const data = {
    tier: params.tier,
    status: params.status,
    billingProvider: params.provider,
    ...(params.trialEndsAt !== undefined ? { trialEndsAt: params.trialEndsAt } : {}),
    ...(params.periodEnd !== undefined ? { currentPeriodEnd: params.periodEnd } : {}),
    cancelAtPeriodEnd: params.cancelAtPeriodEnd ?? false,
    ...(params.externalCustomerId ? { externalCustomerId: params.externalCustomerId } : {}),
    ...(params.externalSubscriptionId ? { externalSubscriptionId: params.externalSubscriptionId } : {}),
    ...(topUp ? { boostCredits: perMonth, creditsPeriod: period } : {}),
  };
  return db.serviceSubscription.upsert({
    where: { businessId: params.businessId },
    create: { businessId: params.businessId, ...data },
    update: data,
  });
}

/** The Stripe catalogue entry for a trades and suppliers (Provider Services) plan. */
export function servicePlanCatalogue(tier: PaidServicePlanTierValue): CataloguePlan {
  const plan = SERVICE_PLANS[tier];
  return {
    key: `services_${tier.toLowerCase()}`,
    name: `RoomsNow ${plan.name}`,
    description: "Provider Services membership for trades and suppliers, billed monthly.",
    unitAmount: plan.monthly,
  };
}

export async function startServicePlanCheckout(params: { businessId: string; tier: PaidServicePlanTierValue; successUrl: string; cancelUrl: string }) {
  const plan = SERVICE_PLANS[params.tier];
  const trial = await trialAvailable(params.businessId);

  if (billingIsLive()) {
    if (!(await db.serviceSubscription.findUnique({ where: { businessId: params.businessId }, select: { id: true } }))) {
      // A placeholder row so the Stripe customer id has somewhere to live. It
      // grants nothing: INCOMPLETE is not an entitled status.
      await db.serviceSubscription.create({ data: { businessId: params.businessId, tier: params.tier, status: "INCOMPLETE" } });
    }
    const customer = await serviceCustomer(params.businessId);
    const metadata = { kind: "service_plan", businessId: params.businessId, tier: params.tier };
    const session = await stripe().checkout.sessions.create({
      mode: "subscription",
      customer,
      line_items: [{ quantity: 1, price: await cataloguePriceId(stripe(), servicePlanCatalogue(params.tier)) }],
      success_url: withParam(params.successUrl, "plan=complete&session_id={CHECKOUT_SESSION_ID}"),
      cancel_url: withParam(params.cancelUrl, "plan=cancelled"),
      allow_promotion_codes: true,
      billing_address_collection: "required",
      client_reference_id: params.businessId,
      metadata,
      subscription_data: { metadata, ...(trial ? { trial_period_days: SERVICE_TRIAL_DAYS } : {}) },
    });
    if (!session.url) throw new Error("Stripe did not return a checkout page.");
    return session.url;
  }

  if (!billingAvailable()) throw new Error("Payments are not configured yet.");
  await applyServicePlan({
    businessId: params.businessId,
    tier: params.tier,
    provider: "mock",
    status: trial ? "TRIALING" : "ACTIVE",
    trialEndsAt: trial ? new Date(Date.now() + SERVICE_TRIAL_DAYS * 24 * 60 * 60 * 1000) : null,
    periodEnd: new Date(Date.now() + (trial ? SERVICE_TRIAL_DAYS : 30) * 24 * 60 * 60 * 1000),
  });
  await audit({ action: "service_billing.plan_started", targetType: "ServiceBusiness", targetId: params.businessId, metadata: { tier: params.tier, provider: "mock", trial } });
  return withParam(params.successUrl, "plan=complete");
}

export async function cancelServicePlan(businessId: string) {
  const subscription = await db.serviceSubscription.findUnique({ where: { businessId } });
  if (!subscription) return;
  if (subscription.externalSubscriptionId && billingIsLive()) {
    await stripe().subscriptions.update(subscription.externalSubscriptionId, { cancel_at_period_end: true });
    await db.serviceSubscription.update({ where: { businessId }, data: { cancelAtPeriodEnd: true } });
    return;
  }
  // Mock: a trial stops straight away, a paid month runs to its end.
  if (subscription.status === "TRIALING") {
    await activateFreeServicePlan(businessId);
    return;
  }
  await db.serviceSubscription.update({
    where: { businessId },
    data: { cancelAtPeriodEnd: true },
  });
}

export async function servicePortalUrl(businessId: string, returnUrl: string) {
  if (!billingIsLive()) return null;
  const subscription = await db.serviceSubscription.findUnique({ where: { businessId }, select: { externalCustomerId: true } });
  if (!subscription?.externalCustomerId) return null;
  const session = await stripe().billingPortal.sessions.create({ customer: subscription.externalCustomerId, return_url: returnUrl });
  return session.url;
}

/** Idempotent on externalPaymentId, so a replayed webhook can't double a boost. */
export async function activateServiceBoost(params: { businessId: string; advertId: string; days: number; amount: number; source: string; externalPaymentId?: string }) {
  if (params.externalPaymentId && (await db.serviceBoost.findUnique({ where: { externalPaymentId: params.externalPaymentId }, select: { id: true } }))) {
    return null;
  }
  const advert = await db.serviceAdvert.findFirst({ where: { id: params.advertId, businessId: params.businessId }, select: { id: true } });
  if (!advert) throw new Error("Advert not found.");
  const latest = await db.serviceBoost.findFirst({ where: { advertId: params.advertId }, orderBy: { endsAt: "desc" }, select: { endsAt: true } });
  const window = boostWindow(latest?.endsAt ?? null, params.days);
  const boost = await db.serviceBoost.create({
    data: {
      advertId: params.advertId,
      businessId: params.businessId,
      days: params.days,
      amount: params.amount,
      source: params.source,
      externalPaymentId: params.externalPaymentId ?? null,
      startsAt: window.startsAt,
      endsAt: window.endsAt,
    },
  });
  await audit({ action: "service_billing.boost_activated", targetType: "ServiceAdvert", targetId: params.advertId, metadata: { days: params.days, amount: params.amount, source: params.source } });
  return boost;
}

export async function startServiceBoostCheckout(params: { businessId: string; advertId: string; pack: ServiceBoostKey; successUrl: string; cancelUrl: string }) {
  const pack = SERVICE_BOOSTS[params.pack];
  if (billingIsLive()) {
    const customer = await serviceCustomer(params.businessId);
    const metadata = { kind: "service_boost", businessId: params.businessId, advertId: params.advertId, pack: params.pack };
    const session = await stripe().checkout.sessions.create({
      mode: "payment",
      customer,
      line_items: [{
        quantity: 1,
        price_data: {
          currency: "gbp",
          unit_amount: pack.amount,
          product_data: { name: `RoomsNow services ${pack.label}`, description: "Labelled placement above matching results in Provider Services." },
        },
      }],
      success_url: withParam(params.successUrl, "boost=complete&session_id={CHECKOUT_SESSION_ID}"),
      cancel_url: withParam(params.cancelUrl, "boost=cancelled"),
      client_reference_id: params.businessId,
      metadata,
      payment_intent_data: { metadata },
    });
    if (!session.url) throw new Error("Stripe did not return a checkout page.");
    return session.url;
  }
  if (!billingAvailable()) throw new Error("Payments are not configured yet.");
  await activateServiceBoost({ businessId: params.businessId, advertId: params.advertId, days: pack.days, amount: pack.amount, source: "PURCHASE", externalPaymentId: `mock-service-boost-${Date.now()}` });
  return withParam(params.successUrl, "boost=complete");
}

/** Free is a permanent entitlement, not a Stripe trial or subscription. */
export async function activateFreeServicePlan(businessId: string) {
  return db.serviceSubscription.upsert({
    where: { businessId },
    create: { businessId, tier: "FREE", status: "ACTIVE", billingProvider: "free" },
    update: {
      tier: "FREE",
      status: "ACTIVE",
      billingProvider: "free",
      trialEndsAt: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      externalCustomerId: null,
      externalSubscriptionId: null,
      boostCredits: 0,
      creditsPeriod: null,
    },
  });
}

/** Add prepaid 24-hour boost credits. Idempotent for webhook replays. */
export async function grantServiceBoostPack(params: { businessId: string; pack: BoostPack; amount: number; externalPaymentId: string }) {
  const pack = BOOST_PACKAGES[params.pack];
  if (await db.servicePromotionPurchase.findUnique({ where: { externalPaymentId: params.externalPaymentId }, select: { id: true } })) return null;
  return db.$transaction(async (tx) => {
    const purchase = await tx.servicePromotionPurchase.create({
      data: { businessId: params.businessId, kind: "BOOST_PACK", pack: params.pack, credits: pack.credits, amount: params.amount, externalPaymentId: params.externalPaymentId },
    });
    await tx.serviceSubscription.update({ where: { businessId: params.businessId }, data: { boostCredits: { increment: pack.credits } } });
    return purchase;
  });
}

export async function startServiceBoostPackCheckout(params: { businessId: string; pack: BoostPack; successUrl: string; cancelUrl: string }) {
  const pack = BOOST_PACKAGES[params.pack];
  if (billingIsLive()) {
    const customer = await serviceCustomer(params.businessId);
    const metadata = { kind: "service_boost_pack", businessId: params.businessId, pack: params.pack };
    const session = await stripe().checkout.sessions.create({
      mode: "payment", customer,
      line_items: [{ quantity: 1, price_data: { currency: "gbp", unit_amount: pack.amount, product_data: { name: `RoomsNow ${pack.label}`, description: "Prepaid 24-hour advert boost credits for Provider Services." } } }],
      success_url: withParam(params.successUrl, "boost_pack=complete&session_id={CHECKOUT_SESSION_ID}"),
      cancel_url: withParam(params.cancelUrl, "boost_pack=cancelled"),
      client_reference_id: params.businessId, metadata, payment_intent_data: { metadata },
    });
    if (!session.url) throw new Error("Stripe did not return a checkout page.");
    return session.url;
  }
  if (!billingAvailable()) throw new Error("Payments are not configured yet.");
  await grantServiceBoostPack({ businessId: params.businessId, pack: params.pack, amount: pack.amount, externalPaymentId: `mock-service-boost-pack-${Date.now()}` });
  return withParam(params.successUrl, "boost_pack=complete");
}

/** Apply a labelled sponsored placement to a supplier advert. */
export async function activateServiceSponsorship(params: { businessId: string; advertId: string; pack: SponsorPackage; amount: number; externalPaymentId: string }) {
  const pack = SPONSOR_PACKAGES[params.pack];
  if (await db.servicePromotionPurchase.findUnique({ where: { externalPaymentId: params.externalPaymentId }, select: { id: true } })) return null;
  const advert = await db.serviceAdvert.findFirst({ where: { id: params.advertId, businessId: params.businessId }, select: { sponsoredUntil: true, sponsoredBid: true } });
  if (!advert) throw new Error("Advert not found.");
  const now = new Date();
  const startsAt = advert.sponsoredUntil && advert.sponsoredUntil > now ? advert.sponsoredUntil : now;
  const sponsoredUntil = new Date(startsAt.getTime() + pack.days * 24 * 60 * 60 * 1000);
  return db.$transaction(async (tx) => {
    const purchase = await tx.servicePromotionPurchase.create({ data: { businessId: params.businessId, advertId: params.advertId, kind: "SPONSORED", pack: params.pack, days: pack.days, amount: params.amount, externalPaymentId: params.externalPaymentId } });
    await tx.serviceAdvert.update({ where: { id: params.advertId }, data: { sponsoredUntil, sponsoredBid: Math.max(advert.sponsoredBid, pack.bid) } });
    return purchase;
  });
}

export async function startServiceSponsorCheckout(params: { businessId: string; advertId: string; pack: SponsorPackage; successUrl: string; cancelUrl: string }) {
  const pack = SPONSOR_PACKAGES[params.pack];
  if (billingIsLive()) {
    const customer = await serviceCustomer(params.businessId);
    const metadata = { kind: "service_sponsorship", businessId: params.businessId, advertId: params.advertId, pack: params.pack };
    const session = await stripe().checkout.sessions.create({
      mode: "payment", customer,
      line_items: [{ quantity: 1, price_data: { currency: "gbp", unit_amount: pack.amount, product_data: { name: `RoomsNow sponsored supplier advert — ${pack.label}`, description: "Clearly labelled sponsored placement in matching Provider Services results." } } }],
      success_url: withParam(params.successUrl, "sponsored=complete&session_id={CHECKOUT_SESSION_ID}"),
      cancel_url: withParam(params.cancelUrl, "sponsored=cancelled"),
      client_reference_id: params.businessId, metadata, payment_intent_data: { metadata },
    });
    if (!session.url) throw new Error("Stripe did not return a checkout page.");
    return session.url;
  }
  if (!billingAvailable()) throw new Error("Payments are not configured yet.");
  await activateServiceSponsorship({ businessId: params.businessId, advertId: params.advertId, pack: params.pack, amount: pack.amount, externalPaymentId: `mock-service-sponsor-${Date.now()}` });
  return withParam(params.successUrl, "sponsored=complete");
}

/** Spend one included credit on a 24-hour boost. The credit is taken atomically first. */
export async function spendServiceBoostCredit(businessId: string, advertId: string) {
  const taken = await db.serviceSubscription.updateMany({ where: { businessId, boostCredits: { gt: 0 } }, data: { boostCredits: { decrement: 1 } } });
  if (!taken.count) return false;
  try {
    await activateServiceBoost({ businessId, advertId, days: CREDIT_BOOST_DAYS, amount: 0, source: "CREDIT" });
  } catch (error) {
    await db.serviceSubscription.updateMany({ where: { businessId }, data: { boostCredits: { increment: 1 } } });
    throw error;
  }
  return true;
}
