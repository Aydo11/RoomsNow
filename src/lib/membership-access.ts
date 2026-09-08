export const PROVIDER_PLAN_TIERS = ["FREE", "PROFESSIONAL", "BUSINESS"] as const;
export type ProviderPlanTier = (typeof PROVIDER_PLAN_TIERS)[number];

const PROVIDER_PLAN_RANK: Record<ProviderPlanTier, number> = {
  FREE: 0,
  PROFESSIONAL: 1,
  BUSINESS: 2,
};

export function isProviderPlanTier(value: string): value is ProviderPlanTier {
  return PROVIDER_PLAN_TIERS.includes(value as ProviderPlanTier);
}

/** A complimentary grant can increase access, but can never reduce a paid plan. */
export function highestProviderMembership<T extends { tier: string }>(
  paid: T | null,
  grant: T | null,
  free: T | null,
): T | null {
  const validPaid = paid && isProviderPlanTier(paid.tier) ? paid : null;
  const validGrant = grant && isProviderPlanTier(grant.tier) ? grant : null;
  if (!validPaid) return validGrant ?? free;
  if (!validGrant) return validPaid;
  const paidTier = validPaid.tier as ProviderPlanTier;
  const grantTier = validGrant.tier as ProviderPlanTier;
  return PROVIDER_PLAN_RANK[grantTier] >= PROVIDER_PLAN_RANK[paidTier] ? validGrant : validPaid;
}
