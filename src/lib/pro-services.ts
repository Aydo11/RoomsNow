/**
 * Pro Services: paid extras for provider members (CRM, bespoke CRM builds,
 * websites and expert sessions). Copy drafted with ChatGPT; prices are
 * plus VAT and stored in pence.
 */

export type ProPrice = { label: string; price: string; detail: string; popular?: boolean; includes?: string[]; suits?: string };
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
    name: "Staff CRM",
    headline: "Run your staff, training, visits and timesheets in one place",
    helps: "Based on the staff system we use to run our own supported accommodation. Keep every staff record, DBS and training date in one place, plan property visits and tasks, and see hours worked without chasing spreadsheets.",
    outcomes: [
      "Staff records, right to work, DBS and training with reminders before anything expires.",
      "Plan property visits and tasks, assign them to staff and see what's overdue.",
      "Visits logged and timesheets totalled, ready for payroll and your evidence files.",
    ],
    prices: [
      { label: "Starter", price: "£59/month", detail: "Up to 5 properties and 5 staff. Staff records, DBS and training reminders, visits, tasks and timesheets." },
      { label: "Growth", price: "£119/month", detail: "Up to 20 properties and 15 staff. Adds supervision notes, team reports, bulk staff import and one onboarding call.", popular: true },
      { label: "Portfolio", price: "£229/month", detail: "Up to 50 properties and 35 staff. Adds two onboarding calls and priority support. Larger portfolios quoted." },
      { label: "Assisted onboarding", price: "£199 one-off", detail: "Optional. We import your staff and property records and set up your roles." },
    ],
    terms: "Monthly, no setup fee. Your records stay available to export if you change plan.",
    nextSteps: [
      "Reply with how many staff and properties you have.",
      "Tell us how you track staff, training and timesheets today, and whether you'd like assisted onboarding for £199 plus VAT.",
      "We'll confirm the plan, monthly cost and how to get started.",
    ],
  },
  BESPOKE_CRM: {
    key: "BESPOKE_CRM",
    name: "Bespoke CRM build",
    headline: "Configure a CRM around how your team works",
    helps: "If your supported accommodation or HMO business runs across several spreadsheets or systems, we can configure the RoomsNow Staff CRM around your day-to-day processes. For more complex needs, we'll agree which workflows, reports or integrations to build before work starts.",
    outcomes: [
      "Bring agreed workflows, such as property checks or task approvals, into one system.",
      "Give staff access based on their roles and agree which existing records to import.",
      "Know the full cost up front, with a written scope and acceptance checks.",
    ],
    prices: [
      { label: "Configured CRM", price: "From £1,000 + £250/month", detail: "Built on the RoomsNow Staff CRM. Your branded workspace, agreed roles, one standard import and up to two configured workflows. 3-month maintenance minimum.", popular: true },
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
      { label: "Brochure site", price: "From £1,500", detail: "Around five pages: home, accommodation, who we support, about and contact.", popular: true },
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
    headline: "Speak 1:1 with a manager who runs housing like yours",
    helps: "RoomsNow managers have operated supported exempt accommodation and HMOs. Talk through setup, compliance, licensing readiness, Housing Benefit evidence, commissioning or safeguarding procedures, by WhatsApp call, video or message.",
    outcomes: [
      "Get advice the way that suits you: a one-off call, weekly catch-ups or a daily WhatsApp line.",
      "Leave every call with written action notes: priorities, who's responsible and follow-up.",
      "See each manager's hourly rate up front. Business members get 10% off.",
    ],
    prices: [
      {
        label: "One-off 1:1 consultation",
        price: "From £150",
        detail: "One 60-minute video or WhatsApp call on one main topic.",
        includes: ["60-minute video or WhatsApp call", "Written action notes within 2 working days", "Review of one document (up to 5 pages) sent 2 working days before"],
        suits: "Working through one issue or deciding what to do next.",
      },
      {
        label: "Weekly catch-ups",
        price: "£525/month",
        detail: "Four 45-minute calls a month with the same manager.",
        includes: ["4 × 45-minute video or WhatsApp calls a month", "Action notes after every call", "Up to 2 document reviews a month (5 pages each)", "Booking messages answered within 1 working day"],
        suits: "A setup, compliance or improvement plan you want to keep moving.",
        popular: true,
      },
      {
        label: "Daily WhatsApp advice",
        price: "£595/month",
        detail: "Written advice on WhatsApp, Monday to Friday, 9am to 5pm.",
        includes: ["One new question each working day", "Replies within 1 working day", "Key actions confirmed in writing, plus a weekly summary", "1 document review a month (5 pages)"],
        suits: "Managers who need quick answers between meetings.",
      },
      {
        label: "Mentoring plan",
        price: "£995/month",
        detail: "Weekly calls and the daily WhatsApp line with one manager.",
        includes: ["4 × 60-minute calls a month", "Daily WhatsApp advice line", "Action notes after every call", "Up to 4 document reviews a month", "Up to 2 named contacts"],
        suits: "Opening a new service or making several changes at once.",
      },
    ],
    terms: "Plans are monthly; unused calls and reviews end with the billing month. One-off sessions are paid at booking: cancel 48 hours or more before for a full refund, 24 to 48 hours for 50%, under 24 hours no refund. Calls aren't recorded. WhatsApp plans are for routine advice: use your safeguarding or emergency procedures for urgent concerns. Advice is guidance: decisions on licences, exempt status, benefit or contracts rest with the council or body concerned.",
    nextSteps: [
      "Reply with the topic, where you operate and which option suits you: one-off call, weekly catch-ups, daily WhatsApp advice or mentoring.",
      "We'll send suitable managers, available times and the total price.",
      "Pay to confirm and we'll set up your first call or WhatsApp line.",
    ],
  },
};

/** What happens in an expert session, in order. */
export const SESSION_STEPS = [
  { title: "Tell us what you need", body: "Share your question and any agreed documents in advance, with resident details removed." },
  { title: "Talk it through", body: "Your manager asks how your service works now and where you're stuck." },
  { title: "Agree the next steps", body: "Work through the options and what needs checking with a council, regulator or specialist." },
  { title: "Get written action notes", body: "A short summary of priorities, who's responsible and any follow-up." },
];

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

export const EXPERT_PLANS = PRO_SERVICES.EXPERT.prices.map((p) => p.label);

export const ENQUIRY_STATUSES = ["NEW", "CONTACTED", "WON", "LOST"] as const;
export const isEnquiryStatus = (v: unknown): v is (typeof ENQUIRY_STATUSES)[number] => typeof v === "string" && (ENQUIRY_STATUSES as readonly string[]).includes(v);

export const packSubject = (service: ProService, reference: string) => `${service.name}: your RoomsNow Pro Services pack [${reference}]`;

/* ---------- Calls and meetings ---------- */

export const MEETING_TYPES = { PHONE: "Phone or WhatsApp call", VIDEO: "Video call", IN_PERSON: "Meeting in person" } as const;
export type MeetingType = keyof typeof MEETING_TYPES;
export const isMeetingType = (v: unknown): v is MeetingType => typeof v === "string" && Object.hasOwn(MEETING_TYPES, v);
export const TIME_WINDOWS = ["Morning (9am to 12pm)", "Afternoon (12pm to 3pm)", "Late afternoon (3pm to 5pm)"] as const;

const DAY = 86_400_000;
const londonDay = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(d);

/** "2026-11-18" + a time window → "Wed 18 Nov, Morning (9am to 12pm)". Weekdays from tomorrow up to 60 days ahead only. */
export function meetingWish(date: string, window: string, now = new Date()): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !(TIME_WINDOWS as readonly string[]).includes(window)) return null;
  const day = new Date(`${date}T12:00:00Z`);
  if (Number.isNaN(day.getTime()) || day.toISOString().slice(0, 10) !== date) return null;
  if (date <= londonDay(now) || date > londonDay(new Date(now.getTime() + 60 * DAY))) return null;
  if (day.getUTCDay() === 0 || day.getUTCDay() === 6) return null;
  const label = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(day);
  return `${label}, ${window}`;
}

/** A UK wall-clock time from a datetime-local input ("2026-11-18T10:30") as a real instant, allowing for BST. */
export function londonTime(local: string): Date | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local);
  if (!m) return undefined;
  const [y, mo, d, h, mi] = m.slice(1).map(Number);
  const asUtc = Date.UTC(y, mo - 1, d, h, mi);
  // London is UTC or UTC+1; find the offset that maps back to the same wall-clock time.
  for (const offset of [0, 60]) {
    const guess = new Date(asUtc - offset * 60_000);
    const shown = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(guess);
    if (shown === `${m[3]}/${m[2]}/${m[1]}, ${m[4]}:${m[5]}`) return guess;
  }
  return undefined;
}

export const ukMeetingTime = (d: Date) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit" }).format(d);

/** "Add to Google Calendar" link for a confirmed meeting. */
export function calendarLink(title: string, start: Date, minutes: number, details: string) {
  const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const end = new Date(start.getTime() + minutes * 60_000);
  const q = new URLSearchParams({ action: "TEMPLATE", text: title, dates: `${stamp(start)}/${stamp(end)}`, details, ctz: "Europe/London" });
  return `https://calendar.google.com/calendar/render?${q}`;
}

/** Demo video storyboards (written with ChatGPT). The animation for each scene lives in components/pro-demo.tsx. */
export const DEMO_STORIES: Record<ProServiceKey, { title: string; endTitle: string; endLine: string; captions: string[] }> = {
  CRM: { title: "Staff CRM", endTitle: "RoomsNow Staff CRM", endLine: "Staff, training, visits and timesheets", captions: ["See your whole team at a glance", "Spot DBS and training coming due", "Plan visits and assign tasks", "Log the visit, timesheet done"] },
  BESPOKE_CRM: { title: "Bespoke CRM build", endTitle: "Bespoke CRM", endLine: "Built around your workflows", captions: ["Start with your existing checklist", "Turn each row into a task", "Send completed checks for approval", "See what still needs action"] },
  WEBSITE: { title: "Website for your housing service", endTitle: "Provider websites", endLine: "Give referrers a clear route", captions: ["Show what accommodation you offer", "Explain who can make a referral", "Give enquiries a clear route", "See the enquiry come through"] },
  EXPERT: { title: "Expert sessions", endTitle: "RoomsNow Expert Sessions", endLine: "Calls, advice and catch-ups", captions: ["Talk through a question on WhatsApp", "Work through a checklist on video", "Send a question between sessions", "Review progress at your weekly catch-up"] },
};
export const DEMO_SLUG: Record<ProServiceKey, string> = { CRM: "crm", BESPOKE_CRM: "bespoke-crm", WEBSITE: "website", EXPERT: "expert-sessions" };
