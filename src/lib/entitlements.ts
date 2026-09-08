import type { CurrentUser } from "./session";

const ENTITLED_STATUSES = new Set(["ACTIVE"]);

/** Paid provider or referrer membership; admins retain access for moderation. */
export function hasPaidMapAccess(user: CurrentUser | null) {
  if (!user) return false;
  if (user.role === "ADMIN") return true;

  const providerAccess = user.staffOf.some(({ company }) => {
    const subscription = company.subscription;
    if (!subscription || !ENTITLED_STATUSES.has(subscription.status)) return false;
    return subscription.membership.priceMonthly > 0 || (subscription.membership.priceYearly ?? 0) > 0;
  });
  if (providerAccess) return true;

  const referrer = user.referrerSubscription;
  return Boolean(
    referrer &&
      ENTITLED_STATUSES.has(referrer.status) &&
      (referrer.membership.priceMonthly > 0 || (referrer.membership.priceYearly ?? 0) > 0),
  );
}
