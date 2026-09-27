import "server-only";
import type Stripe from "stripe";

/**
 * Real Stripe products and prices for every RoomsNow subscription plan.
 *
 * Each plan's price is found by a stable lookup key, and created (product +
 * monthly price) the first time it is needed. So memberships show up as proper
 * products in the Stripe dashboard, appear by name on invoices and in the
 * customer portal, and no STRIPE_PRICE_* variable has to be copied into Render.
 * A configured STRIPE_PRICE_* variable still wins where one exists.
 *
 * The amount is part of the lookup key, so changing a plan's price creates a
 * new Stripe price for new subscribers and leaves existing subscriptions on
 * the price they signed up at.
 */

export type CataloguePlan = {
  /** Stable plan id, e.g. "provider_professional". */
  key: string;
  name: string;
  description: string;
  /** Pence per month. */
  unitAmount: number;
};

export function catalogueLookupKey(plan: Pick<CataloguePlan, "key" | "unitAmount">) {
  return `roomsnow_${plan.key}_gbp_${plan.unitAmount}_monthly`;
}

const cache = new Map<string, string>();

export async function cataloguePriceId(client: Stripe, plan: CataloguePlan): Promise<string> {
  if (!Number.isInteger(plan.unitAmount) || plan.unitAmount <= 0) throw new Error(`${plan.name} has no monthly price to charge.`);
  const lookupKey = catalogueLookupKey(plan);
  const cached = cache.get(lookupKey);
  if (cached) return cached;

  const existing = await client.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 });
  let price = existing.data[0];
  if (!price) {
    const product = await findOrCreateProduct(client, plan);
    price = await client.prices.create(
      {
        product: product.id,
        currency: "gbp",
        unit_amount: plan.unitAmount,
        recurring: { interval: "month" },
        lookup_key: lookupKey,
        transfer_lookup_key: true,
        nickname: `${plan.name} (monthly)`,
        metadata: { app: "roomsnow", plan: plan.key },
      },
      { idempotencyKey: `roomsnow-price-${lookupKey}` },
    );
    if (product.default_price !== price.id) {
      await client.products.update(product.id, { default_price: price.id }).catch(() => undefined);
    }
  }
  cache.set(lookupKey, price.id);
  return price.id;
}

async function findOrCreateProduct(client: Stripe, plan: CataloguePlan) {
  const found = await client.products
    .search({ query: `metadata['roomsnow_plan']:'${plan.key}' AND active:'true'`, limit: 1 })
    .catch(() => null);
  const product = found?.data[0];
  if (product) {
    if (product.name !== plan.name || product.description !== plan.description) {
      return client.products.update(product.id, { name: plan.name, description: plan.description });
    }
    return product;
  }
  return client.products.create(
    { name: plan.name, description: plan.description, metadata: { app: "roomsnow", roomsnow_plan: plan.key } },
    { idempotencyKey: `roomsnow-product-${plan.key}` },
  );
}
