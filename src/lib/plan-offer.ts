/**
 * Crossed-out "was" prices shown next to the real plan price during the
 * limited-time offer. Display only: checkout always charges priceMonthly.
 * shortcut: no end date in code — remove these entries when the offer ends.
 */
export const PLAN_WAS_PRICE: Record<string, number> = {
  PROFESSIONAL: 10000,
  BUSINESS: 19999,
};

/** The was-price for a plan, only when it's genuinely higher than what's charged. */
export function planWasPrice(tier: string, priceMonthly: number) {
  const was = PLAN_WAS_PRICE[tier];
  return was && was > priceMonthly ? was : null;
}
