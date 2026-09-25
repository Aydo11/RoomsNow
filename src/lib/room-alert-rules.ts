/**
 * Pure rules for "Tell me when a room comes up" (no database), so they can be
 * tested and shared by the form and the server.
 */

/** A UK mobile in +447… form, or null if it isn't one. */
export function normaliseUkMobile(value: string): string | null {
  const digits = value.replace(/[\s()-]/g, "");
  let national: string | null = null;
  if (/^07\d{9}$/.test(digits)) national = digits.slice(1);
  else if (/^\+447\d{9}$/.test(digits)) national = digits.slice(3);
  else if (/^00447\d{9}$/.test(digits)) national = digits.slice(4);
  else if (/^447\d{9}$/.test(digits)) national = digits.slice(2);
  return national ? `+44${national}` : null;
}

export function normaliseEmail(value: string): string | null {
  const email = value.trim().toLowerCase();
  if (email.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return null;
  return email;
}

/** Shows only the end of a phone number or email, for confirmation screens. */
export function maskContact(value: string): string {
  if (value.includes("@")) {
    const [name, domain] = value.split("@");
    return `${name.slice(0, 2)}${"•".repeat(Math.max(1, name.length - 2))}@${domain}`;
  }
  return `${"•".repeat(Math.max(0, value.length - 3))}${value.slice(-3)}`;
}

type AlertLike = { where: string; support: string[] };
type ListingLike = { supportTypes: string[]; property: { city: string; area: string | null; postcode: string } };

/** Same place matching as saved searches: town, area or postcode prefix. */
export function alertMatchesListing(alert: AlertLike, listing: ListingLike): boolean {
  const where = alert.where.trim();
  if (where) {
    const needle = where.toLowerCase();
    const haystack = `${listing.property.city} ${listing.property.area ?? ""}`.toLowerCase();
    const postcode = listing.property.postcode.toUpperCase().replace(/\s+/g, "");
    const postcodeMatch = postcode.startsWith(where.toUpperCase().replace(/\s+/g, ""));
    if (!haystack.includes(needle) && !postcodeMatch) return false;
  }
  if (alert.support.length && !alert.support.some((slug) => listing.supportTypes.includes(slug))) return false;
  return true;
}

/** At most this many alerts per person per day, however many rooms go live. */
export const DAILY_ALERT_CAP = 3;
