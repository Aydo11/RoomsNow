/**
 * Sponsored-placement options shared by the provider UI and its server action.
 * Amounts are in pence and are charged through Stripe Checkout.
 */
export const SPONSOR_PACKAGES = {
  WEEK: { days: 7, amount: 1900, bid: 1, label: "7 days" },
  MONTH: { days: 30, amount: 5900, bid: 2, label: "30 days" },
  QUARTER: { days: 90, amount: 14900, bid: 3, label: "90 days" },
} as const;

/**
 * How many of its own adverts one company can have sponsored at once. This
 * limits what a company can buy, not what the page shows: every sponsored
 * advert from every company is listed.
 */
export const MAX_SPONSORED_PER_COMPANY = 3;

export type SponsorPackage = keyof typeof SPONSOR_PACKAGES;

export function isSponsorPackage(value: string | undefined): value is SponsorPackage {
  return !!value && value in SPONSOR_PACKAGES;
}
