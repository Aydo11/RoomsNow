/**
 * Support services directory: categories, audiences and the starting set of
 * services (national helplines plus key Birmingham services).
 *
 * Seed details were checked against each organisation's own website in
 * September 2026. Records carry a `seedKey`, so re-seeding updates them in
 * place instead of creating duplicates, and admins can edit them afterwards.
 */

export const SUPPORT_CATEGORIES = [
  { slug: "crisis", label: "Urgent and crisis help" },
  { slug: "mental-health", label: "Mental health" },
  { slug: "drugs-alcohol", label: "Drugs and alcohol" },
  { slug: "homelessness", label: "Homelessness and housing" },
  { slug: "domestic-abuse", label: "Domestic abuse" },
  { slug: "money-benefits", label: "Money, benefits and advice" },
  { slug: "young-people", label: "Young people" },
  { slug: "health-wellbeing", label: "Health and wellbeing" },
  { slug: "training", label: "Training and education" },
] as const;

export type SupportCategory = (typeof SUPPORT_CATEGORIES)[number]["slug"];

export function supportCategoryLabel(slug: string) {
  return SUPPORT_CATEGORIES.find((category) => category.slug === slug)?.label ?? slug;
}

export function isSupportCategory(value: string | undefined): value is SupportCategory {
  return Boolean(value && SUPPORT_CATEGORIES.some((category) => category.slug === value));
}

export const SUPPORT_POST_KINDS = {
  EVENT: "Event",
  TRAINING: "Training",
  ANNOUNCEMENT: "News",
  SERVICE_UPDATE: "Service update",
} as const;
export type SupportPostKindValue = keyof typeof SUPPORT_POST_KINDS;

export const SUPPORT_AUDIENCES = {
  everyone: "Everyone",
  residents: "People looking for help",
  providers: "Providers and staff",
} as const;
export type SupportAudience = keyof typeof SUPPORT_AUDIENCES;

export function isSupportAudience(value: string | undefined): value is SupportAudience {
  return value === "everyone" || value === "residents" || value === "providers";
}

/** Strip a phone number down to something a tel: link can dial. */
export function telHref(phone: string) {
  const digits = phone.replace(/[^\d+]/g, "");
  return `tel:${digits}`;
}

/** Google Maps directions to an address (works on every phone, no key). */
export function directionsHref(address: string) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
}

export function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
}

/** A post stays listed until it ends (events) or for 90 days (news). */
export function postIsCurrent(post: { startsAt: Date | null; endsAt: Date | null; createdAt: Date; removedAt: Date | null }, now = new Date()) {
  if (post.removedAt) return false;
  const until = post.endsAt ?? post.startsAt ?? new Date(post.createdAt.getTime() + 90 * 24 * 60 * 60 * 1000);
  // Events that started today stay up until the end of the day.
  const endOfDay = new Date(until);
  if (!post.endsAt && post.startsAt) endOfDay.setHours(23, 59, 59, 999);
  return endOfDay.getTime() >= now.getTime();
}

type SeedLocation = { name: string; address: string; city: string; postcode: string; hours?: string; phone?: string };

export type SupportSeed = {
  seedKey: string;
  name: string;
  summary: string;
  description?: string;
  categories: SupportCategory[];
  scope: "NATIONAL" | "LOCAL";
  areas?: string[];
  phone?: string;
  phoneNote?: string;
  otherPhones?: string[];
  textNumber?: string;
  email?: string;
  website?: string;
  hours?: string;
  howToAccess?: string;
  crisis?: boolean;
  locations?: SeedLocation[];
};

export const SUPPORT_SEED: SupportSeed[] = [
  // ------------------------------------------------------------ national
  {
    seedKey: "samaritans",
    name: "Samaritans",
    summary: "Talk to someone any time, about anything that's troubling you.",
    categories: ["crisis", "mental-health"],
    scope: "NATIONAL",
    phone: "116 123",
    phoneNote: "Free, 24 hours a day, 365 days a year",
    website: "https://www.samaritans.org",
    hours: "24/7",
    howToAccess: "Call free from any phone. You don't have to be suicidal to call.",
    crisis: true,
  },
  {
    seedKey: "nhs-111-mental-health",
    name: "NHS 111 – urgent mental health help",
    summary: "Urgent mental health support for any age, day or night.",
    categories: ["crisis", "mental-health"],
    scope: "NATIONAL",
    phone: "111",
    phoneNote: "Choose the mental health option. Free, 24/7",
    website: "https://www.nhs.uk/nhs-services/mental-health-services/where-to-get-urgent-help-for-mental-health/",
    hours: "24/7",
    howToAccess: "Call 111 and select the mental health option. If someone's life is at risk, call 999.",
    crisis: true,
  },
  {
    seedKey: "shout",
    name: "Shout",
    summary: "Free, confidential text support if you're struggling to cope.",
    categories: ["crisis", "mental-health"],
    scope: "NATIONAL",
    textNumber: "Text SHOUT to 85258",
    website: "https://giveusashout.org",
    hours: "24/7",
    crisis: true,
  },
  {
    seedKey: "national-domestic-abuse-helpline",
    name: "National Domestic Abuse Helpline",
    summary: "Free, confidential support for anyone experiencing domestic abuse.",
    categories: ["crisis", "domestic-abuse"],
    scope: "NATIONAL",
    phone: "0808 2000 247",
    phoneNote: "Free, 24 hours a day",
    website: "https://www.nationaldahelpline.org.uk",
    hours: "24/7 (BSL support 10am–6pm, Monday to Friday)",
    howToAccess: "Call free and in confidence. In an emergency call 999.",
    crisis: true,
  },
  {
    seedKey: "mind-infoline",
    name: "Mind Infoline",
    summary: "Information on mental health problems, treatment and where to get help.",
    categories: ["mental-health"],
    scope: "NATIONAL",
    phone: "0300 123 3393",
    website: "https://www.mind.org.uk",
    hours: "9am–6pm, Monday to Friday (except bank holidays)",
  },
  {
    seedKey: "calm",
    name: "CALM (Campaign Against Living Miserably)",
    summary: "Helpline and webchat for anyone who's struggling or needs to talk.",
    categories: ["mental-health"],
    scope: "NATIONAL",
    phone: "0800 58 58 58",
    phoneNote: "Free",
    website: "https://www.thecalmzone.net",
    hours: "5pm–midnight, every day",
  },
  {
    seedKey: "saneline",
    name: "SANEline",
    summary: "Emotional support and information for anyone affected by mental illness.",
    categories: ["mental-health"],
    scope: "NATIONAL",
    phone: "0300 304 7000",
    website: "https://www.sane.org.uk",
    hours: "4pm–10pm, every day",
  },
  {
    seedKey: "frank",
    name: "FRANK",
    summary: "Honest, confidential information and advice about drugs.",
    categories: ["drugs-alcohol"],
    scope: "NATIONAL",
    phone: "0300 123 6600",
    phoneNote: "24 hours a day",
    textNumber: "Text 82111",
    website: "https://www.talktofrank.com",
    hours: "24/7",
  },
  {
    seedKey: "shelter",
    name: "Shelter emergency helpline",
    summary: "Free housing advice if you're homeless or at risk of losing your home.",
    categories: ["homelessness", "money-benefits"],
    scope: "NATIONAL",
    phone: "0808 800 4444",
    phoneNote: "Free",
    website: "https://england.shelter.org.uk/get_help/helpline",
    hours: "8am–5pm, Monday to Friday",
  },
  {
    seedKey: "streetlink",
    name: "StreetLink",
    summary: "Tell local services about someone sleeping rough so they can be offered help.",
    categories: ["homelessness"],
    scope: "NATIONAL",
    website: "https://thestreetlink.org.uk",
    howToAccess: "Send an alert online or through the StreetLink app. If someone is in immediate danger, call 999.",
  },
  {
    seedKey: "citizens-advice",
    name: "Citizens Advice (Adviceline)",
    summary: "Free advice on benefits, debt, housing, work and your rights.",
    categories: ["money-benefits"],
    scope: "NATIONAL",
    phone: "0800 144 8848",
    phoneNote: "Free (England)",
    website: "https://www.citizensadvice.org.uk",
    hours: "9am–5pm, Monday to Friday",
  },

  // ------------------------------------------------------------ Birmingham
  {
    seedKey: "bcc-housing-options",
    name: "Birmingham City Council – homelessness and housing options",
    summary: "Help if you're homeless or about to lose your home in Birmingham, including emergency accommodation.",
    categories: ["homelessness", "crisis"],
    scope: "LOCAL",
    areas: ["Birmingham"],
    phone: "0121 303 7410",
    phoneNote: "Choose option 3",
    otherPhones: [
      "Out of hours and weekends (18 and over): 0121 303 2296",
      "Out of hours (17 and under): 0121 675 4806",
    ],
    website: "https://www.birmingham.gov.uk/homeless",
    hours: "9am–5pm, Monday to Friday. Out-of-hours numbers above.",
  },
  {
    seedKey: "st-basils-youth-hub",
    name: "St Basils Youth Hub",
    summary: "Housing help for young people in Birmingham who are homeless or at risk.",
    categories: ["homelessness", "young-people"],
    scope: "LOCAL",
    areas: ["Birmingham"],
    phone: "0300 303 0099",
    website: "https://stbasils.org.uk",
    howToAccess: "For young people aged 16–25 (without children).",
  },
  {
    seedKey: "sifa-fireside",
    name: "SIFA Fireside",
    summary: "Support centre for adults who are homeless or at risk, with emergency help, housing advice and health services.",
    categories: ["homelessness", "health-wellbeing"],
    scope: "LOCAL",
    areas: ["Birmingham"],
    phone: "0121 766 1700",
    phoneNote: "Reception 9am–3pm, Monday to Friday",
    website: "https://sifafireside.co.uk",
    hours: "Emergency and rough sleeper support: 9am–12.45pm, Monday to Friday",
    howToAccess: "Drop in during opening hours.",
    locations: [{ name: "SIFA Fireside", address: "Liverpool Street, Deritend", city: "Birmingham", postcode: "B9 4DY", hours: "Drop-in 9am–12.45pm, Monday to Friday" }],
  },
  {
    seedKey: "crisis-skylight-birmingham",
    name: "Crisis Skylight Birmingham",
    summary: "Support and advice for people who are homeless, including housing, employment and learning.",
    categories: ["homelessness", "training"],
    scope: "LOCAL",
    areas: ["Birmingham"],
    phone: "0121 384 7950",
    website: "https://www.crisis.org.uk",
  },
  {
    seedKey: "birmingham-domestic-abuse-housing",
    name: "Domestic Abuse Homelessness Hub (Birmingham)",
    summary: "Housing help for people in Birmingham who are homeless because of domestic abuse.",
    categories: ["domestic-abuse", "homelessness"],
    scope: "LOCAL",
    areas: ["Birmingham"],
    phone: "0121 464 7297",
    email: "BHMHousingSolutions@cranstoun.org.uk",
    website: "https://www.birmingham.gov.uk/homeless",
  },
  {
    seedKey: "kikit",
    name: "KIKIT Pathways to Recovery",
    summary: "Recovery support for drugs and alcohol, health and wellbeing, especially for people from marginalised communities.",
    description: "A specialist social enterprise providing recovery support across substance misuse, health and wellbeing and community safety.",
    categories: ["drugs-alcohol", "health-wellbeing", "mental-health"],
    scope: "LOCAL",
    areas: ["Birmingham"],
    phone: "0121 448 3883",
    email: "info@kikitproject.org",
    website: "https://kikitproject.org",
    hours: "9am–5pm, Monday to Friday. Phone support Sunday 2pm–5pm.",
    howToAccess: "Call, email or visit the drop-in (10am–4pm).",
    locations: [{ name: "KIKIT Sparkbrook", address: "153 Stratford Road, Sparkbrook", city: "Birmingham", postcode: "B11 1RD", hours: "Drop-in 10am–4pm" }],
  },
  {
    seedKey: "cgl-birmingham",
    name: "Change Grow Live – Birmingham Drug & Alcohol Service",
    summary: "Free, confidential drug and alcohol support across Birmingham, with hubs in the city centre, north, east and south.",
    categories: ["drugs-alcohol", "health-wellbeing"],
    scope: "LOCAL",
    areas: ["Birmingham"],
    phone: "0121 227 5890",
    website: "https://www.changegrowlive.org/service/birmingham-drug-alcohol",
    hours: "9am–5pm, Monday to Friday",
    howToAccess: "Visit a hub during opening hours or call to speak to the team.",
    locations: [
      { name: "North, Central and West hub", address: "40 Newtown Shopping Centre, Newtown", city: "Birmingham", postcode: "B19 2SS" },
      { name: "East hub", address: "111 Church Lane", city: "Birmingham", postcode: "B33 9EJ" },
      { name: "South hub", address: "The Lodge, Woodbrooke, 1046 Bristol Road", city: "Birmingham", postcode: "B29 6LJ" },
      { name: "City Centre hub", address: "Lonsdale House, 52 Blucher Street", city: "Birmingham", postcode: "B1 1QU" },
    ],
  },
  {
    seedKey: "birmingham-mind",
    name: "Birmingham Mind helpline",
    summary: "Mental health support and information for people in Birmingham.",
    categories: ["mental-health"],
    scope: "LOCAL",
    areas: ["Birmingham"],
    phone: "0121 262 3555",
    website: "https://birminghammind.org",
  },
  {
    seedKey: "forward-thinking-birmingham",
    name: "Forward Thinking Birmingham",
    summary: "NHS mental health service for children and young people in Birmingham up to age 25.",
    categories: ["mental-health", "young-people"],
    scope: "LOCAL",
    areas: ["Birmingham"],
    phone: "0300 300 0099",
    website: "https://www.forwardthinkingbirmingham.nhs.uk",
    howToAccess: "For people up to 25, and up to 35 for anyone experiencing psychosis for the first time.",
  },
];
