/**
 * Phrases that often appear in rental scams on room-finding sites. Pure, so
 * it can be unit-tested. Matches are flagged for a person to review; they
 * are not proof of a scam.
 */
const PATTERNS: Array<[label: string, pattern: RegExp]> = [
  ["a deposit or payment before viewing", /\b(pay|send|transfer)\b[^.?!]{0,40}\b(before|prior to)\b[^.?!]{0,20}\b(view|viewing|visit|see)/i],
  ["a holding deposit", /\b(holding|reservation|reserve|admin(istration)?)\s+(deposit|fee)\b/i],
  ["a bank transfer", /\b(bank transfer|transfer the money|sort code|account number|iban)\b/i],
  ["untraceable payment", /\b(western union|moneygram|gift ?cards?|crypto|bitcoin|usdt|paypal friends|friends and family)\b/i],
  ["sending money now", /\b(send|pay)\s+(me\s+)?(the\s+)?(money|deposit|cash|£\s?\d+)\b/i],
  ["being abroad and unable to show the room", /\b(i am|i'm|currently)\s+(abroad|overseas|out of the country|working away)\b/i],
  ["keys sent by post or courier", /\b(post|courier|send|mail)\b[^.?!]{0,20}\bkeys?\b|\bkeys?\b[^.?!]{0,30}\b(post|courier|deliver|airbnb)\b/i],
];

export function scamSignals(text: string): string[] {
  return PATTERNS.filter(([, pattern]) => pattern.test(text)).map(([label]) => label);
}
