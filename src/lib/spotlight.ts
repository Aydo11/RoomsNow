/**
 * Homepage spotlight: the paid slot directly under the homepage search.
 * Pure, so the packages and the text rules can be unit-tested and shared by
 * the purchase form, the server action and the Stripe webhook.
 */
export const SPOTLIGHT_PACKAGES = {
  WEEK: { days: 7, amount: 4900, label: "7 days" },
  MONTH: { days: 30, amount: 14900, label: "30 days" },
} as const;

export type SpotlightPackage = keyof typeof SPOTLIGHT_PACKAGES;

export function isSpotlightPackage(value: unknown): value is SpotlightPackage {
  return typeof value === "string" && Object.hasOwn(SPOTLIGHT_PACKAGES, value);
}

/** How often the homepage moves to the next spotlight when several are live. */
export const SPOTLIGHT_ROTATE_MS = 6000;

export const SPOTLIGHT_LIMITS = { headline: 70, body: 180 } as const;

export type SpotlightText = { headline: string; body: string };

/** Tidies and checks the advert text. Returns field errors, or the clean text. */
export function cleanSpotlightText(input: { headline?: unknown; body?: unknown }): { ok: true; value: SpotlightText } | { ok: false; errors: Record<string, string> } {
  const headline = String(input.headline ?? "").replace(/\s+/g, " ").trim();
  const body = String(input.body ?? "").replace(/\s+/g, " ").trim();
  const errors: Record<string, string> = {};
  if (headline.length < 4) errors.headline = "Write a headline of at least 4 characters.";
  else if (headline.length > SPOTLIGHT_LIMITS.headline) errors.headline = `Keep the headline to ${SPOTLIGHT_LIMITS.headline} characters.`;
  if (body.length < 10) errors.body = "Describe your service in at least 10 characters.";
  else if (body.length > SPOTLIGHT_LIMITS.body) errors.body = `Keep the description to ${SPOTLIGHT_LIMITS.body} characters.`;
  if (/https?:\/\/|www\./i.test(`${headline} ${body}`)) errors.body = "Leave links out. The spotlight links to your RoomsNow profile.";
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value: { headline, body } };
}

export function formatPounds(pence: number) {
  return `£${(pence / 100).toFixed(pence % 100 ? 2 : 0)}`;
}
