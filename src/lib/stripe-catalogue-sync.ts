import "server-only";
import { billingIsLive, ensureProviderMembershipCatalogue, ensureReferrerMembershipCatalogue, membershipCataloguePlan, stripe } from "./billing";
import { servicePlanCatalogue } from "./service-billing";
import { cataloguePriceId } from "./stripe-catalogue";

/**
 * Creates any missing Stripe products and prices for every paid plan when the
 * server starts, so they are visible in the Stripe dashboard straight after a
 * deploy rather than on the first checkout. Safe to run on every boot: plans
 * are matched by lookup key and nothing is duplicated.
 */
export async function syncStripeCatalogue() {
  if (!billingIsLive()) return;
  await ensureProviderMembershipCatalogue();
  await ensureReferrerMembershipCatalogue();
  const client = stripe();
  const plans = [
    ...(await Promise.all((["PROFESSIONAL", "BUSINESS", "REFERRER_PRO"] as const).map((tier) => membershipCataloguePlan(tier)))),
    servicePlanCatalogue("STANDARD"),
    servicePlanCatalogue("PRO"),
  ];
  for (const plan of plans) {
    try {
      await cataloguePriceId(client, plan);
    } catch (error) {
      console.error(`[stripe-catalogue] could not sync ${plan.key}:`, error instanceof Error ? error.message : error);
    }
  }
}

export function scheduleStripeCatalogueSync() {
  // A short delay keeps this off the critical path of the first requests.
  setTimeout(() => {
    syncStripeCatalogue().catch((error) => console.error("[stripe-catalogue] sync failed:", error instanceof Error ? error.message : error));
  }, 15_000).unref?.();
}
