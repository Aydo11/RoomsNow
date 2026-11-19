/**
 * Just added lane. New provider spotlight: a free, unpaid welcome placement. For 72 hours after
 * a provider's first advert goes live, their adverts sit at the top of the
 * ordinary results with a "New provider" tag, so they get early enquiries.
 */
export const NEW_PROVIDER_SPOTLIGHT_MS = 72 * 60 * 60 * 1000;
/** Only companies that joined this recently count as new providers. */
export const NEW_PROVIDER_JOINED_MS = 14 * 24 * 60 * 60 * 1000;
/** Every newly published (or re-approved) advert leads for this long, then joins the normal order. */
export const FRESH_ADVERT_MS = 48 * 60 * 60 * 1000;

/** When the spotlight ends, or null if it has already ended or never started. */
export function spotlightEndsAt(firstPublishedAt: Date | string | null | undefined, now = Date.now()) {
  if (!firstPublishedAt) return null;
  const end = new Date(firstPublishedAt).getTime() + NEW_PROVIDER_SPOTLIGHT_MS;
  return end > now ? new Date(end) : null;
}
