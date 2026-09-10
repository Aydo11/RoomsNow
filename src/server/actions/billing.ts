"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { assertCompanyAccess, requireCompany } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { billing, billingIsLive, planLimits } from "@/lib/billing";
import { notifyCompany } from "@/lib/notify";
import { SPONSOR_PACKAGES, type SponsorPackage } from "@/lib/sponsor-packages";
import type { MembershipTier } from "@prisma/client";

export async function changePlanAction(tier: MembershipTier) {
  const { user, companyId } = await requireCompany();
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";

  if (!(["FREE", "PROFESSIONAL", "BUSINESS"] as string[]).includes(tier)) throw new Error("Unknown membership plan.");
  if (tier === "FREE") {
    await billing.cancel(companyId, true);
    await audit({ actorId: user.id, action: "membership.downgrade_scheduled", targetType: "Company", targetId: companyId });
    revalidatePath("/provider/membership");
    return;
  }

  const session = await billing.startCheckout({
    companyId,
    tier,
    successUrl: `${appUrl}/provider/membership`,
    cancelUrl: `${appUrl}/pricing`,
  });

  await audit({
    actorId: user.id,
    action: "membership.checkout_started",
    targetType: "Company",
    targetId: companyId,
    metadata: { tier, provider: session.provider },
  });
  if (!billingIsLive()) {
    await notifyCompany(companyId, { type: "MEMBERSHIP", title: "Membership updated", body: `Your plan is now ${tier.toLowerCase()}.`, href: "/provider/membership" });
  }

  revalidatePath("/provider/membership");
  redirect(session.url);
}

export async function openBillingPortalAction() {
  const { companyId } = await requireCompany();
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const url = await billing.billingPortalUrl(companyId, `${appUrl}/provider/membership`);
  if (url) redirect(url);
}

export async function cancelMembershipAction(atPeriodEnd = true) {
  const { user, companyId } = await requireCompany();
  await billing.cancel(companyId, atPeriodEnd);
  await audit({ actorId: user.id, action: "membership.cancelled", targetType: "Company", targetId: companyId });
  revalidatePath("/provider/membership");
}

/**
 * Sponsored placement packages. Stripe Checkout is required unless the plan
 * includes a free placement credit — and a credit only ever covers the 7-day
 * (WEEK) package. Choosing MONTH or QUARTER always goes to Stripe, even with
 * credits remaining, and using up the free 7-day slot(s) also sends further
 * WEEK requests to Stripe. The bid decides the order of slots on page one;
 * it has no effect on organic ranking, and sponsored adverts never appear on
 * later pages.
 */
/** Buys a sponsored slot for one advert. Sponsored placement is always labelled. */
export async function featureListingAction(listingId: string, pkg: SponsorPackage = "WEEK") {
  const { user, companyId } = await requireCompany();
  const listing = await db.listing.findUnique({
    where: { id: listingId },
    select: { companyId: true, status: true, title: true, featuredUntil: true },
  });
  if (!listing) return { ok: false, message: "Advert not found." };
  await assertCompanyAccess(user, listing.companyId);

  // Only a live advert can be sponsored — no paying to promote something unapproved.
  if (listing.status !== "ACTIVE") {
    return { ok: false, message: "Only live adverts can be sponsored." };
  }

  const plan = SPONSOR_PACKAGES[pkg];
  const limits = await planLimits(companyId);
  const credits = limits.membership.featuredCredits;
  const used = await db.listing.count({
    where: { companyId, featured: true, OR: [{ featuredUntil: null }, { featuredUntil: { gte: new Date() } }] },
  });
  // A plan's free credits only ever pay for the 7-day package — a longer
  // sponsorship (or a 7-day one beyond the included count) always goes to Stripe.
  const usingCredit = pkg === "WEEK" && used < credits;

  if (!usingCredit) {
    const appUrl = process.env.APP_URL ?? "http://localhost:3000";
    const session = await billing.startSponsorCheckout({
      companyId,
      listingId,
      pkg,
      successUrl: `${appUrl}/provider/adverts/${listingId}`,
      cancelUrl: `${appUrl}/provider/adverts/${listingId}`,
    });
    await audit({ actorId: user.id, action: "listing.sponsorship_checkout_started", targetType: "Listing", targetId: listingId, metadata: { package: pkg, provider: session.provider, amount: plan.amount } });
    redirect(session.url);
  }

  // Extend rather than reset, so buying twice adds time instead of losing it.
  const from =
    listing.featuredUntil && listing.featuredUntil > new Date() ? listing.featuredUntil : new Date();

  await db.listing.update({
    where: { id: listingId },
    data: {
      featured: true,
      featuredUntil: new Date(from.getTime() + plan.days * 24 * 3600 * 1000),
      // A longer package outranks a shorter one in the sponsored slots.
      sponsoredBid: plan.bid,
    },
  });

  await audit({
    actorId: user.id,
    action: "listing.sponsored",
    targetType: "Listing",
    targetId: listingId,
    metadata: { package: pkg, usingCredit, amount: usingCredit ? 0 : plan.amount },
  });
  revalidatePath("/provider/adverts");
  revalidatePath(`/provider/adverts/${listingId}`);

  return { ok: true, message: `Sponsored for ${plan.label}, using one of your included slots.` };
}

/** Stops sponsorship early. Any remaining paid time is not refunded automatically. */
export async function endSponsorshipAction(listingId: string) {
  const { user } = await requireCompany();
  const listing = await db.listing.findUnique({ where: { id: listingId }, select: { companyId: true } });
  if (!listing) return;
  await assertCompanyAccess(user, listing.companyId);

  await db.listing.update({
    where: { id: listingId },
    data: { featured: false, featuredUntil: null, sponsoredBid: 0 },
  });
  await audit({ actorId: user.id, action: "listing.sponsorship_ended", targetType: "Listing", targetId: listingId });
  revalidatePath(`/provider/adverts/${listingId}`);
}

/** Click-through counting for sponsored adverts, called from the advert page. */
export async function recordSponsoredClickAction(listingId: string) {
  await db.listing.updateMany({
    where: { id: listingId, featured: true },
    data: { sponsoredClicks: { increment: 1 } },
  });
}
