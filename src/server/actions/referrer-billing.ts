"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { billing, billingIsLive } from "@/lib/billing";
import { requireReferrer } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notify";
import type { MembershipTier } from "@prisma/client";
import { teamFor } from "@/lib/referral-team";

const REFERRER_TIERS: MembershipTier[] = ["REFERRER_FREE", "REFERRER_PRO"];

export async function changeReferrerPlanAction(tier: MembershipTier) {
  const user = await requireReferrer();
  await assertPlanOwner(user.id);
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";

  if (!REFERRER_TIERS.includes(tier)) throw new Error("Unknown referrer plan.");

  if (tier === "REFERRER_FREE") {
    await billing.cancelReferrer(user.id, true);
    await audit({ actorId: user.id, action: "referrer_membership.downgrade_scheduled", targetType: "User", targetId: user.id });
    revalidatePath("/referrals/membership");
    return;
  }

  const session = await billing.startReferrerCheckout({
    userId: user.id,
    tier,
    successUrl: `${appUrl}/referrals/membership`,
    cancelUrl: `${appUrl}/pricing`,
  });

  await audit({
    actorId: user.id,
    action: "referrer_membership.changed",
    targetType: "User",
    targetId: user.id,
    metadata: { tier, provider: session.provider },
  });
  if (!billingIsLive()) {
    await notify({
      userId: user.id,
      type: "MEMBERSHIP",
      title: "Referrer plan updated",
      body: `Your plan is now ${tier.replace("REFERRER_", "").toLowerCase()}.`,
      href: "/referrals/membership",
    });
  }

  revalidatePath("/referrals/membership");
  redirect(session.url);
}

export async function cancelReferrerMembershipAction(atPeriodEnd = true) {
  const user = await requireReferrer();
  await assertPlanOwner(user.id);
  await billing.cancelReferrer(user.id, atPeriodEnd);
  await audit({ actorId: user.id, action: "referrer_membership.cancelled", targetType: "User", targetId: user.id });
  revalidatePath("/referrals/membership");
}

export async function openReferrerBillingPortalAction() {
  const user = await requireReferrer();
  await assertPlanOwner(user.id);
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const url = await billing.referrerBillingPortalUrl(user.id, `${appUrl}/referrals/membership`);
  if (url) redirect(url);
}

/** In an organisation only the owner manages the shared plan. */
async function assertPlanOwner(userId: string) {
  const team = await teamFor(userId);
  if (team.organisation && team.ownerId !== userId) {
    throw new Error("Your organisation's owner manages the plan for the whole team.");
  }
}
