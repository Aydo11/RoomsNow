/**
 * Content that can't be sent in RoomsNow messages or put in adverts: payment
 * links and bank or wallet details. Rental scams almost always end with the
 * victim paying through one of these before they have seen the room. Pure,
 * so it can be unit-tested. Admins can add their own words on top (see
 * BlockedPhrase and src/lib/blocked-content.ts).
 */
const BUILT_IN: Array<[label: string, pattern: RegExp]> = [
  ["a PayPal payment link", /\b(paypal\.me|paypal\.com\/(paypalme|pay|send|donate|invoice))\b/i],
  ["a payment app link", /\b(monzo\.me|revolut\.me|cash\.app|venmo\.com|wise\.com\/pay|ko-fi\.com|buymeacoffee\.com|pay\.sumup\.com|sumup\.link|buy\.stripe\.com|checkout\.stripe\.com|square\.link|pay\.gocardless\.com|link\.paypal|paypal\.com\/ncp)\b/i],
  ["a cash tag", /(^|\s)\$[a-z][a-z0-9_]{2,19}\b/i],
  ["bank details (sort code)", /\bsort[\s-]*code\b[^0-9]{0,15}\d{2}[\s-]?\d{2}[\s-]?\d{2}\b/i],
  ["bank details (account number)", /\b(account|acc|a\/c)\s*(no|number|num|#)?\.?\s*:?\s*\d{8}\b/i],
  ["bank details (IBAN)", /\b[A-Z]{2}\d{2}\s?[A-Z]{4}\s?(\d{4}\s?){3}\d{2}\b/],
  ["a crypto wallet address", /\b(bc1[a-z0-9]{25,59}|0x[a-fA-F0-9]{40}|T[1-9A-HJ-NP-Za-km-z]{33})\b/],
];

export type BlockedMatch = { label: string; phrase?: string };

function normalise(text: string) {
  return text.toLowerCase().replace(/\s+/g, " ");
}

/**
 * The first thing in the text that isn't allowed, or null. `extraPhrases`
 * are admin-added words, matched case-insensitively as whole words.
 */
export function blockedContent(text: string, extraPhrases: string[] = []): BlockedMatch | null {
  for (const [label, pattern] of BUILT_IN) if (pattern.test(text)) return { label };
  const phrase = matchingPhrases(text, extraPhrases)[0];
  return phrase ? { label: `a blocked word ("${phrase}")`, phrase } : null;
}

/** Which of the given words or phrases appear in the text (case-insensitive, whole words). */
export function matchingPhrases(text: string, phrases: string[]): string[] {
  const haystack = normalise(text);
  return phrases.filter((phrase) => {
    const needle = normalise(phrase).trim();
    if (!needle) return false;
    const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^|[^a-z0-9])${escaped}($|[^a-z0-9])`, "i").test(haystack);
  });
}

/** Plain-English summary of the built-in list, for the admin page. */
export const BUILT_IN_BLOCK_SUMMARY = [
  "Payment links: PayPal.me, Monzo.me, Revolut.me, Cash App, Venmo, Wise, Stripe, SumUp, Square, GoCardless, Ko-fi and similar",
  "Cash tags like $name",
  "Bank details: sort codes, account numbers and IBANs",
  "Crypto wallet addresses",
];

export const BLOCKED_MESSAGE_TEXT =
  "For your safety, payment links, bank details and some words can't be sent on RoomsNow. Never pay anything before you've viewed the room and met the provider. If someone asks you to pay up front, please report them.";

export const BLOCKED_ADVERT_TEXT =
  "Adverts can't include payment links, bank details or blocked words. Remove them and save again. Payment is arranged after a viewing, never through an advert.";
