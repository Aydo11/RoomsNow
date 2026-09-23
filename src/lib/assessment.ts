import type { AccommodationType, GenderArrangement } from "@prisma/client";

/**
 * The optional needs and risk assessment a referrer can fill in for a client.
 * Every field is optional. It's stored as JSON on Client.assessment, stays
 * private to the referrer, and feeds the client-to-advert matching.
 */

export const LEVELS = {
  NONE: "None known",
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  UNKNOWN: "Not known",
} as const;
export type Level = keyof typeof LEVELS;

export const NEED_LEVELS = {
  NONE: "No support needed",
  SOME: "Some support",
  HIGH: "A lot of support",
} as const;
export type NeedLevel = keyof typeof NEED_LEVELS;

export const SUPPORT_LEVELS = {
  LOW: "Light touch — a few hours a week",
  MEDIUM: "Regular — key-worker sessions most weeks",
  HIGH: "Intensive — daily contact",
  TWENTY_FOUR: "24-hour staffed support",
} as const;
export type SupportLevel = keyof typeof SUPPORT_LEVELS;

export const FUNDING = {
  HOUSING_BENEFIT: "Housing Benefit / Universal Credit",
  LOCAL_AUTHORITY: "Local authority or commissioned",
  SELF_FUNDED: "Self-funded",
  OTHER: "Other",
} as const;
export type Funding = keyof typeof FUNDING;

export const GENDERS = {
  FEMALE: "Woman",
  MALE: "Man",
  OTHER: "Other / prefer to self-describe",
} as const;
export type Gender = keyof typeof GENDERS;

export const MAPPA = {
  NONE: "Not MAPPA managed",
  LEVEL_1: "MAPPA level 1",
  LEVEL_2: "MAPPA level 2",
  LEVEL_3: "MAPPA level 3",
} as const;
export type Mappa = keyof typeof MAPPA;

export const RISK_AREAS = {
  riskToSelf: "Risk to self (self-harm, suicide)",
  riskToOthers: "Risk to others",
  riskFromOthers: "Risk from others (exploitation, abuse)",
  violence: "History of violence",
  arson: "Arson or fire-setting",
  sexualHarm: "Sexual harm",
  substanceRisk: "Risk linked to drug or alcohol use",
} as const;
export type RiskArea = keyof typeof RISK_AREAS;

export const NEED_AREAS = {
  mentalHealth: "Mental health",
  substanceUse: "Drug or alcohol use",
  physicalHealth: "Physical health or mobility",
  medication: "Taking medication",
  dailyLiving: "Cooking, cleaning and budgeting",
  benefitsAndMoney: "Benefits, debt and money",
  education: "Education, training or work",
  socialNetworks: "Relationships and isolation",
} as const;
export type NeedArea = keyof typeof NEED_AREAS;

export const FACILITIES = {
  stepFree: "Step-free access / wheelchair",
  groundFloor: "Ground-floor room",
  ensuite: "En-suite",
  selfContained: "Self-contained",
  furnished: "Furnished",
  pet: "Has a pet",
} as const;
export type Facility = keyof typeof FACILITIES;

export type Assessment = {
  // Placement
  areas?: string[];
  radiusMiles?: number;
  moveBy?: string;
  accommodationTypes?: AccommodationType[];
  household?: GenderArrangement;
  gender?: Gender;
  facilities?: Facility[];
  funding?: Funding;
  maxWeeklyRent?: number; // pounds
  // Support
  supportLevel?: SupportLevel;
  supportHours?: number;
  needs?: Partial<Record<NeedArea, NeedLevel>>;
  // Risk
  risks?: Partial<Record<RiskArea, Level>>;
  mappa?: Mappa;
  probation?: boolean;
  riskSummary?: string;
  triggers?: string;
  whatHelps?: string;
  goals?: string;
};

const ACCOMMODATION: AccommodationType[] = ["SINGLE_ROOM", "SHARED_ACCOMMODATION", "SELF_CONTAINED", "FLAT", "HOUSE", "OTHER"];
const HOUSEHOLDS: GenderArrangement[] = ["ANY", "FEMALE_ONLY", "MALE_ONLY", "MIXED"];

const pick = <T extends string>(value: unknown, allowed: readonly T[]) =>
  typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : undefined;
const text = (value: unknown, max = 1500) => {
  const s = typeof value === "string" ? value.trim().slice(0, max) : "";
  return s || undefined;
};
const num = (value: unknown, min: number, max: number) => {
  const n = Number(value);
  return Number.isFinite(n) && n >= min && n <= max && String(value).trim() !== "" ? Math.round(n) : undefined;
};

/** Build a clean assessment from the form. Unknown keys and values are dropped. */
export function assessmentFromForm(form: FormData): Assessment {
  const get = (k: string) => form.get(k);
  const areas = String(get("areas") ?? "")
    .split(/[,;\n]/)
    .map((a) => a.trim())
    .filter(Boolean)
    .slice(0, 6);
  const moveBy = text(get("moveBy"), 10);
  const needs: Assessment["needs"] = {};
  for (const key of Object.keys(NEED_AREAS) as NeedArea[]) {
    const v = pick(get(`need_${key}`), Object.keys(NEED_LEVELS) as NeedLevel[]);
    if (v) needs[key] = v;
  }
  const risks: Assessment["risks"] = {};
  for (const key of Object.keys(RISK_AREAS) as RiskArea[]) {
    const v = pick(get(`risk_${key}`), Object.keys(LEVELS) as Level[]);
    if (v) risks[key] = v;
  }
  const clean: Assessment = {
    areas: areas.length ? areas : undefined,
    radiusMiles: num(get("radiusMiles"), 1, 100),
    moveBy: moveBy && /^\d{4}-\d{2}-\d{2}$/.test(moveBy) ? moveBy : undefined,
    accommodationTypes: form.getAll("accommodationTypes").map((v) => pick(v, ACCOMMODATION)).filter(Boolean) as AccommodationType[],
    household: pick(get("household"), HOUSEHOLDS),
    gender: pick(get("gender"), Object.keys(GENDERS) as Gender[]),
    facilities: form.getAll("facilities").map((v) => pick(v, Object.keys(FACILITIES) as Facility[])).filter(Boolean) as Facility[],
    funding: pick(get("funding"), Object.keys(FUNDING) as Funding[]),
    maxWeeklyRent: num(get("maxWeeklyRent"), 1, 5000),
    supportLevel: pick(get("supportLevel"), Object.keys(SUPPORT_LEVELS) as SupportLevel[]),
    supportHours: num(get("supportHours"), 0, 168),
    needs: Object.keys(needs).length ? needs : undefined,
    risks: Object.keys(risks).length ? risks : undefined,
    mappa: pick(get("mappa"), Object.keys(MAPPA) as Mappa[]),
    probation: get("probation") === "yes" ? true : get("probation") === "no" ? false : undefined,
    riskSummary: text(get("riskSummary")),
    triggers: text(get("triggers")),
    whatHelps: text(get("whatHelps")),
    goals: text(get("goals")),
  };
  if (!clean.accommodationTypes?.length) delete clean.accommodationTypes;
  // The form always sends a blank "facilities" entry, so an empty list means
  // "none of these needed" rather than "not answered".
  if (!form.has("facilities")) delete clean.facilities;
  for (const key of Object.keys(clean) as (keyof Assessment)[]) if (clean[key] === undefined) delete clean[key];
  // Nothing but an empty facilities list means nothing was filled in at all.
  if (Object.keys(clean).length === 1 && clean.facilities?.length === 0) return {};
  return clean;
}

/** Read whatever is stored, tolerating older or partial shapes. */
export function parseAssessment(value: unknown): Assessment {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Assessment;
}

/** Rough completeness, so the UI can nudge without making anything compulsory. */
export function assessmentCompleteness(a: Assessment) {
  const checks = [
    Boolean(a.areas?.length),
    Boolean(a.moveBy),
    Boolean(a.accommodationTypes?.length),
    Boolean(a.household || a.gender),
    a.facilities !== undefined,
    Boolean(a.funding),
    Boolean(a.supportLevel),
    Boolean(a.needs && Object.keys(a.needs).length >= 3),
    Boolean(a.risks && Object.keys(a.risks).length >= 3),
    Boolean(a.riskSummary || a.whatHelps),
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

/** Risk areas rated medium or high, for flags and the summary panel. */
export function raisedRisks(a: Assessment) {
  return (Object.entries(a.risks ?? {}) as [RiskArea, Level][])
    .filter(([, level]) => level === "MEDIUM" || level === "HIGH")
    .map(([area, level]) => ({ area, label: RISK_AREAS[area], level }));
}
