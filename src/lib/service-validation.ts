import { z } from "zod";
import { isServiceCategory, isSubcategoryOf } from "./service-marketplace";

/** "Walsall, Wolverhampton\nDudley" → ["Walsall", "Wolverhampton", "Dudley"], de-duplicated. */
export function splitPlaces(value: string, max = 60) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of value.split(/[,\n;]+/)) {
    const place = raw.trim().replace(/\s+/g, " ").slice(0, 60);
    if (!place || seen.has(place.toLowerCase())) continue;
    seen.add(place.toLowerCase());
    out.push(place);
    if (out.length >= max) break;
  }
  return out;
}

export function splitPostcodes(value: string) {
  return splitPlaces(value, 80)
    .map((code) => code.toUpperCase().replace(/\s+/g, ""))
    .filter((code) => /^[A-Z]{1,2}\d[A-Z\d]?(\d[A-Z]{2})?$/.test(code));
}

/** "65", "65.5", "£1,200" → pence. Blank → null. Anything else → NaN (caught by the schema). */
export function poundsToPence(value: string) {
  const cleaned = value.replace(/[£,\s]/g, "");
  if (!cleaned) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return Number.NaN;
  return Math.round(Number(cleaned) * 100);
}

const optionalText = (max: number) => z.string().trim().max(max, `Keep this under ${max} characters.`).optional().or(z.literal(""));
const url = z
  .string()
  .trim()
  .max(300)
  .refine((v) => !v || /^https?:\/\/[^\s]+\.[^\s]+$/i.test(v), "Enter a full web address starting with https://")
  .optional()
  .or(z.literal(""));
const pence = z.number({ invalid_type_error: "Enter an amount like 65 or 65.50." }).int().min(0, "Enter an amount of £0 or more.").max(100_000_000, "That amount is too large.").nullable();

export const serviceProfileSchema = z.object({
  name: z.string().trim().min(2, "Enter your registered business name.").max(160),
  tradingName: optionalText(160),
  contactName: z.string().trim().min(2, "Enter a contact person.").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid business email."),
  phone: z.string().trim().max(30).refine((v) => !v || /^[+\d][\d\s()-]{6,}$/.test(v), "Enter a valid phone number.").optional().or(z.literal("")),
  website: url,
  companyNumber: z.string().trim().toUpperCase().max(12).refine((v) => !v || /^[A-Z0-9]{6,10}$/.test(v.replace(/\s/g, "")), "Company numbers are 8 characters, e.g. 01234567 or SC123456.").optional().or(z.literal("")),
  categories: z.array(z.string().refine(isServiceCategory, "Choose a listed category.")).min(1, "Choose at least one service category.").max(8, "Choose up to 8 categories."),
  areas: z.array(z.string()).max(60),
  postcodes: z.array(z.string()).max(80),
  nationalCoverage: z.boolean(),
  basePostcode: z.string().trim().toUpperCase().max(10).refine((v) => !v || /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/.test(v), "Enter a full UK postcode, e.g. B21 9QX.").optional().or(z.literal("")),
  radiusMiles: z.number().int().min(0).max(300).nullable(),
  description: z.string().trim().max(4000, "Keep your description under 4,000 characters.").optional().or(z.literal("")),
  yearsExperience: z.number().int().min(0).max(100).nullable(),
  openingHours: optionalText(300),
  emergencyAvailable: z.boolean(),
  pricingSummary: optionalText(500),
  quoteOnly: z.boolean(),
  terms: optionalText(3000),
  cancellationPolicy: optionalText(1500),
  responseTarget: optionalText(80),
});

export const EVIDENCE_TYPES = ["PUBLIC_LIABILITY", "EMPLOYERS_LIABILITY", "INCORPORATION", "QUALIFICATION", "LICENCE", "ACCREDITATION", "OTHER"] as const;

export const serviceEvidenceSchema = z
  .object({
    type: z.enum(EVIDENCE_TYPES, { errorMap: () => ({ message: "Choose what this document is." }) }),
    label: z.string().trim().min(2, "Give the document a short name, e.g. “Public liability £5m”.").max(120),
    issuer: optionalText(120),
    reference: optionalText(80),
    expiresAt: z.date().nullable(),
  })
  .refine((data) => !["PUBLIC_LIABILITY", "EMPLOYERS_LIABILITY", "LICENCE"].includes(data.type) || data.expiresAt, {
    path: ["expiresAt"],
    message: "Insurance and licences need an expiry date.",
  })
  .refine((data) => !data.expiresAt || data.expiresAt.getTime() > Date.now(), { path: ["expiresAt"], message: "This document has already expired." });

export const PRICE_TYPES = ["FIXED", "FROM", "RANGE", "HOURLY", "QUOTE"] as const;

export const serviceAdvertSchema = z
  .object({
    title: z.string().trim().min(8, "Use a clear title of at least 8 characters.").max(100),
    category: z.string().refine(isServiceCategory, "Choose a category."),
    subcategory: z.string().trim().max(80).optional().or(z.literal("")),
    description: z.string().trim().min(60, "Describe the service in at least 60 characters.").max(5000),
    locations: z.array(z.string()).max(60),
    nationwide: z.boolean(),
    priceType: z.enum(PRICE_TYPES),
    priceFrom: pence,
    priceTo: pence,
    priceUnit: optionalText(40),
    availability: optionalText(300),
    emergency: z.boolean(),
    sameDay: z.boolean(),
    qualifications: optionalText(1000),
    website: url,
  })
  .refine((data) => !data.subcategory || isSubcategoryOf(data.category, data.subcategory), { path: ["subcategory"], message: "Choose a type from the list." })
  .refine((data) => data.nationwide || data.locations.length > 0, { path: ["locations"], message: "Add at least one town or area, or tick nationwide." })
  .refine((data) => data.priceType === "QUOTE" || data.priceFrom !== null, { path: ["priceFrom"], message: "Enter a price, or choose “Quote only”." })
  .refine((data) => data.priceType !== "RANGE" || (data.priceTo !== null && data.priceFrom !== null && data.priceTo > data.priceFrom), { path: ["priceTo"], message: "The top of the range must be more than the bottom." });

export const URGENCIES = ["FLEXIBLE", "WITHIN_A_MONTH", "WITHIN_A_WEEK", "URGENT", "EMERGENCY"] as const;

export const quoteRequestSchema = z
  .object({
    service: z.string().trim().min(3, "Say what you need.").max(120),
    location: z.string().trim().min(2, "Where is the job? A town or postcode is enough.").max(120),
    preferredDate: z.date().nullable(),
    urgency: z.enum(URGENCIES),
    description: z.string().trim().min(20, "Add a little more detail (20+ characters) so they can quote accurately.").max(3000),
    budgetMin: pence,
    budgetMax: pence,
  })
  .refine((data) => data.budgetMin === null || data.budgetMax === null || data.budgetMax >= data.budgetMin, { path: ["budgetMax"], message: "The maximum should be at least the minimum." });

export const quoteResponseSchema = z
  .object({
    decision: z.enum(["quote", "decline"]),
    amount: pence,
    note: z.string().trim().max(2000).optional().or(z.literal("")),
    validUntil: z.date().nullable(),
  })
  .refine((data) => data.decision !== "quote" || (data.amount !== null && data.amount > 0), { path: ["amount"], message: "Enter your quote amount." });

const score = z.number().int().min(1, "Choose 1 to 5 stars.").max(5);
export const serviceReviewSchema = z.object({
  rating: score,
  quality: score,
  communication: score,
  timeliness: score,
  value: score,
  comment: z.string().trim().max(1500).optional().or(z.literal("")),
});
