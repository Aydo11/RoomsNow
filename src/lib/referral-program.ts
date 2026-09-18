import { db } from "@/lib/db";
import { notifyCompany } from "@/lib/notify";
import { audit } from "@/lib/audit";
import { activeProviderMembershipGrant, ensureProviderMembershipCatalogue } from "@/lib/billing";

/**
 * Provider-to-provider "refer & earn" growth programme. A provider shares
 * their invite code; when someone registers a new provider account with it
 * and goes on to post their first advert, that counts as one qualified
 * referral. Every 5 qualified referrals unlocks another free month of
 * Professional plus a handful of boost credits, granted automatically —
 * no admin action required. This is deliberately separate from the
 * case-worker-to-provider Referral model, which is an unrelated concept
 * (a placement referral, not a growth referral).
 */

// No 0/O/1/I/L — easy to read aloud or type from a screenshot.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 7;

export const REFERRALS_PER_REWARD = 5;
export const REWARD_BOOST_CREDITS = 2;
export const REWARD_MONTHS = 1;

function randomCode(): string {
  let out = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return out;
}

/** Every provider company gets one stable invite code, generated lazily on first use. */
export async function ensureReferralCode(companyId: string): Promise<string> {
  const company = await db.company.findUniqueOrThrow({ where: { id: companyId }, select: { referralCode: true } });
  if (company.referralCode) return company.referralCode;

  for (let attempt = 0; attempt < 8; attempt++) {
    const code = randomCode();
    try {
      await db.company.update({ where: { id: companyId }, data: { referralCode: code } });
      return code;
    } catch {
      // Unique constraint clash — vanishingly rare at this alphabet/length. Retry.
    }
  }
  throw new Error("Could not generate a unique referral code. Please try again.");
}

/**
 * Called right after a brand-new provider account registers. If they entered
 * someone else's invite code, links the two companies as SIGNED_UP — it only
 * counts toward a reward once the new company posts its first advert (see
 * qualifyProviderReferral). Never throws: a bad or mistyped code should never
 * block registration.
 */
export async function recordReferralSignup(referredCompanyId: string, rawCode: string | null | undefined) {
  const code = rawCode?.trim().toUpperCase();
  if (!code) return;
  try {
    const referrer = await db.company.findUnique({ where: { referralCode: code }, select: { id: true } });
    if (!referrer || referrer.id === referredCompanyId) return;

    await db.providerReferral.create({
      data: { referrerCompanyId: referrer.id, referredCompanyId },
    });

    await notifyCompany(referrer.id, {
      type: "REFERRAL",
      title: "Someone joined using your invite link",
      body: "You'll be credited once they post their first advert.",
      href: "/provider/invite",
    });
  } catch (error) {
    console.error("[referral-program] could not record referral signup:", error);
  }
}

/**
 * Called when a provider submits their first advert for review. Flips their
 * inbound referral (if any) from SIGNED_UP to QUALIFIED, then checks whether
 * the referring company has just crossed another multiple of
 * REFERRALS_PER_REWARD — if so, grants a reward. Never throws: this runs
 * inline with the referred company's own advert submission and must never
 * block it.
 */
export async function qualifyProviderReferral(referredCompanyId: string) {
  try {
    const referral = await db.providerReferral.findUnique({
      where: { referredCompanyId },
      select: { id: true, referrerCompanyId: true, status: true },
    });
    if (!referral || referral.status !== "SIGNED_UP") return;

    await db.providerReferral.update({
      where: { id: referral.id },
      data: { status: "QUALIFIED", qualifiedAt: new Date() },
    });

    await grantReferralRewardIfEarned(referral.referrerCompanyId);
  } catch (error) {
    console.error("[referral-program] could not qualify referral:", error);
  }
}

async function grantReferralRewardIfEarned(referrerCompanyId: string) {
  const [qualifiedCount, referrerCompany] = await Promise.all([
    db.providerReferral.count({ where: { referrerCompanyId, status: "QUALIFIED" } }),
    db.company.findUniqueOrThrow({ where: { id: referrerCompanyId }, select: { name: true, referralRewardsClaimed: true } }),
  ]);

  const earnedRewards = Math.floor(qualifiedCount / REFERRALS_PER_REWARD);
  if (earnedRewards <= referrerCompany.referralRewardsClaimed) return; // not there yet, or already paid out

  await ensureProviderMembershipCatalogue();
  const membership = await db.membership.findFirst({
    where: { tier: "PROFESSIONAL", audience: "PROVIDER", active: true },
    select: { id: true, name: true },
  });
  if (!membership) return; // catalogue not seeded — never crash the referred provider's own flow over this

  const currentGrant = await activeProviderMembershipGrant(referrerCompanyId);
  const alreadyOnBusiness = currentGrant?.membership.tier === "BUSINESS";

  const now = new Date();
  let expiresAt: Date | null = null;
  if (!alreadyOnBusiness) {
    const base = currentGrant?.expiresAt && currentGrant.expiresAt > now ? currentGrant.expiresAt : now;
    expiresAt = new Date(base);
    expiresAt.setUTCMonth(expiresAt.getUTCMonth() + REWARD_MONTHS);
  }

  let owner = await db.companyStaff.findFirst({ where: { companyId: referrerCompanyId, staffRole: "OWNER" }, select: { userId: true } });
  if (!owner) owner = await db.companyStaff.findFirst({ where: { companyId: referrerCompanyId }, select: { userId: true } });

  await db.$transaction(async (tx) => {
    if (!alreadyOnBusiness && owner) {
      if (currentGrant) {
        await tx.membershipGrant.update({ where: { id: currentGrant.id }, data: { expiresAt } });
      } else {
        await tx.membershipGrant.create({
          data: {
            companyId: referrerCompanyId,
            membershipId: membership.id,
            grantedById: owner.userId,
            reason: `Referral programme reward — ${REFERRALS_PER_REWARD * earnedRewards} qualified sign-ups referred`,
            expiresAt,
          },
        });
      }
    }
    await tx.company.update({
      where: { id: referrerCompanyId },
      data: { boostCredits: { increment: REWARD_BOOST_CREDITS }, referralRewardsClaimed: earnedRewards },
    });
  });

  await notifyCompany(referrerCompanyId, {
    type: "MEMBERSHIP",
    title: "Referral reward unlocked!",
    body: alreadyOnBusiness
      ? `You've referred ${REFERRALS_PER_REWARD * earnedRewards} providers who posted an advert — ${REWARD_BOOST_CREDITS} boosts have been added to your account.`
      : `You've referred ${REFERRALS_PER_REWARD * earnedRewards} providers who posted an advert — enjoy a free month of ${membership.name} and ${REWARD_BOOST_CREDITS} boosts, on us.`,
    href: "/provider/invite",
    email: true,
  });
  await audit({
    action: "referral_program.reward_granted",
    targetType: "Company",
    targetId: referrerCompanyId,
    metadata: { qualifiedCount, rewardNumber: earnedRewards, boosts: REWARD_BOOST_CREDITS, expiresAt: expiresAt?.toISOString() ?? null },
  });
}
