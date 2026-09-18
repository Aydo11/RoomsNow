/**
 * Display labels. Support categories also live in the SupportType table so admins
 * can add to them; these are the seeded defaults used for filters and forms.
 */
export const SUPPORT_TYPES = [
  { slug: "mental-health", label: "Mental health" },
  { slug: "homelessness", label: "Homelessness" },
  { slug: "substance-misuse", label: "Substance misuse" },
  { slug: "learning-disability", label: "Learning disability" },
  { slug: "physical-disability", label: "Physical disability" },
  { slug: "young-people", label: "Young people (16–25)" },
  { slug: "care-leavers", label: "Care leavers" },
  { slug: "vulnerable-adults", label: "Vulnerable adults" },
  { slug: "domestic-abuse", label: "Domestic abuse" },
  { slug: "ex-offenders", label: "Prison leavers" },
  { slug: "other", label: "Other" },
] as const;

export const supportLabel = (slug: string) =>
  SUPPORT_TYPES.find((s) => s.slug === slug)?.label ?? slug;

export const ACCOMMODATION_TYPES = {
  SINGLE_ROOM: "Single room",
  SHARED_ACCOMMODATION: "Shared accommodation",
  SELF_CONTAINED: "Self-contained",
  FLAT: "Flat",
  HOUSE: "House",
  OTHER: "Other",
} as const;

export const GENDER_ARRANGEMENTS = {
  ANY: "Any",
  FEMALE_ONLY: "Women only",
  MALE_ONLY: "Men only",
  MIXED: "Mixed",
} as const;

export const ROOM_STATUSES = {
  AVAILABLE: "Available",
  RESERVED: "Reserved",
  OCCUPIED: "Occupied",
  VOID: "Void",
  MAINTENANCE: "Maintenance",
  UNAVAILABLE: "Unavailable",
} as const;

export const LISTING_STATUSES = {
  DRAFT: "Draft",
  PENDING_REVIEW: "Awaiting review",
  ACTIVE: "Live",
  PAUSED: "Paused",
  REJECTED: "Rejected",
  ARCHIVED: "Archived",
} as const;

/**
 * Preset reasons an admin can pick when taking down a live advert
 * (`takedownListingAction`). Kept short and provider-facing — the picked
 * label is sent to the provider as-is, optionally with their own extra
 * detail appended, so avoid internal jargon here.
 */
export const TAKEDOWN_REASONS = [
  "Inaccurate or misleading information",
  "Duplicate advert",
  "Not a valid or licensed provider",
  "Breaches our advertising policies",
  "Confirmed by a user report",
  "Requested by the provider",
  "Other",
] as const;

export const REFERRAL_ROUTES = {
  SELF_REFERRAL: "Self-referral",
  PROFESSIONAL_REFERRAL: "Professional referral",
  LOCAL_AUTHORITY: "Local authority",
  ANY: "Any route",
} as const;

export const ORG_TYPES = {
  SUPPORTED_ACCOMMODATION_PROVIDER: "Supported or adult social care accommodation provider",
  HOUSING_PROVIDER: "Housing provider (including HMO and transitional housing)",
  MANAGING_AGENT: "Managing agent",
  LANDLORD: "Landlord",
  CHARITY: "Charity",
  COMMUNITY_ORGANISATION: "Community organisation",
  OTHER: "Other",
} as const;

/** Pipeline shared by requests and referrals. */
export const PIPELINE = [
  "SUBMITTED",
  "RECEIVED",
  "UNDER_REVIEW",
  "ASSESSMENT",
  "OFFERED",
  "ACCEPTED",
  "MOVED_IN",
] as const;

export const PIPELINE_LABELS: Record<string, string> = {
  SUBMITTED: "Submitted",
  RECEIVED: "Received",
  UNDER_REVIEW: "Under review",
  ASSESSMENT: "Assessment",
  OFFERED: "Accommodation offered",
  ACCEPTED: "Accepted",
  MOVED_IN: "Moved in",
  DECLINED: "Declined",
  WITHDRAWN: "Withdrawn",
};

export const URGENCY_LABELS = {
  LOW: "Not urgent",
  MEDIUM: "Within a month",
  HIGH: "Within a week",
  EMERGENCY: "Same day",
} as const;

export const UK_CITIES = [
  "Birmingham", "Manchester", "Leeds", "Liverpool", "Sheffield", "Bristol",
  "Nottingham", "Leicester", "Newcastle upon Tyne", "Coventry", "Bradford",
  "Stoke-on-Trent", "Wolverhampton", "Plymouth", "Derby", "Southampton",
  "Portsmouth", "Brighton", "Hull", "Cardiff", "Swansea", "Glasgow",
  "Edinburgh", "Belfast", "London",
];
