/**
 * Pro Services: paid extras for provider members (CRM, bespoke CRM builds,
 * websites and expert sessions). Copy drafted with ChatGPT; prices are
 * plus VAT and stored in pence.
 */

export type ProPrice = { label: string; price: string; detail: string };
export type ProService = {
  key: ProServiceKey;
  name: string;
  headline: string;
  helps: string;
  outcomes: string[];
  prices: ProPrice[];
  terms: string;
  nextSteps: string[];
};

export const PRO_SERVICE_KEYS = ["CRM", "BESPOKE_CRM", "WEBSITE", "EXPERT"] as const;
export type ProServiceKey = (typeof PRO_SERVICE_KEYS)[number];
export const isProServiceKey = (v: unknown): v is ProServiceKey => typeof v === "string" && (PRO_SERVICE_KEYS as readonly string[]).includes(v);

export const PRO_SERVICES: Record<ProServiceKey, ProService> = {
  CRM: {
    key: "CRM",
    name: "RoomsNow CRM",
    headline: "Manage properties, staff, tasks and compliance in one place",
    helps: "Give your supported accommodation or HMO team one place to check what needs doing, who's responsible and when it's due. Use the same records to prepare for reviews and hand over work between staff.",
    outcomes: [
      "Keep property records, staff responsibilities and compliance deadlines together.",
      "Assign tasks and see what's overdue across your portfolio.",
      "Pick the capacity your team needs and move up as you grow.",
    ],
    prices: [
      { label: "Starter", price: "£59/month", detail: "Up to 5 properties and 5 staff accounts. Property records, staff roles, tasks, compliance reminders and exports." },
      { label: "Growth", price: "£119/month", detail: "Up to 20 properties and 15 staff. Adds portfolio reporting, bulk import and one onboarding call." },
      { label: "Portfolio", price: "£229/month", detail: "Up to 50 properties and 35 staff. Adds two onboarding calls and priority support. Larger portfolios quoted." },
      { label: "Assisted onboarding", price: "£199 one-off", detail: "Optional. We import your records from our template and set up your team." },
    ],
    terms: "Monthly, no setup fee. Your records stay available to export if you change plan.",
    nextSteps: [
      "Reply with the number of properties and staff accounts you need.",
      "Tell us how you manage your records today and whether you'd like assisted onboarding for £199 plus VAT.",
      "We'll confirm the plan, monthly cost and how to get started.",
    ],
  },
  BESPOKE_CRM: {
    key: "BESPOKE_CRM",
    name: "Bespoke CRM build",
    headline: "Configure a CRM around how your team works",
    helps: "If your supported accommodation or HMO business runs across several spreadsheets or systems, we can configure the RoomsNow CRM around your day-to-day processes. For more complex needs, we'll agree which workflows, reports or integrations to build before work starts.",
    outcomes: [
      "Bring agreed workflows, such as property checks or task approvals, into one system.",
      "Give staff access based on their roles and agree which existing records to import.",
      "Know the full cost up front, with a written scope and acceptance checks.",
    ],
    prices: [
      { label: "Configured CRM", price: "From £1,000 + £250/month", detail: "Built on the RoomsNow CRM. Your branded workspace, agreed roles, one standard import and up to two configured workflows. 3-month maintenance minimum." },
      { label: "Custom CRM", price: "From £3,000 + £400/month", detail: "Agreed custom workflows, reports or integrations, with a written specification and acceptance tests. Major integrations quoted separately." },
    ],
    terms: "Build fee paid in three stages: 50% at kickoff, 30% when you approve the test version and 20% before go-live. Maintenance covers hosting, backups, security updates and fault fixes.",
    nextSteps: [
      "Reply with the processes you want to improve and the systems you use today.",
      "We'll agree the scope, timeline and what monthly maintenance covers.",
      "If you accept the quote, the build fee is paid in three stages: 50% at kickoff, 30% on approval of the test version and 20% before launch.",
    ],
  },
  WEBSITE: {
    key: "WEBSITE",
    name: "Website for your housing service",
    headline: "Give tenants and referrers a clear route to your service",
    helps: "A clear website helps people understand what accommodation you provide, where you operate and how to get in touch. For supported accommodation it can explain who your service is for and how referrals work; for HMOs it shows people how to enquire about a room.",
    outcomes: [
      "Explain your accommodation, locations and services on a mobile-friendly site.",
      "Give tenants, professionals and partner organisations a clear enquiry or referral route.",
      "Keep it up to date with hosting or managed care from the same team.",
    ],
    prices: [
      { label: "Single page", price: "£499", detail: "One well-built page with your services, areas and contact route." },
      { label: "Brochure site", price: "From £1,500", detail: "Around five pages: home, accommodation, who we support, about and contact." },
      { label: "Business site", price: "From £3,000", detail: "More pages, referral routes and features agreed in a written scope." },
      { label: "Hosting", price: "£59/month", detail: "Hosting, security updates and backups." },
      { label: "Managed care", price: "£129/month", detail: "Hosting plus up to one hour of content edits each month." },
    ],
    terms: "50% to book and 50% before launch. The quote states what's included, such as copywriting, domain and photography.",
    nextSteps: [
      "Reply with your current website, if you have one, and what you want the new site to do.",
      "We'll confirm the pages, features, timeline and any ongoing costs in writing.",
      "If you accept the quote, pay 50% to book the work and 50% before launch.",
    ],
  },
  EXPERT: {
    key: "EXPERT",
    name: "Expert sessions",
    headline: "Book time with a RoomsNow housing manager",
    helps: "Talk through a practical question about running or setting up supported accommodation or HMOs. Sessions can cover compliance, licensing readiness, Housing Benefit evidence, commissioning or safeguarding, depending on the manager's expertise.",
    outcomes: [
      "Choose a one-hour, two-hour or half-day session with a manager who covers your topic.",
      "Leave with a written action summary covering what to check and what to do next.",
      "See the manager's hourly rate before booking. Business members get 10% off.",
    ],
    prices: [],
    terms: "Paid in full at booking. Cancel 48 hours or more before for a full refund, 24 to 48 hours before for 50%, under 24 hours no refund. Sessions are not recorded. Advice is guidance: decisions on licences, exempt status, benefit or contracts rest with the council or body concerned.",
    nextSteps: [
      "Reply with the topic, where you operate and what you want to get out of the session.",
      "We'll send suitable managers, available times and the total price for your chosen session length.",
      "Pay upfront to confirm. Cancel at least 48 hours before the session for a full refund, 24 to under 48 hours before for a 50% refund, or under 24 hours before with no refund.",
    ],
  },
};

/** Session lengths offered for expert time. A half day is 4 hours. */
export const SESSION_HOURS = [1, 2, 4] as const;
export const sessionLabel = (hours: number) => (hours === 4 ? "Half day (4 hours)" : hours === 1 ? "1 hour" : `${hours} hours`);
export const BUSINESS_SESSION_DISCOUNT = 0.1;

/** Price in pence for a session, with the Business member discount applied. */
export function sessionPrice(hourlyRate: number, hours: number, business = false) {
  const full = hourlyRate * hours;
  return business ? Math.round(full * (1 - BUSINESS_SESSION_DISCOUNT)) : full;
}

/** Pro Services are a perk of paid provider memberships. */
export const canUseProServices = (tier: string) => tier === "PROFESSIONAL" || tier === "BUSINESS";

export const ENQUIRY_STATUSES = ["NEW", "CONTACTED", "WON", "LOST"] as const;
export const isEnquiryStatus = (v: unknown): v is (typeof ENQUIRY_STATUSES)[number] => typeof v === "string" && (ENQUIRY_STATUSES as readonly string[]).includes(v);

export const packSubject = (service: ProService, reference: string) => `${service.name}: your RoomsNow Pro Services pack [${reference}]`;
