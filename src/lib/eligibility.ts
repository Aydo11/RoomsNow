/**
 * The "Am I eligible?" check. Five plain questions turn into ordinary search
 * filters, so the answer is always "these are the rooms that fit", using the
 * same rules as /search. Nothing here is stored: the answers only ever live in
 * the browser and in the search link.
 */
export type Resident = "woman" | "man" | "skip";
export type RentAnswer = "hb" | "self" | "unsure";
export type HelperAnswer = "yes" | "no";

export type EligibilityAnswers = {
  where: string;
  age: string;
  resident: Resident | null;
  support: string[];
  stepFree: boolean;
  pets: boolean;
  rent: RentAnswer | null;
  helper: HelperAnswer | null;
};

export const EMPTY_ANSWERS: EligibilityAnswers = {
  where: "",
  age: "",
  resident: null,
  support: [],
  stepFree: false,
  pets: false,
  rent: null,
  helper: null,
};

export const MIN_AGE = 16;
export const MAX_AGE = 99;

/** A usable age, or null when the box is empty or out of range. */
export function parseAge(value: string): number | null {
  const age = Number(value.trim());
  if (!value.trim() || !Number.isInteger(age) || age < MIN_AGE || age > MAX_AGE) return null;
  return age;
}

/** Search filters for these answers, in the same shape /search reads them. */
export function eligibilityParams(answers: EligibilityAnswers): URLSearchParams {
  const params = new URLSearchParams();
  const where = answers.where.trim();
  if (where) params.set("where", where.slice(0, 80));
  const age = parseAge(answers.age);
  if (age !== null) params.set("minAge", String(age));
  if (answers.resident === "woman" || answers.resident === "man") params.set("resident", answers.resident);
  const support = answers.support.filter((slug) => slug !== "none");
  if (support.length) params.set("support", support.join(","));
  if (answers.stepFree) params.set("wheelchair", "1");
  if (answers.pets) params.set("petsAllowed", "1");
  if (answers.rent === "hb") params.set("hb", "1");
  // People looking on their own can only use homes that take self-referrals.
  if (answers.helper === "no") params.set("referral", "SELF_REFERRAL,ANY");
  return params;
}

export function eligibilityQuery(answers: EligibilityAnswers): string {
  const text = eligibilityParams(answers).toString();
  return text ? `?${text}` : "";
}

/** Keys the count action accepts; everything else in a query is ignored. */
export const ELIGIBILITY_KEYS = ["where", "minAge", "resident", "support", "wheelchair", "petsAllowed", "hb", "referral"] as const;
