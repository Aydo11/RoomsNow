import "server-only";
import { db } from "./db";
import { audit } from "./audit";
import { billingAvailable, billingIsLive, stripe } from "./billing";
import { SPOTLIGHT_PACKAGES, type SpotlightPackage, type SpotlightText } from "./spotlight";

export type SpotlightOrg = { orgType: "SERVICE"; orgId: string; orgName: string; href: string; logoUrl: string | null };

const DAY = 24 * 60 * 60 * 1000;

/** The service business a signed-in user can buy a spotlight for, if any. Spotlights are for services only. */
export async function organisationFor(userId: string): Promise<SpotlightOrg | null> {
  const business = await db.serviceBusiness.findUnique({ where: { ownerId: userId }, select: { id: true } });
  return business ? orgSnapshot("SERVICE", business.id) : null;
}

/** Name, public link and logo, only for approved service businesses. */
export async function orgSnapshot(orgType: string, orgId: string): Promise<SpotlightOrg | null> {
  if (orgType === "SERVICE") {
    const business = await db.serviceBusiness.findFirst({ where: { id: orgId, status: "APPROVED" }, select: { id: true, name: true, tradingName: true, slug: true, logoUrl: true } });
    return business ? { orgType, orgId: business.id, orgName: business.tradingName || business.name, href: `/services/business/${business.slug}`, logoUrl: business.logoUrl } : null;
  }
  return null;
}

/**
 * Puts a spotlight live. A second purchase by the same organisation queues
 * after the time it already has, so buying twice adds time rather than
 * overlapping. Idempotent on the payment id (Stripe may resend webhooks).
 */
export async function activateSpotlight(params: {
  org: SpotlightOrg;
  text: SpotlightText;
  days: number;
  amount: number;
  externalPaymentId: string | null;
  actorId?: string | null;
}) {
  if (params.externalPaymentId && (await db.homepageSpotlight.findUnique({ where: { externalPaymentId: params.externalPaymentId }, select: { id: true } }))) return null;
  const now = new Date();
  const latest = await db.homepageSpotlight.findFirst({
    where: { orgType: params.org.orgType, orgId: params.org.orgId, status: "ACTIVE", endsAt: { gt: now } },
    orderBy: { endsAt: "desc" },
    select: { endsAt: true },
  });
  const startsAt = latest?.endsAt ?? now;
  const spotlight = await db.homepageSpotlight.create({
    data: {
      ...params.org,
      ...params.text,
      startsAt,
      endsAt: new Date(startsAt.getTime() + params.days * DAY),
      amount: params.amount,
      externalPaymentId: params.externalPaymentId,
      createdById: params.actorId ?? null,
    },
  });
  await audit({ actorId: params.actorId ?? null, action: "spotlight.activated", targetType: "HomepageSpotlight", targetId: spotlight.id, metadata: { org: params.org.orgName, days: params.days, amount: params.amount } });
  return spotlight;
}

/** Stripe Checkout for a spotlight, or immediate activation when payments are mocked. Returns where to send the buyer. */
export async function startSpotlightCheckout(params: { org: SpotlightOrg; text: SpotlightText; pkg: SpotlightPackage; userId: string; email: string; successUrl: string; cancelUrl: string }) {
  const pack = SPOTLIGHT_PACKAGES[params.pkg];
  if (billingIsLive()) {
    const metadata = { kind: "homepage_spotlight", orgType: params.org.orgType, orgId: params.org.orgId, pkg: params.pkg, headline: params.text.headline, body: params.text.body, userId: params.userId };
    const session = await stripe().checkout.sessions.create({
      mode: "payment",
      customer_email: params.email,
      line_items: [{ quantity: 1, price_data: { currency: "gbp", unit_amount: pack.amount, product_data: { name: `RoomsNow homepage spotlight — ${pack.label}`, description: "Labelled sponsored spotlight directly under the RoomsNow homepage search." } } }],
      success_url: `${params.successUrl}?spotlight=complete`,
      cancel_url: `${params.cancelUrl}?spotlight=cancelled`,
      client_reference_id: params.org.orgId,
      metadata,
      payment_intent_data: { metadata },
    });
    if (!session.url) throw new Error("Stripe did not return a checkout page.");
    return session.url;
  }
  if (!billingAvailable()) throw new Error("Payments are not configured yet.");
  await activateSpotlight({ org: params.org, text: params.text, days: pack.days, amount: pack.amount, externalPaymentId: `mock-spotlight-${Date.now()}`, actorId: params.userId });
  return `${params.successUrl}?spotlight=complete`;
}

/** Spotlights showing on the homepage right now, oldest first so earlier buyers lead. */
export function liveSpotlights(now = new Date()) {
  return db.homepageSpotlight.findMany({
    where: { status: "ACTIVE", startsAt: { lte: now }, endsAt: { gt: now } },
    orderBy: { startsAt: "asc" },
    select: { id: true, orgName: true, href: true, logoUrl: true, headline: true, body: true },
    take: 12,
  });
}
