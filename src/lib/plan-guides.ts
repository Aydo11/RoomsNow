import { BOOST_PACKAGES } from "./boost-packages";
import { money } from "./format";
import { PLAN_WAS_PRICE } from "./plan-offer";
import { SERVICE_PLANS, SERVICE_TRIAL_DAYS } from "./service-marketplace";
import { MAX_SPONSORED_PER_COMPANY, SPONSOR_PACKAGES } from "./sponsor-packages";
import { WHATSAPP_ADDON_PRICE } from "./whatsapp-access";

/**
 * Everything the pricing page, its demos and its PDF guides say about each plan
 * and paid extra, in one place so the three never disagree. Limits mirror
 * ensureProviderMembershipCatalogue (billing.ts); monthly prices are passed in
 * from the live catalogue because admins can change them.
 */

export const PLAN_GUIDE_KEYS = ["FREE", "PROFESSIONAL", "BUSINESS", "BOOST", "SPONSORED", "WHATSAPP", "REFERRER_PRO", "SERVICES"] as const;
export type PlanGuideKey = (typeof PLAN_GUIDE_KEYS)[number];

/** Live monthly prices in pence, by membership tier. */
export type PlanPrices = Partial<Record<string, number>>;

export type PlanGuide = {
  slug: string;
  name: string;
  group: "Provider plans" | "Paid extras" | "Referral agencies" | "Trades & suppliers";
  headline: string;
  whoFor: string;
  /** What you get, in depth. */
  details: { title: string; body: string }[];
  /** A short "how to use it" tutorial. */
  steps: string[];
  demo: { title: string; endLine: string; captions: string[] };
};

const days = (k: keyof typeof SPONSOR_PACKAGES) => SPONSOR_PACKAGES[k].days;

export const PLAN_GUIDES: Record<PlanGuideKey, PlanGuide> = {
  FREE: {
    slug: "free-plan",
    name: "Free",
    group: "Provider plans",
    headline: "Advertise your first rooms at no cost",
    whoFor: "New providers who want to see how RoomsNow works before paying anything.",
    details: [
      { title: "2 live adverts, up to 10 rooms", body: "List two properties with their rooms, rents, support level and who each room suits. Seekers and referrers can find and message you straight away." },
      { title: "8 photos per advert", body: "Show bedrooms, shared spaces and outside areas so people know what to expect before a viewing." },
      { title: "2 staff accounts", body: "Give a colleague their own login so enquiries don't sit in one person's inbox." },
      { title: "Messages, viewings and referrals", body: "Every enquiry, viewing request and referral arrives in one inbox, with email alerts." },
      { title: "Boosts and sponsored adverts", body: "Free providers can still buy a boost or a sponsored placement when a room needs filling fast." },
    ],
    steps: ["Create your provider account", "Add your company details", "Build your first advert and rooms", "Submit it for a quick check, then go live"],
    demo: { title: "The Free plan", endLine: "Start free, upgrade when you're ready", captions: ["Create your advert in minutes", "Add rooms, rent and photos", "Your advert goes live after a quick check", "Enquiries arrive in one inbox"] },
  },
  PROFESSIONAL: {
    slug: "professional-plan",
    name: "Professional",
    group: "Provider plans",
    headline: "More adverts, video, analytics and free promotion every month",
    whoFor: "Growing providers with several properties who want steady enquiries and to fill voids faster.",
    details: [
      { title: "6 live adverts, unlimited rooms", body: "Advertise up to six properties with as many rooms as you have. Keep each room's status and rent up to date." },
      { title: "20 photos and video uploads", body: "Add a walk-through video and up to 20 photos per advert. Video adverts help people decide before they book a viewing." },
      { title: "Photo and video stories on search", body: "Post 24-hour stories that appear on search, like a new room ready or a fresh redecoration." },
      { title: "Advert analytics", body: "See views per advert, your enquiry rate, occupancy, and requests and referrals by stage, with 12 weeks of enquiry activity." },
      { title: "3 boosts every billing period", body: "Three included 24-hour boosts each month, on top of any you buy. Each boosted advert leads search for its first three hours." },
      { title: "A free 7-day sponsored placement", body: "One sponsored placement running at a time at no extra cost. Start a new one when the last ends." },
      { title: "8 staff accounts and public location maps", body: "Bring your team on board and show where your property is on a public map." },
      { title: "WhatsApp enquiry button add-on", body: `Add a WhatsApp button to your adverts for ${money(WHATSAPP_ADDON_PRICE)} a month, so people can message you on the app they already use.` },
    ],
    steps: ["Choose Professional on the Membership page", "Pay securely by card through Stripe", "Your new limits apply straight away", "Use your included boosts and sponsored slot from My adverts"],
    demo: { title: "The Professional plan", endLine: "Video, analytics, boosts and sponsorship", captions: ["Add video and up to 20 photos", "Post a story that shows on search", "See which adverts get enquiries", "Use your 3 included boosts"] },
  },
  BUSINESS: {
    slug: "business-plan",
    name: "Business",
    group: "Provider plans",
    headline: "Priority placement, WhatsApp included and room for a whole team",
    whoFor: "Larger portfolios and teams who want their adverts seen first and every enquiry route open.",
    details: [
      { title: "12 live adverts, unlimited rooms", body: "Advertise a bigger portfolio, with 40 photos and video on every advert." },
      { title: "Priority placement in search", body: "Your adverts sit higher in matching search results, every day, with no extra spend." },
      { title: "WhatsApp enquiry button included", body: `No ${money(WHATSAPP_ADDON_PRICE)} add-on to pay. People can message you on WhatsApp straight from your advert.` },
      { title: "2 free 7-day sponsored placements", body: "Two sponsored placements running at a time, included in the plan." },
      { title: "25 staff accounts", body: "Give every housing officer and manager their own login, with enquiries shared across the company." },
      { title: "Analytics and priority support", body: "Everything in Professional's analytics, plus faster answers from the RoomsNow team when you need help." },
      { title: "1 included boost every billing period", body: "A 24-hour boost to push a room that needs filling today." },
    ],
    steps: ["Choose Business on the Membership page", "Pay securely by card through Stripe", "Turn on the WhatsApp button for your adverts", "Invite your team and start your two sponsored placements"],
    demo: { title: "The Business plan", endLine: "Seen first, with every enquiry route open", captions: ["Your adverts rise up the results", "People message you on WhatsApp", "Two sponsored placements included", "Your whole team shares the inbox"] },
  },
  BOOST: {
    slug: "boosts",
    name: "24-hour boosts",
    group: "Paid extras",
    headline: "Put one advert at the top of search for a day",
    whoFor: "Any provider with a room to fill quickly, on any plan.",
    details: [
      { title: "Leads search for the first 3 hours", body: "As soon as you activate it, the advert jumps to the top of matching results and stays there for three hours." },
      { title: "Then rotates hourly for the rest of the day", body: "After the first three hours it shares the top positions with other boosted adverts, moving round every hour so nobody owns the first slot all day." },
      { title: "A real countdown, then it ends by itself", body: "You can see exactly how long is left. After 24 hours it stops automatically, with nothing to cancel." },
      { title: "Credits never expire", body: `Buy 1 for ${money(BOOST_PACKAGES.SINGLE.amount)}, 3 for ${money(BOOST_PACKAGES.THREE.amount)} or 10 for ${money(BOOST_PACKAGES.TEN.amount)} and use them on any live advert, whenever you need them.` },
      { title: "Included with paid plans", body: "Professional includes 3 boosts and Business 1 boost every billing period, on top of any credits you buy." },
    ],
    steps: ["Go to My adverts", "Press Boost on the advert you want to fill", "Confirm, and use an included boost or a credit", "Watch the countdown and the enquiries"],
    demo: { title: "Boost an advert", endLine: "Top of search in one tap", captions: ["Press Boost on any live advert", "Your advert jumps to the top", "It leads for 3 hours, then rotates", "More views, more enquiries"] },
  },
  SPONSORED: {
    slug: "sponsored",
    name: "Sponsored adverts",
    group: "Paid extras",
    headline: "A reserved spot at the top of first-page searches, for days or months",
    whoFor: "Providers who want an advert in front of people for longer than a boost, at a fixed one-off price.",
    details: [
      { title: "Its own sponsored section", body: "Your advert appears in the labelled sponsored section at the top of the first page of matching searches. Active placements never drop into the free-advert list." },
      { title: "A highlighted map pin", body: "On the map view your advert gets a highlighted pin, so it stands out when people search by area." },
      { title: "Only shown to the right people", body: "A sponsored advert only appears when it matches the person's filters, so you pay for relevant views." },
      { title: "Always labelled Sponsored", body: "It's clearly marked, including on the map. Sponsorship never affects verification, moderation or ordinary ranking." },
      { title: "One-off payment, no subscription", body: `${days("WEEK")} days ${money(SPONSOR_PACKAGES.WEEK.amount)}, ${days("MONTH")} days ${money(SPONSOR_PACKAGES.MONTH.amount)}, ${days("QUARTER")} days ${money(SPONSOR_PACKAGES.QUARTER.amount)}. Every duration gets the same placement. Up to ${MAX_SPONSORED_PER_COMPANY} of your adverts can be sponsored at once.` },
      { title: "Free placements with paid plans", body: "Professional includes one 7-day placement and Business two, running at a time." },
    ],
    steps: ["Go to My adverts", "Press Sponsor on the advert", "Pick 7, 30 or 90 days", "Pay once through Stripe and it goes live straight away"],
    demo: { title: "Sponsor an advert", endLine: "Seen first, clearly labelled", captions: ["Choose an advert and a duration", "It sits in the sponsored section", "Highlighted on the map", "Only shown to matching searches"] },
  },
  WHATSAPP: {
    slug: "whatsapp-button",
    name: "WhatsApp enquiry button",
    group: "Paid extras",
    headline: "Let people message you on WhatsApp straight from your advert",
    whoFor: "Providers who answer enquiries from their phone and want fewer missed messages.",
    details: [
      { title: "A green WhatsApp button on every advert", body: "People tap it and a WhatsApp chat opens with a message about the advert already written." },
      { title: "Included in Business", body: `Business members get it as standard. On Professional it's a ${money(WHATSAPP_ADDON_PRICE)} a month add-on, cancel any time.` },
      { title: "Every tap is logged", body: "Taps are counted in your advert stats, so you can see which adverts people message about." },
      { title: "For verified providers", body: "The button only shows once your company is verified, so people know who they're messaging." },
    ],
    steps: ["Open Membership", "Add the WhatsApp button (or upgrade to Business)", "Add your WhatsApp number in Settings", "The button appears on your live adverts"],
    demo: { title: "The WhatsApp button", endLine: "Enquiries on the app people already use", captions: ["Someone finds your advert", "They tap WhatsApp", "The chat opens, message ready", "You reply from your phone"] },
  },
  REFERRER_PRO: {
    slug: "referrer-pro",
    name: "Referrer Pro",
    group: "Referral agencies",
    headline: "Unlimited clients and share each profile with every provider you're approaching",
    whoFor: "Referral agencies, support workers and housing officers placing people every week.",
    details: [
      { title: "Unlimited active clients", body: "Save everyone you support once, with their needs and preferences, instead of retyping them for each referral. Free covers 5 clients." },
      { title: "Share with unlimited providers", body: "Send one client profile to as many providers as you're approaching at once. Free allows one at a time." },
      { title: "Priority routing badge", body: "Your referrals carry a Pro badge so providers can see they come from a professional referrer." },
      { title: "Invoices and easy cancellation", body: "Secure subscription checkout, payment history, invoices and cancellation in your account." },
    ],
    steps: ["Create a referrer account", "Choose Pro in Referral membership", "Add your clients once", "Refer them to adverts or share with several providers"],
    demo: { title: "Referrer Pro", endLine: "Place people faster", captions: ["Save each client once", "Find adverts that fit", "Share with several providers at once", "Track every referral's progress"] },
  },
  SERVICES: {
    slug: "trades-plans",
    name: "Trades & suppliers",
    group: "Trades & suppliers",
    headline: "Advertise your trade to the providers who need it",
    whoFor: "Gas and electrical engineers, cleaners, furniture suppliers and other trades that work with housing providers.",
    details: [
      { title: "Marketplace Free", body: `${SERVICE_PLANS.FREE.features.slice(0, 4).join(", ")}.` },
      { title: `Marketplace Standard, ${money(SERVICE_PLANS.STANDARD.monthly)} a month`, body: `${SERVICE_PLANS.STANDARD.features.join(", ")}.` },
      { title: `Marketplace Pro, ${money(SERVICE_PLANS.PRO.monthly)} a month`, body: `${SERVICE_PLANS.PRO.features.join(", ")}.` },
      { title: `${SERVICE_TRIAL_DAYS}-day free trial`, body: "New businesses can try Standard or Pro free before the first payment." },
      { title: "Checked before going live", body: "Every business and advert is checked by the RoomsNow team before it's shown to providers." },
    ],
    steps: ["Register as a trade or supplier", "Choose a plan and start your free trial", "Create your service adverts and areas", "Answer messages and quote requests from providers"],
    demo: { title: "Trades & suppliers", endLine: "Win work from housing providers", captions: ["Create your business profile", "Advertise your services by area", "Providers send quote requests", "Track leads and enquiries"] },
  },
};

export const planGuideBySlug = (slug: string) => PLAN_GUIDE_KEYS.find((k) => PLAN_GUIDES[k].slug === slug);
export const planPdfPath = (key: PlanGuideKey | "ALL") => `/pricing/guide/${key === "ALL" ? "all" : PLAN_GUIDES[key].slug}`;
export const planDemoPath = (key: PlanGuideKey) => `/demos/${PLAN_GUIDES[key].slug}`;

/** Price lines for a guide, from the live catalogue and the fixed extras. */
export function guidePrices(key: PlanGuideKey, prices: PlanPrices): { label: string; price: string; note?: string; was?: string }[] {
  const plan = (tier: string, label: string) => {
    const p = prices[tier] ?? 0;
    const was = PLAN_WAS_PRICE[tier] && PLAN_WAS_PRICE[tier] > p ? money(PLAN_WAS_PRICE[tier]) : undefined;
    return { label, price: p ? `${money(p)} a month` : "Free", was, note: was ? `Limited-time offer, save ${money(PLAN_WAS_PRICE[tier] - p)} a month` : undefined };
  };
  switch (key) {
    case "FREE": return [plan("FREE", "Free plan")];
    case "PROFESSIONAL": return [plan("PROFESSIONAL", "Professional")];
    case "BUSINESS": return [plan("BUSINESS", "Business")];
    case "BOOST": return Object.values(BOOST_PACKAGES).map((b) => ({ label: b.label, price: money(b.amount), note: `${money(Math.round(b.amount / b.credits))} per boost` }));
    case "SPONSORED": return Object.values(SPONSOR_PACKAGES).map((s) => ({ label: s.label, price: money(s.amount), note: `${money(Math.round(s.amount / s.days))} a day` }));
    case "WHATSAPP": return [{ label: "Professional add-on", price: `${money(WHATSAPP_ADDON_PRICE)} a month` }, { label: "Business", price: "Included" }];
    case "REFERRER_PRO": return [plan("REFERRER_FREE", "Referrer Free"), plan("REFERRER_PRO", "Referrer Pro")];
    case "SERVICES": return Object.values(SERVICE_PLANS).map((s) => ({ label: s.name, price: s.monthly ? `${money(s.monthly)} a month` : "Free", note: s.monthly ? `${SERVICE_TRIAL_DAYS}-day free trial` : undefined }));
  }
}

/** The current sale, worked out from the live prices. Empty when no offer is running. */
export function saleLines(prices: PlanPrices) {
  return (["PROFESSIONAL", "BUSINESS"] as const)
    .map((tier) => ({ tier, now: prices[tier] ?? 0, was: PLAN_WAS_PRICE[tier] ?? 0 }))
    .filter((s) => s.now > 0 && s.was > s.now)
    .map((s) => ({ ...s, name: PLAN_GUIDES[s.tier].name, monthly: s.was - s.now, yearly: (s.was - s.now) * 12, percent: Math.round(((s.was - s.now) / s.was) * 100) }));
}
