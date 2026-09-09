import { z } from "zod";

export const email = z.string().trim().toLowerCase().email("Enter a valid email address.");
/**
 * Eight characters is a practical floor for this consumer-facing service. We
 * still require mixed character types and reject the passwords attackers try first.
 * against the handful of passwords that get tried first in any credential attack.
 * For a production service, replace the deny-list with a k-anonymity lookup
 * against Have I Been Pwned's range API.
 */
const COMMON_PASSWORDS = new Set([
  "password123", "123456789012", "qwertyuiop12", "letmein12345", "welcome12345",
  "supportrooms", "roomsnow", "password1234", "iloveyou1234", "admin1234567", "changeme1234",
]);

export const password = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(200)
  .refine((v) => /[a-zA-Z]/.test(v) && /[0-9]/.test(v), "Include at least one letter and one number.")
  .refine((v) => !COMMON_PASSWORDS.has(v.toLowerCase()), "That password is too easy to guess.");

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    password,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Those passwords don't match.",
  })
  .refine((data) => data.password !== data.currentPassword, {
    path: ["password"],
    message: "Choose a password you haven't used here before.",
  });

export const registerSchema = z.object({
  accountType: z.enum(["USER", "PROVIDER", "REFERRER"]),
  firstName: z.string().trim().min(1, "Enter your first name.").max(80),
  lastName: z.string().trim().min(1, "Enter your last name.").max(80),
  email,
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  password,
  locationLabel: z.string().trim().max(120).optional().or(z.literal("")),
  contactMethod: z.enum(["MESSAGE", "EMAIL", "PHONE"]).default("MESSAGE"),
  ageRange: z.string().optional(),
  // provider only
  companyName: z.string().trim().max(160).optional().or(z.literal("")),
  orgType: z
    .enum([
      "SUPPORTED_ACCOMMODATION_PROVIDER",
      "HOUSING_PROVIDER",
      "MANAGING_AGENT",
      "LANDLORD",
      "CHARITY",
      "COMMUNITY_ORGANISATION",
      "OTHER",
    ])
    .optional(),
  companyCity: z.string().trim().max(120).optional().or(z.literal("")),
  // referrer only
  organisation: z.string().trim().max(160).optional().or(z.literal("")),
  jobTitle: z.string().trim().max(120).optional().or(z.literal("")),
  terms: z.literal("on", { errorMap: () => ({ message: "Please accept the terms to continue." }) }),
});

export const socialLinkSchema = z.object({
  platform: z.enum(["instagram", "facebook", "twitter", "linkedin", "tiktok", "youtube", "website", "other"]),
  url: z.string().trim().url("Enter a valid link, including https://.").max(300),
});
export const socialLinksSchema = z.array(socialLinkSchema).max(8, "Add up to 8 links.");

export const referrerProfileSchema = z.object({
  firstName: z.string().trim().min(1, "Enter your first name.").max(80),
  lastName: z.string().trim().min(1, "Enter your last name.").max(80),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  locationLabel: z.string().trim().max(120).optional().or(z.literal("")),
  organisation: z.string().trim().max(160).optional().or(z.literal("")),
  jobTitle: z.string().trim().max(120).optional().or(z.literal("")),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password."),
});

const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));

export const profileSchema = z.object({
  about: optionalText(2000),
  accommodationNeeds: optionalText(2000),
  supportNeeds: optionalText(2000),
  accessibilityNeeds: optionalText(1000),
  otherRequirements: optionalText(1000),
  preferredLocations: z.array(z.string().trim().max(120)).max(10).default([]),
  preferredTypes: z.array(z.string()).default([]),
  supportTypes: z.array(z.string()).default([]),
  genderArrangement: z.enum(["ANY", "FEMALE_ONLY", "MALE_ONLY", "MIXED"]).default("ANY"),
  dateOfBirth: z.string().optional().or(z.literal("")),
  availableFrom: z.string().optional().or(z.literal("")),
  publicProfile: z.boolean().default(false),
  showPhoto: z.boolean().default(false),
  showAge: z.boolean().default(true),
  showLocation: z.boolean().default(true),
  discoverable: z.boolean().default(false),
});

export const lookingForSchema = z.object({
  title: z.string().trim().min(6, "Give your advert a title.").max(140),
  city: z.string().trim().min(2, "Where are you looking?").max(120),
  postcode: optionalText(12),
  radiusMiles: z.coerce.number().int().min(0).max(100).default(10),
  accommodationTypes: z.array(z.string()).default([]),
  supportTypes: z.array(z.string()).default([]),
  moveInDate: z.string().optional().or(z.literal("")),
  budgetWeekly: z.coerce.number().min(0).max(2000).optional(),
  genderArrangement: z.enum(["ANY", "FEMALE_ONLY", "MALE_ONLY", "MIXED"]).default("ANY"),
  age: z.coerce.number().int().min(16).max(120).optional(),
  accessibilityNeeds: optionalText(1000),
  about: z.string().trim().max(4000).optional().or(z.literal("")),
  lookingFor: z.string().trim().max(4000).optional().or(z.literal("")),
  videoUrl: z.string().trim().url("Enter a valid video link.").optional().or(z.literal("")),
});

export const listingSchema = z.object({
  // step 1 — location
  propertyName: z.string().trim().min(2, "Name the property.").max(160),
  city: z.string().trim().min(2, "Enter a city or town.").max(120),
  area: optionalText(120),
  postcode: z.string().trim().min(3, "Enter a postcode.").max(12),
  addressLine1: optionalText(160),
  showExactAddress: z.boolean().default(false),
  // step 2 — accommodation
  title: z.string().trim().min(6, "Give the advert a title.").max(160),
  summary: optionalText(280),
  accommodationType: z.enum([
    "SINGLE_ROOM",
    "SHARED_ACCOMMODATION",
    "SELF_CONTAINED",
    "FLAT",
    "HOUSE",
    "OTHER",
  ]),
  bedrooms: z.coerce.number().int().min(1).max(60).default(1),
  roomCount: z.coerce.number().int().min(1).max(60).default(1),
  ensuite: z.boolean().default(false),
  furnished: z.boolean().default(true),
  selfContained: z.boolean().default(false),
  sharedFacilities: z.boolean().default(true),
  wheelchairAccess: z.boolean().default(false),
  accessibilityNotes: optionalText(1000),
  weeklyRentFrom: z.coerce.number().min(0).max(5000).optional(),
  weeklyRentTo: z.coerce.number().min(0).max(5000).optional(),
  billsIncluded: z.boolean().default(true),
  housingBenefit: z.boolean().default(true),
  availableFrom: z.string().optional().or(z.literal("")),
  genderArrangement: z.enum(["ANY", "FEMALE_ONLY", "MALE_ONLY", "MIXED"]).default("ANY"),
  minAge: z.coerce.number().int().min(16).max(120).optional(),
  maxAge: z.coerce.number().int().min(16).max(120).optional(),
  // step 3 — support
  supportTypes: z.array(z.string()).min(1, "Choose at least one support category."),
  supportDescription: z.string().trim().max(4000).optional().or(z.literal("")),
  supportAvailability: optionalText(240),
  supportProvider: optionalText(160),
  referralRoutes: z.array(z.string()).default([]),
  eligibility: z.string().trim().max(3000).optional().or(z.literal("")),
  referralProcess: z.string().trim().max(3000).optional().or(z.literal("")),
  houseRules: z.string().trim().max(3000).optional().or(z.literal("")),
  description: z.string().trim().max(20000).optional().or(z.literal("")),
});

export const requestSchema = z.object({
  listingId: z.string().min(1),
  moveInDate: z.string().optional().or(z.literal("")),
  accommodationNeeds: z.string().trim().max(3000).optional().or(z.literal("")),
  supportNeeds: z.string().trim().max(3000).optional().or(z.literal("")),
  additionalInfo: z.string().trim().max(3000).optional().or(z.literal("")),
  consent: z.literal("on", {
    errorMap: () => ({ message: "Please confirm you're happy to share these details with the provider." }),
  }),
});

export const referralSchema = z.object({
  listingId: z.string().optional().or(z.literal("")),
  clientId: z.string().optional().or(z.literal("")),
  applicantFirstName: z.string().trim().min(1, "Enter the applicant's first name.").max(80),
  applicantLastName: z.string().trim().min(1, "Enter the applicant's last name.").max(80),
  applicantDob: z.string().optional().or(z.literal("")),
  applicantPhone: optionalText(30),
  applicantEmail: z.string().trim().email().optional().or(z.literal("")),
  organisation: z.string().trim().min(2, "Enter your organisation.").max(160),
  referrerJobTitle: optionalText(120),
  preferredLocation: optionalText(160),
  accommodationNeeds: z.string().trim().max(3000).optional().or(z.literal("")),
  supportNeeds: z.string().trim().max(3000).optional().or(z.literal("")),
  supportTypes: z.array(z.string()).default([]),
  urgency: z.enum(["LOW", "MEDIUM", "HIGH", "EMERGENCY"]).default("MEDIUM"),
  additionalInfo: z.string().trim().max(3000).optional().or(z.literal("")),
  consent: z.literal("on", {
    errorMap: () => ({ message: "Confirm you have the applicant's consent to share this information." }),
  }),
});

export const clientSchema = z.object({
  firstName: z.string().trim().min(1, "Enter a first name.").max(80),
  lastName: z.string().trim().min(1, "Enter a last name.").max(80),
  dateOfBirth: z.string().optional().or(z.literal("")),
  phone: optionalText(30),
  email: z.string().trim().email().optional().or(z.literal("")),
  preferredLocation: optionalText(160),
  accommodationNeeds: z.string().trim().max(3000).optional().or(z.literal("")),
  supportNeeds: z.string().trim().max(3000).optional().or(z.literal("")),
  supportTypes: z.array(z.string()).default([]),
  riskNotes: z.string().trim().max(3000).optional().or(z.literal("")),
  status: z.enum(["ACTIVE", "PLACED", "ARCHIVED"]).default("ACTIVE"),
});

export const clientShareSchema = z.object({
  clientId: z.string().min(1),
  companyId: z.string().min(1),
  note: z.string().trim().max(1000).optional().or(z.literal("")),
});

export const messageSchema = z.object({
  conversationId: z.string().min(1),
  body: z.string().trim().min(1, "Write a message.").max(5000),
});

export const reportSchema = z.object({
  targetType: z.enum(["LISTING", "USER", "COMPANY", "MESSAGE", "LOOKING_FOR_AD"]),
  targetId: z.string().min(1),
  reason: z.enum([
    "SCAM",
    "INCORRECT_INFORMATION",
    "UNSAFE_ACCOMMODATION",
    "INAPPROPRIATE_CONTENT",
    "MISLEADING_INFORMATION",
    "OTHER",
  ]),
  detail: z.string().trim().max(2000).optional().or(z.literal("")),
});

/** Turns a ZodError into { field: message } for inline form errors. */
export const companySchema = z.object({
  name: z.string().trim().min(2, "Enter your organisation name."),
  tradingName: z.string().trim().optional().default(""),
  registrationNumber: z.string().trim().optional().default(""),
  email: email,
  phone: z.string().trim().optional().default(""),
  website: z.string().trim().optional().default(""),
  addressLine1: z.string().trim().optional().default(""),
  addressLine2: z.string().trim().optional().default(""),
  city: z.string().trim().optional().default(""),
  postcode: z.string().trim().optional().default(""),
  orgType: z.enum([
    "SUPPORTED_ACCOMMODATION_PROVIDER",
    "HOUSING_PROVIDER",
    "MANAGING_AGENT",
    "LANDLORD",
    "CHARITY",
    "COMMUNITY_ORGANISATION",
    "OTHER",
  ]),
  about: z.string().trim().max(4000).optional().default(""),
  operatingAreas: z.array(z.string()).default([]),
  supportTypes: z.array(z.string()).default([]),
});

export function fieldErrors(error: z.ZodError) {
  const out: Record<string, string> = {};
  for (const issue of error.errors) {
    const key = issue.path.join(".") || "form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export type FormState = { ok: boolean; errors?: Record<string, string>; message?: string; redirect?: string };
