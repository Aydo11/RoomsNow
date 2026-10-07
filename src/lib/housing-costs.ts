export const LHA_LOOKUP = "https://lha-direct.voa.gov.uk/Secure/Search.aspx";
export const LHA_SOURCE = "https://www.gov.uk/government/publications/local-housing-allowance-lha-rates-applicable-from-april-2026-to-march-2027";
export const UC_LHA_SOURCE = "https://www.gov.uk/government/publications/universal-credit-local-housing-allowance-rates-2026-to-2027";
// DWP's published monthly UC limits, not a conversion of the weekly HB rates.
export const BIRMINGHAM_MONTHLY_UC_LHA = [341.58, 695, 750, 825, 1100] as const;
// VOA Birmingham BRMA 2024 rates, carried forward unchanged for 2026/27.
// Do not assume a Birmingham postal address belongs to this BRMA.
export const BIRMINGHAM_WEEKLY_LHA = [
  { label: "Shared accommodation", amount: 78.61 },
  { label: "1 bedroom", amount: 159.95 },
  { label: "2 bedrooms", amount: 172.60 },
  { label: "3 bedrooms", amount: 189.86 },
  { label: "4 bedrooms", amount: 253.15 },
] as const;

export function birminghamRatesCurrent(now = new Date()) {
  return now >= new Date("2026-04-01T00:00:00Z") && now < new Date("2027-04-01T00:00:00Z");
}

export function rentCapEstimate(rent: number, rentPeriod: "weekly" | "monthly", cap: number, benefit: "UC" | "HB") {
  if (![rent, cap].every((value) => Number.isFinite(value) && value >= 0 && value <= 100000)) return null;
  // UC rent is annualised over 52 weeks. The UC LHA cap is supplied separately
  // as the official monthly rate; never derive it from the weekly HB table.
  const comparableRent = benefit === "UC"
    ? (rentPeriod === "weekly" ? rent * 52 / 12 : rent)
    : (rentPeriod === "monthly" ? rent * 12 / 52 : rent);
  const maximum = Math.min(comparableRent, cap);
  return { rent: comparableRent, maximum, shortfall: Math.max(0, comparableRent - maximum), period: benefit === "UC" ? "month" : "week" };
}
