import { ACCOMMODATION_TYPES, GENDER_ARRANGEMENTS, REFERRAL_ROUTES, supportLabel } from "./taxonomy";

export function submitSearchQuery(current: string, fields: { where: string; support: string; from: string; vetted: boolean }) {
  const query = new URLSearchParams(current);
  if (fields.where.trim() !== (query.get("where") ?? "").trim()) query.delete("bbox");
  for (const [key, value] of Object.entries({ where: fields.where.trim(), support: fields.support, from: fields.from, vetted: fields.vetted ? "1" : "" })) {
    if (value) query.set(key, value);
    else query.delete(key);
  }
  query.delete("page");
  return query;
}

export function removeSearchFilter(current: string, key: string, value?: string) {
  const query = new URLSearchParams(current);
  const remaining = value === undefined ? [] : (query.get(key) ?? "").split(",").filter((item) => item && item !== value);
  if (remaining.length) query.set(key, remaining.join(","));
  else query.delete(key);
  query.delete("page");
  return query;
}

export function appliedSearchFilters(params: URLSearchParams) {
  const applied: { key: string; label: string; value?: string }[] = [];
  const add = (key: string, label: string) => { if (params.get(key)) applied.push({ key, label }); };
  add("q", `"${params.get("q")}"`);
  add("where", params.get("where") ?? "");
  add("bbox", "This map area");
  for (const [key, label] of Object.entries({ verified: "Verified providers", vetted: "Vetted providers", wheelchair: "Wheelchair accessible", petsAllowed: "Pets allowed", ensuite: "En-suite", selfContained: "Self-contained", furnished: "Furnished", hb: "Accepts Housing Benefit" })) {
    if (params.get(key) === "1") applied.push({ key, label });
  }
  add("maxRent", `Up to £${params.get("maxRent")}/wk`);
  add("minRent", `From £${params.get("minRent")}/wk`);
  add("minAge", `Age ${params.get("minAge")}`);
  add("from", `Move in by ${params.get("from")}`);
  if (params.get("gender") && params.get("gender") !== "ANY") add("gender", GENDER_ARRANGEMENTS[params.get("gender") as keyof typeof GENDER_ARRANGEMENTS] ?? params.get("gender")!);
  if (params.get("resident") === "woman") add("resident", "Homes open to women");
  if (params.get("resident") === "man") add("resident", "Homes open to men");
  for (const key of ["support", "type", "referral"] as const) {
    for (const value of (params.get(key) ?? "").split(",").filter(Boolean)) {
      const label = key === "support" ? supportLabel(value) : key === "type" ? ACCOMMODATION_TYPES[value as keyof typeof ACCOMMODATION_TYPES] : REFERRAL_ROUTES[value as keyof typeof REFERRAL_ROUTES];
      applied.push({ key, value, label: label ?? value });
    }
  }
  return applied;
}
