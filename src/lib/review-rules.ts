/**
 * Pure rules for resident reviews, kept free of the database so they can be
 * tested and shared by the form and the server.
 */

export const REVIEW_COMMENT_MAX = 800;
export const REPLY_MAX = 800;

const EMAIL = /[^\s@]+@[^\s@]+\.[^\s@]{2,}/;
// UK-style phone numbers: 11 digits starting 0, or +44, allowing spaces and dashes.
const PHONE = /(?:\+44\s?|\b0)(?:[\s-]?\d){9,10}\b/;

/** Reviews are public, so phone numbers and emails are kept out of them. */
export function containsContactDetails(text: string): boolean {
  return EMAIL.test(text) || PHONE.test(text);
}

export type ReviewForSummary = { rating: number; feelSafe: boolean | null; supportHelpful: boolean | null };

export type ResidentReviewSummary = {
  count: number;
  average: number;
  /** Percentage of those who answered, or null when nobody did. */
  feelSafePct: number | null;
  supportHelpfulPct: number | null;
};

const pctYes = (values: (boolean | null)[]) => {
  const answered = values.filter((value): value is boolean => value !== null);
  return answered.length ? Math.round((answered.filter(Boolean).length / answered.length) * 100) : null;
};

export function summariseResidentReviews(reviews: ReviewForSummary[]): ResidentReviewSummary {
  if (!reviews.length) return { count: 0, average: 0, feelSafePct: null, supportHelpfulPct: null };
  return {
    count: reviews.length,
    average: Math.round((reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length) * 10) / 10,
    feelSafePct: pctYes(reviews.map((review) => review.feelSafe)),
    supportHelpfulPct: pctYes(reviews.map((review) => review.supportHelpful)),
  };
}

/** "yes" / "no" / anything else from a form radio. */
export function yesNo(value: FormDataEntryValue | null): boolean | null {
  if (value === "yes") return true;
  if (value === "no") return false;
  return null;
}
