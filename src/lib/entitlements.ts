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
