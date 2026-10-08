const ENTITLED_STATUSES = new Set(["ACTIVE"]);

type ProviderMapMembership = {
  subscription: { status: string; membership: { priceMonthly: number; priceYearly: number | null } } | null;
  membershipGrants: Array<{
    startsAt: Date;
    expiresAt: Date | null;
    revokedAt: Date | null;
    membership: { priceMonthly: number; priceYearly: number | null };
  }>;
};

/** A subscribing provider makes the map visible to every person viewing its advert. */
export function hasProviderMapAccess(company: ProviderMapMembership) {
  const now = Date.now();
  const activeGrant = company.membershipGrants.some((grant) =>
    grant.startsAt.getTime() <= now &&
    !grant.revokedAt &&
    (!grant.expiresAt || grant.expiresAt.getTime() > now) &&
    (grant.membership.priceMonthly > 0 || (grant.membership.priceYearly ?? 0) > 0),
  );
  if (activeGrant) return true;

  const subscription = company.subscription;
  return Boolean(
    subscription &&
    ENTITLED_STATUSES.has(subscription.status) &&
    (subscription.membership.priceMonthly > 0 || (subscription.membership.priceYearly ?? 0) > 0),
  );
}

type ProviderTierCompany = {
  subscription: { status: string; membership: { tier: string } } | null;
  membershipGrants: Array<{ startsAt: Date; expiresAt: Date | null; revokedAt: Date | null; membership: { tier: string } }>;
};

const PLAN_RANK: Record<string, number> = { FREE: 0, PROFESSIONAL: 1, BUSINESS: 2 };

/** The provider plan a company effectively has right now: the higher of its paid plan and any live admin grant. */
export function effectiveProviderTier(company: ProviderTierCompany): string {
  const now = Date.now();
  const tiers = ["FREE"];
  const subscription = company.subscription;
  if (subscription && ["ACTIVE", "TRIALING", "PAST_DUE"].includes(subscription.status)) tiers.push(subscription.membership.tier);
  for (const grant of company.membershipGrants) {
    if (grant.startsAt.getTime() <= now && !grant.revokedAt && (!grant.expiresAt || grant.expiresAt.getTime() > now)) tiers.push(grant.membership.tier);
  }
  return tiers.reduce((best, tier) => ((PLAN_RANK[tier] ?? -1) > (PLAN_RANK[best] ?? -1) ? tier : best), "FREE");
}
