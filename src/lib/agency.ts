/** The kinds of organisation that refer people into accommodation. */
export const AGENCY_TYPES: Record<string, string> = {
  LOCAL_AUTHORITY: "Local authority / housing options",
  SOCIAL_CARE: "Adult or children's social care",
  PROBATION: "Probation or criminal justice",
  NHS: "NHS or mental health team",
  CHARITY: "Charity or voluntary sector",
  HOUSING_ASSOCIATION: "Housing association",
  SUPPORT_AGENCY: "Support or floating-support agency",
  INDEPENDENT: "Independent referrer or consultant",
  OTHER: "Other",
};

/** Normalises a stored website so it can be linked safely. */
export function websiteHref(value: string | null | undefined) {
  if (!value) return null;
  const v = value.trim();
  if (!v) return null;
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
}
