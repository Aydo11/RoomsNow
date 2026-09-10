import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { activateSponsorship, applyReferrerSubscriptionChange, applySubscriptionChange, grantBoostPack, stripe } from "@/lib/billing";
import { db } from "@/lib/db";
import { notify, notifyCompany } from "@/lib/notify";
import type { MembershipTier, SubscriptionStatus } from "@prisma/client";
import type { SponsorPackage } from "@/lib/sponsor-packages";
import { BOOST_PACKAGES, isBoostPack } from "@/lib/boost-packages";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!webhookSecret || !signature) return NextResponse.json({ error: "Stripe webhook is not configured." }, { status: 503 });

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(await request.text(), signature, webhookSecret);
  } catch (error) {
    console.error("Invalid Stripe webhook:", error);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") await checkoutCompleted(event.data.object);
    else if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
      await subscriptionChanged(event.data.object);
    } else if (event.type === "invoice.payment_failed") {
      const customerId = stringId(event.data.object.customer);
      if (customerId) {
        await db.subscription.updateMany({ where: { externalCustomerId: customerId }, data: { status: "PAST_DUE" } });
        await db.referrerSubscription.updateMany({ where: { externalCustomerId: customerId }, data: { status: "PAST_DUE" } });
      }
    } else if (event.type === "invoice.paid") {
      await invoicePaid(event.data.object);
    }
  } catch (error) {
    console.error(`Stripe webhook ${event.id} failed:`, error);
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function checkoutCompleted(session: Stripe.Checkout.Session) {
  const kind = session.metadata?.kind;
  if (session.payment_status === "unpaid") return;

  if (kind === "referrer_membership") {
    const userId = session.metadata?.userId ?? session.client_reference_id;
    const tier = session.metadata?.tier as MembershipTier | undefined;
    const subscriptionId = stringId(session.subscription);
    if (!userId || tier !== "REFERRER_PRO" || !subscriptionId) return;
    const remote = await stripe().subscriptions.retrieve(subscriptionId);
    await applyReferrerSubscriptionChange({
      userId,
      tier,
      provider: "stripe",
      status: stripeStatus(remote.status),
      externalCustomerId: stringId(session.customer) ?? undefined,
      externalSubscriptionId: remote.id,
      periodStart: periodStart(remote),
      periodEnd: periodEnd(remote),
      cancelAtPeriodEnd: remote.cancel_at_period_end,
    });
    await notify({
      userId,
      type: "MEMBERSHIP",
      title: "Referrer plan upgraded",
      body: `Your ${tier.replace("REFERRER_", "").toLowerCase()} plan is now active.`,
      href: "/referrals/membership",
    });
    await audit({ action: "billing.referrer_membership_activated", targetType: "User", targetId: userId, metadata: { tier, subscriptionId: remote.id } });
    return;
  }

  const companyId = session.metadata?.companyId ?? session.client_reference_id;
  if (!companyId) return;

  if (kind === "membership") {
    const tier = session.metadata?.tier as MembershipTier | undefined;
    const subscriptionId = stringId(session.subscription);
    if (!tier || !["PROFESSIONAL", "BUSINESS"].includes(tier) || !subscriptionId) return;
    const remote = await stripe().subscriptions.retrieve(subscriptionId);
    const existing = await db.subscription.findUnique({ where: { companyId }, select: { externalSubscriptionId: true } });
    await applySubscriptionChange({
      companyId,
      tier,
      provider: "stripe",
      status: stripeStatus(remote.status),
      externalCustomerId: stringId(session.customer) ?? undefined,
      externalSubscriptionId: remote.id,
      periodStart: periodStart(remote),
      periodEnd: periodEnd(remote),
      cancelAtPeriodEnd: remote.cancel_at_period_end,
    });
    if (existing?.externalSubscriptionId && existing.externalSubscriptionId !== remote.id) {
      await stripe().subscriptions.cancel(existing.externalSubscriptionId).catch((error) => console.error("Old subscription cancellation failed:", error));
    }
    await notifyCompany(companyId, { type: "MEMBERSHIP", title: "Membership upgraded", body: `Your ${tier.toLowerCase()} plan is now active.`, href: "/provider/membership" });
    await audit({ action: "billing.membership_activated", targetType: "Company", targetId: companyId, metadata: { tier, subscriptionId: remote.id } });
  }

  if (kind === "sponsorship") {
    const listingId = session.metadata?.listingId;
    const pkg = session.metadata?.package as SponsorPackage | undefined;
    if (!listingId || !pkg || !(["WEEK", "MONTH", "QUARTER"] as string[]).includes(pkg)) return;
    await activateSponsorship({ companyId, listingId, pkg, provider: "stripe", externalPaymentId: `checkout:${session.id}` });
    await notifyCompany(companyId, { type: "LISTING", title: "Sponsored advert is active", body: "Your paid placement is now running.", href: `/provider/adverts/${listingId}` });
    return;
  }

  if (kind === "boost_pack") {
    const pack = session.metadata?.pack;
    if (!isBoostPack(pack)) return;
    const grant = await grantBoostPack({
      companyId,
      pack,
      externalPaymentId: `checkout:${session.id}`,
      amountPaid: session.amount_total ?? undefined,
    });
    if (!grant.granted) return;
    await notifyCompany(companyId, {
      type: "MEMBERSHIP",
      title: "Boost credits added",
      body: `${BOOST_PACKAGES[pack].credits} boost credit${BOOST_PACKAGES[pack].credits === 1 ? "" : "s"} added to your account.`,
      href: "/provider/adverts",
    });
    await audit({
      action: "billing.boost_pack_activated",
      targetType: "Company",
      targetId: companyId,
      metadata: { pack, credits: BOOST_PACKAGES[pack].credits, checkoutSessionId: session.id },
    });
  }
}

async function subscriptionChanged(subscription: Stripe.Subscription) {
  const tier = subscription.metadata.tier as MembershipTier | undefined;
  if (!tier) return;

  if (subscription.metadata.kind === "referrer_membership") {
    const userId = subscription.metadata.userId;
    if (!userId || tier !== "REFERRER_PRO") return;
    const current = await db.referrerSubscription.findUnique({ where: { userId }, select: { externalSubscriptionId: true } });
    if (current?.externalSubscriptionId && current.externalSubscriptionId !== subscription.id) return;
    await applyReferrerSubscriptionChange({
      userId,
      tier,
      provider: "stripe",
      status: stripeStatus(subscription.status),
      externalCustomerId: stringId(subscription.customer) ?? undefined,
      externalSubscriptionId: subscription.id,
      periodStart: periodStart(subscription),
      periodEnd: periodEnd(subscription),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    });
    return;
  }

  const companyId = subscription.metadata.companyId;
  if (!companyId || !["PROFESSIONAL", "BUSINESS"].includes(tier)) return;
  const current = await db.subscription.findUnique({ where: { companyId }, select: { externalSubscriptionId: true } });
  if (current?.externalSubscriptionId && current.externalSubscriptionId !== subscription.id) return;
  await applySubscriptionChange({
    companyId,
    tier,
    provider: "stripe",
    status: stripeStatus(subscription.status),
    externalCustomerId: stringId(subscription.customer) ?? undefined,
    externalSubscriptionId: subscription.id,
    periodStart: periodStart(subscription),
    periodEnd: periodEnd(subscription),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  });
}

async function invoicePaid(invoice: Stripe.Invoice) {
  const customerId = stringId(invoice.customer);
  if (!customerId || !invoice.amount_paid) return;

  const companySub = await db.subscription.findFirst({ where: { externalCustomerId: customerId }, include: { membership: { select: { name: true } } } });
  if (companySub) {
    await db.payment.upsert({
      where: { externalPaymentId: `invoice:${invoice.id}` },
      create: { companyId: companySub.companyId, subscriptionId: companySub.id, kind: "SUBSCRIPTION", amount: invoice.amount_paid, currency: invoice.currency?.toUpperCase() ?? "GBP", status: "PAID", description: `${companySub.membership.name} membership`, externalPaymentId: `invoice:${invoice.id}`, invoiceUrl: invoice.hosted_invoice_url ?? null },
      update: { status: "PAID", invoiceUrl: invoice.hosted_invoice_url ?? null },
    });
    return;
  }

  const referrerSub = await db.referrerSubscription.findFirst({ where: { externalCustomerId: customerId }, include: { membership: { select: { name: true } } } });
  if (referrerSub) {
    await db.referrerPayment.upsert({
      where: { externalPaymentId: `invoice:${invoice.id}` },
      create: { userId: referrerSub.userId, subscriptionId: referrerSub.id, kind: "SUBSCRIPTION", amount: invoice.amount_paid, currency: invoice.currency?.toUpperCase() ?? "GBP", status: "PAID", description: `${referrerSub.membership.name} plan`, externalPaymentId: `invoice:${invoice.id}`, invoiceUrl: invoice.hosted_invoice_url ?? null },
      update: { status: "PAID", invoiceUrl: invoice.hosted_invoice_url ?? null },
    });
  }
}

function stringId(value: string | { id: string } | null): string | null {
  return typeof value === "string" ? value : value?.id ?? null;
}

function periodEnd(subscription: Stripe.Subscription) {
  const seconds = (subscription as unknown as { current_period_end?: number }).current_period_end;
  return seconds ? new Date(seconds * 1000) : undefined;
}

function periodStart(subscription: Stripe.Subscription) {
  const seconds = (subscription as unknown as { current_period_start?: number }).current_period_start;
  return seconds ? new Date(seconds * 1000) : undefined;
}

function stripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  if (status === "active") return "ACTIVE";
  if (status === "trialing") return "TRIALING";
  if (status === "past_due" || status === "unpaid") return "PAST_DUE";
  if (status === "incomplete" || status === "incomplete_expired") return "INCOMPLETE";
  return "CANCELLED";
}
