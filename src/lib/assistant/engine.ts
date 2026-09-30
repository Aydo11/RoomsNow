/**
 * The RoomsNow Help Assistant's decision-making, kept free of I/O so it can be
 * unit tested. The route (src/app/api/assistant/route.ts) feeds it the
 * conversation, the live areas/support types and, on an advert page, the
 * advert's public facts. Anything safety-related or factual about an advert
 * is answered here deterministically; only general "how do I…" questions
 * may go to the language model, and only with approved articles as context.
 */
import {
  ALLOWED_EXTERNAL,
  ALLOWED_LINK_PATHS,
  ALLOWED_LINK_PREFIXES,
  AVAILABILITY_CAVEAT,
  HELP_ARTICLES,
  type AssistantLink,
  type HelpArticle,
} from "./knowledge";

export type ChatMessage = { role: "user" | "assistant"; content: string };

export type SearchDraft = {
  where?: string;
  anywhere?: boolean;
  support?: string[];
  type?: string[];
  maxRent?: number;
  hb?: boolean;
  from?: string;
  resident?: "woman" | "man";
};

export type AssistantState = { search?: SearchDraft; awaiting?: "area" };

export type ReplyKind = "answer" | "search" | "advert" | "safety" | "unknown" | "handoff" | "smalltalk";

export type AssistantReply = {
  kind: ReplyKind;
  text: string;
  links: AssistantLink[];
  suggestions: string[];
  /** Show the "Contact RoomsNow support" option with this reply. */
  handoff?: boolean;
  state?: AssistantState;
  source?: "rules" | "ai";
};

export type AdvertFacts = {
  id: string;
  title: string;
  rentFrom: number | null;
  rentTo: number | null;
  billsIncluded: boolean;
  housingBenefit: boolean;
  availableFrom: string | null;
  roomsAvailable: number;
  city: string;
  area: string | null;
  accommodationType: string;
  supportLabels: string[];
  supportDescription: string | null;
  supportAvailability: string | null;
  eligibility: string | null;
  genderArrangement: string;
  minAge: number | null;
  maxAge: number | null;
  furnished: boolean;
  ensuite: boolean;
  selfContained: boolean;
  wheelchairAccess: boolean;
  petsAllowed: boolean;
  referralProcess: string | null;
  providerName: string;
};

export type SearchContext = { areas: string[]; supportTypes: { slug: string; label: string }[] };

const norm = (text: string) => text.toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, " ").trim();
const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);

// ------------------------------------------------------------------ safety

export type SafetyKind = "danger" | "suicide" | "abuse" | "roofless";

const SUICIDE = /\b(suicid\w*|kill(ing)? myself|end (it all|my life)|take my (own )?life|want to die|self[- ]?harm\w*|hurt(ing)? myself|overdos\w*)\b/;
const DANGER = /\b(in (immediate )?danger|not safe right now|unsafe right now|(being|been) (attacked|assaulted|threatened|followed)|someone is (trying to|outside|hurting)|going to (hurt|kill|attack) me|threaten\w* to (hurt|kill)|life is in danger|call the police|need an ambulance)\b/;
const ABUSE = /\b(domestic (abuse|violence)|abusive (partner|relationship|ex)|fleeing|flee(ing)? (from )?(him|her|my partner)|he hits me|she hits me|beats me|coercive)\b/;
const ROOFLESS = /\b((sleeping|sleep) (rough|on the streets?|outside)|nowhere to (sleep|stay|go) tonight|homeless tonight|on the street tonight|kicked out (today|tonight))\b/;

export function detectSafety(text: string): SafetyKind | null {
  const t = norm(text);
  if (SUICIDE.test(t)) return "suicide";
  if (DANGER.test(t)) return "danger";
  if (ABUSE.test(t)) return "abuse";
  if (ROOFLESS.test(t)) return "roofless";
  return null;
}

export function safetyReply(kind: SafetyKind): AssistantReply {
  const notCrisis = "I'm an automated assistant, so I can't give crisis support, but you don't have to deal with this alone.";
  const base = { kind: "safety" as const, handoff: false, source: "rules" as const };
  if (kind === "suicide") {
    return {
      ...base,
      text: `I'm really sorry you're feeling like this. If you're in immediate danger or might act on these thoughts, please call 999 now. ${notCrisis} You can talk to Samaritans for free, any time, on 116 123.`,
      links: [{ label: "Samaritans", href: "https://www.samaritans.org" }, { label: "Support services", href: "/support-services" }],
      suggestions: [],
    };
  }
  if (kind === "abuse") {
    return {
      ...base,
      text: `If you're in immediate danger, please call 999. If you can't speak, call 999 and press 55 when asked. ${notCrisis} The free, 24-hour National Domestic Abuse Helpline is 0808 2000 247.`,
      links: [{ label: "National Domestic Abuse Helpline", href: "https://www.nationaldahelpline.org.uk" }, { label: "Support services", href: "/support-services" }],
      suggestions: ["Help me search for a room"],
    };
  }
  if (kind === "roofless") {
    return {
      ...base,
      text: `I'm sorry you're in this situation. If you're in danger, call 999. For somewhere to stay tonight, contact your local council's housing or homelessness team, which has out-of-hours help, or Shelter's free helpline on 0808 800 4444. ${notCrisis}`,
      links: [{ label: "Shelter urgent help", href: "https://www.shelter.org.uk" }, { label: "Support services", href: "/support-services" }],
      suggestions: ["Help me search for a room"],
    };
  }
  return {
    ...base,
    text: `If you're in immediate danger, please call 999 now. ${notCrisis} When you're safe, I can help you find support services or search for accommodation.`,
    links: [{ label: "Support services", href: "/support-services" }],
    suggestions: [],
  };
}

// --------------------------------------------------------- sensitive details

const SENSITIVE: Array<[string, RegExp]> = [
  ["National Insurance number", /\b[a-z]{2}\s?\d{2}\s?\d{2}\s?\d{2}\s?[a-d]\b/gi],
  ["card number", /\b(?:\d[ -]?){13,19}\b/g],
  ["bank details", /\b\d{2}-\d{2}-\d{2}\b|\bsort code\b/gi],
  ["date of birth", /\b(date of birth|dob|born on)\b/gi],
  ["password", /\b(my )?password (is|:)/gi],
];

/** Which kinds of sensitive detail a message seems to contain. */
export function findSensitive(text: string): string[] {
  return SENSITIVE.filter(([, pattern]) => {
    pattern.lastIndex = 0;
    return pattern.test(text);
  }).map(([label]) => label);
}

/** Removes numbers that look like ID, card or bank details before anything is processed further. */
export function redact(text: string): string {
  return SENSITIVE.slice(0, 3).reduce((out, [, pattern]) => out.replace(pattern, "[removed]"), text);
}

export const SENSITIVE_NOTE =
  "Please don't share personal details like ID, bank or card numbers, or passwords here. I don't need them, and I've removed what looked like one. ";

// ---------------------------------------------------------------- search

const SUPPORT_SYNONYMS: Array<[string, RegExp]> = [
  ["mental-health", /\bmental health|anxiety|depress|psychiatr|bipolar|schizo/],
  ["homelessness", /\bhomeless/],
  ["substance-misuse", /\bdrugs?\b|alcohol|addiction|recovery|substance|dry house|rehab/],
  ["learning-disability", /\blearning disab|autis/],
  ["physical-disability", /\bphysical disab|wheelchair|mobility/],
  ["young-people", /\byoung (person|people)|16[- ]25|teen|\b1[6-9] year/],
  ["care-leavers", /\bcare leaver|leaving care|left care/],
  ["domestic-abuse", /\bdomestic (abuse|violence)|fleeing/],
  ["ex-offenders", /\bprison|probation|ex[- ]offender|released from|just released|approved premises/],
  ["vulnerable-adults", /\bvulnerable adult/],
];

const TYPE_SYNONYMS: Array<[string, RegExp]> = [
  ["SELF_CONTAINED", /\bself[- ]contained|studio/],
  ["FLAT", /\bflat\b|apartment/],
  ["HOUSE", /\bwhole house|a house\b/],
  ["SHARED_ACCOMMODATION", /\bshared (house|home|accommodation)|\bhmo\b/],
  ["SINGLE_ROOM", /\bsingle room/],
];

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
const isoDate = (date: Date) => date.toISOString().slice(0, 10);

const NOT_PLACES = new Set(["a", "the", "my", "your", "need", "want", "area", "town", "city", "uk", "england", "general", "future", "time", "my area", "the area"]);

function findArea(text: string, areas: string[]): string | undefined {
  const t = norm(text);
  const known = [...areas].sort((a, b) => b.length - a.length).find((area) => new RegExp(`\\b${area.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(t));
  if (known) return known;
  const postcode = text.match(/\b([A-Z]{1,2}\d[A-Z\d]?)(\s*\d[A-Z]{2})?\b/i);
  if (postcode) return postcode[0].toUpperCase().replace(/\s+/g, " ");
  const phrase = text.match(/\b(?:in|near|around|close to)\s+([A-Z][A-Za-z'-]+(?:[ -][A-Z][A-Za-z'-]+){0,2})/);
  if (phrase && !NOT_PLACES.has(phrase[1].toLowerCase())) return phrase[1];
  return undefined;
}

export function extractSearch(text: string, context: SearchContext, today = new Date()): SearchDraft {
  const t = norm(text);
  const draft: SearchDraft = {};
  const where = findArea(text, context.areas);
  if (where) draft.where = where;
  if (/\b(anywhere|any area|anywhere in the uk|don't mind where|dont mind where|not sure where)\b/.test(t)) draft.anywhere = true;

  const known = new Set(context.supportTypes.map((type) => type.slug));
  const support = SUPPORT_SYNONYMS.filter(([slug, pattern]) => known.has(slug) && pattern.test(t)).map(([slug]) => slug);
  if (support.length) draft.support = support;

  const type = TYPE_SYNONYMS.filter(([, pattern]) => pattern.test(t)).map(([value]) => value);
  if (type.length) draft.type = type.slice(0, 2);

  const money = t.match(/(?:£|under |below |up to |max(?:imum)? |budget (?:of |is )?)£?\s?(\d{2,4})\s*(pw|p\/w|per week|a week|weekly|pcm|per month|a month|monthly)?/);
  if (money) {
    const amount = Number(money[1]);
    const monthly = /pcm|month/.test(money[2] ?? "");
    const weekly = monthly ? Math.round((amount * 12) / 52) : amount;
    if (weekly >= 30 && weekly <= 1500) draft.maxRent = weekly;
  }

  if (/\b(housing benefit|universal credit|\buc\b|on benefits|dss|benefits accepted)/.test(t)) draft.hb = true;
  if (/\b(for (a )?(woman|women|female)|women only|female only|i'm a woman|im a woman|i am a woman)\b/.test(t)) draft.resident = "woman";
  else if (/\b(for (a )?(man|men|male)|men only|male only|i'm a man|im a man|i am a man)\b/.test(t)) draft.resident = "man";

  if (/\b(today|now|asap|as soon as possible|immediately|urgent(ly)?|straight away)\b/.test(t)) draft.from = isoDate(today);
  else if (/\btomorrow\b/.test(t)) draft.from = isoDate(new Date(today.getTime() + 86_400_000));
  else if (/\bnext week\b/.test(t)) draft.from = isoDate(new Date(today.getTime() + 7 * 86_400_000));
  else if (/\bnext month\b/.test(t)) draft.from = isoDate(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1)));
  else {
    const month = MONTHS.findIndex((name) => new RegExp(`\\b(in|from|by|start of|early|beginning of) ${name}\\b`).test(t));
    if (month >= 0) {
      const year = month < today.getUTCMonth() ? today.getUTCFullYear() + 1 : today.getUTCFullYear();
      draft.from = isoDate(new Date(Date.UTC(year, month, 1)));
    }
  }
  return draft;
}

const hasFilters = (draft: SearchDraft) =>
  Boolean(draft.where || draft.anywhere || draft.support?.length || draft.type?.length || draft.maxRent || draft.hb || draft.from || draft.resident);

export function mergeDraft(base: SearchDraft | undefined, next: SearchDraft): SearchDraft {
  const merged: SearchDraft = { ...(base ?? {}) };
  if (next.where) {
    merged.where = next.where;
    delete merged.anywhere;
  } else if (next.anywhere) {
    merged.anywhere = true;
    delete merged.where;
  }
  if (next.support?.length) merged.support = Array.from(new Set([...(merged.support ?? []), ...next.support]));
  if (next.type?.length) merged.type = next.type;
  if (next.maxRent) merged.maxRent = next.maxRent;
  if (next.hb) merged.hb = true;
  if (next.from) merged.from = next.from;
  if (next.resident) merged.resident = next.resident;
  return merged;
}

export function buildSearchUrl(draft: SearchDraft): string {
  const params = new URLSearchParams();
  if (draft.where) params.set("where", draft.where);
  for (const slug of draft.support ?? []) params.append("support", slug);
  for (const value of draft.type ?? []) params.append("type", value);
  if (draft.maxRent) params.set("maxRent", String(draft.maxRent));
  if (draft.hb) params.set("hb", "1");
  if (draft.from) params.set("from", draft.from);
  if (draft.resident) params.set("resident", draft.resident);
  const query = params.toString();
  return query ? `/search?${query}` : "/search";
}

const TYPE_LABELS: Record<string, string> = {
  SELF_CONTAINED: "self-contained",
  FLAT: "flats",
  HOUSE: "houses",
  SHARED_ACCOMMODATION: "shared homes",
  SINGLE_ROOM: "single rooms",
};

export function describeDraft(draft: SearchDraft, context: SearchContext): string {
  const labels = new Map(context.supportTypes.map((type) => [type.slug, type.label.toLowerCase()]));
  const parts: string[] = [];
  parts.push(draft.type?.length ? draft.type.map((value) => TYPE_LABELS[value] ?? "rooms").join(" or ") : "rooms");
  if (draft.where) parts.push(`in ${draft.where}`);
  else if (draft.anywhere) parts.push("across the UK");
  if (draft.support?.length) parts.push(`with ${draft.support.map((slug) => labels.get(slug) ?? slug).join(" or ")} support`);
  if (draft.resident) parts.push(`for ${draft.resident === "woman" ? "women" : "men"}`);
  if (draft.maxRent) parts.push(`up to £${draft.maxRent} a week`);
  if (draft.hb) parts.push("that accept Housing Benefit");
  if (draft.from) parts.push(`available by ${new Date(`${draft.from}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", timeZone: "UTC" })}`);
  return parts.join(" ");
}

const SEARCH_INTENT = /\b(need|want|looking for|look for|find me|show me|search for|searching for|any|got any|have you got|are there)\b.*\b(rooms?|place|accommodation|housing|flat|home|house|somewhere to (live|stay)|hmo|studio|bedsit)\b|\brooms? (in|near|around)\b|\bhelp me (search|look|find)\b/;
const HOW_TO = /^(how|what|why|when|who|can you explain|explain|does|do i|is it|where do i)\b/;

export function isSearchIntent(text: string): boolean {
  const t = norm(text);
  if (/\bhelp me (search|look|find)\b|\bshow me\b/.test(t)) return true;
  if (HOW_TO.test(t)) return false;
  return SEARCH_INTENT.test(t);
}

export function searchReply(draft: SearchDraft, context: SearchContext): AssistantReply {
  if (!draft.where && !draft.anywhere) {
    return {
      kind: "search",
      text: "Happy to help you look. Which town, area or postcode are you thinking of?",
      links: [],
      suggestions: [...context.areas.slice(0, 4), "Anywhere in the UK"],
      state: { search: draft, awaiting: "area" },
      source: "rules",
    };
  }
  const refine: string[] = [];
  if (!draft.hb) refine.push("Only homes that accept Housing Benefit");
  if (!draft.support?.length) refine.push("Add a support need");
  if (!draft.maxRent) refine.push("Set a weekly budget");
  refine.push("How do I get alerts for new rooms?");
  const place = draft.where ?? "the UK";
  return {
    kind: "search",
    text: `Here's the live search for ${describeDraft(draft, context)}. It shows only what providers have listed right now, so I can't promise a particular room is free. Open an advert to see its details, and check them with the provider. You can change any filter on the results page.`,
    links: [{ label: `See rooms in ${clip(place, 28)}`, href: buildSearchUrl(draft) }],
    suggestions: refine.slice(0, 3),
    state: { search: draft },
    source: "rules",
  };
}

// ------------------------------------------------------------------ adverts

type AdvertTopic = "rent" | "bills" | "benefit" | "availability" | "support" | "eligibility" | "contact" | "location" | "features";

const ADVERT_TOPICS: Array<[AdvertTopic, RegExp]> = [
  ["rent", /\b(rent|cost|price|how much|per week|afford|expensive|cheap|included in the rent)\b/],
  ["bills", /\b(bills?|utilities|gas|electric|water|included|service charge)\b/],
  ["benefit", /\b(housing benefit|universal credit|\buc\b|benefits|dss)\b/],
  ["availability", /\b(available|availability|free|vacan|move in|move-in|when can|start date|still going|taken)\b/],
  ["support", /\b(support|staff|help with|key ?worker|care)\b/],
  ["eligibility", /\b(who is (it|this)|who('s| is) (it|this home) for|eligib|criteria|suitable|accept|age|women|men|female|male|gender|can i (live|stay|apply))\b/],
  ["contact", /\b(contact|message|apply|request|get in touch|speak|phone|call|email)\b/],
  ["location", /\b(where is|location|area|address|postcode|near)\b/],
  ["features", /\b(pets?|dogs?|cats?|wheelchair|accessible|access|furnished|en-?suite|self[- ]contained|bathroom)\b/],
];

export function advertTopics(text: string): AdvertTopic[] {
  const t = norm(text);
  const topics = ADVERT_TOPICS.filter(([, pattern]) => pattern.test(t)).map(([topic]) => topic);
  // "What's included in the rent?" is about bills as much as rent.
  if (topics.includes("rent") && /included/.test(t) && !topics.includes("bills")) topics.push("bills");
  return topics;
}

const money = (value: number) => `£${value}`;
const GENDER: Record<string, string> = { FEMALE_ONLY: "women only", MALE_ONLY: "men only", MIXED: "mixed (men and women)", ANY: "anyone" };

export function advertAnswer(facts: AdvertFacts, topics: AdvertTopic[]): AssistantReply {
  const lines: string[] = [];
  const say = (line: string) => lines.push(line);
  for (const topic of topics.slice(0, 4)) {
    if (topic === "rent") {
      if (facts.rentFrom && facts.rentTo && facts.rentTo !== facts.rentFrom) say(`The advert lists rent from ${money(facts.rentFrom)} to ${money(facts.rentTo)} a week, depending on the room.`);
      else if (facts.rentFrom ?? facts.rentTo) say(`The advert lists rent of ${money((facts.rentFrom ?? facts.rentTo) as number)} a week.`);
      else say("The advert doesn't list a rent figure, so ask the provider.");
    }
    if (topic === "bills") say(facts.billsIncluded ? "It says bills are included in the rent." : "It says bills are not included, so ask the provider what they usually cost.");
    if (topic === "benefit") say(facts.housingBenefit ? "It says Housing Benefit and Universal Credit housing costs are accepted." : "It doesn't say Housing Benefit is accepted, so check with the provider.");
    if (topic === "availability") {
      const when = facts.availableFrom ? new Date(facts.availableFrom) : null;
      const future = when && when.getTime() > Date.now();
      const count = facts.roomsAvailable;
      say(
        count > 0
          ? `The live advert shows ${count} room${count === 1 ? "" : "s"} marked available${future ? `, from ${when!.toLocaleDateString("en-GB", { day: "numeric", month: "long" })}` : ""}.`
          : "The live advert doesn't show any rooms marked available right now.",
      );
    }
    if (topic === "support") {
      if (facts.supportLabels.length) say(`It lists support for: ${facts.supportLabels.join(", ")}.`);
      if (facts.supportDescription) say(`The provider describes it as: "${clip(facts.supportDescription, 260)}"`);
      if (facts.supportAvailability) say(`Support availability: ${clip(facts.supportAvailability, 140)}.`);
      if (!facts.supportLabels.length && !facts.supportDescription) say("The advert doesn't describe any support, so ask the provider.");
    }
    if (topic === "eligibility") {
      const age = facts.minAge || facts.maxAge ? ` Ages: ${facts.minAge ?? "any"} to ${facts.maxAge ?? "any"}.` : "";
      say(`It's listed for ${GENDER[facts.genderArrangement] ?? "anyone"}.${age}`);
      if (facts.eligibility) say(`Eligibility notes: "${clip(facts.eligibility, 260)}"`);
      say("Only the provider can decide whether you're accepted.");
    }
    if (topic === "contact") {
      say(`Use "Send a message" on this advert to ask ${facts.providerName} a question, or "Request accommodation" to apply. It's free, but you'll need an account. Adding your phone number helps them reach you quickly.`);
      if (facts.referralProcess) say(`How referrals work here: "${clip(facts.referralProcess, 200)}"`);
    }
    if (topic === "location") say(`It's in ${facts.area ? `${facts.area}, ` : ""}${facts.city}. The exact address is shared by the provider when appropriate.`);
    if (topic === "features") {
      const bits = [
        facts.furnished ? "furnished" : "unfurnished",
        facts.ensuite ? "en-suite rooms" : null,
        facts.selfContained ? "self-contained" : null,
        facts.wheelchairAccess ? "wheelchair accessible" : "not listed as wheelchair accessible",
        facts.petsAllowed ? "pets allowed" : "pets not listed as allowed",
      ].filter(Boolean);
      say(`The advert says: ${bits.join(", ")}.`);
    }
  }
  const unique = Array.from(new Set(lines));
  unique.push(AVAILABILITY_CAVEAT);
  return {
    kind: "advert",
    text: unique.join(" "),
    links: [
      { label: "Message this provider", href: `/listings/${facts.id}#message` },
      { label: "Request this room", href: `/listings/${facts.id}/request` },
    ],
    suggestions: ["Who is this home for?", "What support is offered?", "Is Housing Benefit accepted?"].filter((q) => !topics.some((topic) => q.toLowerCase().includes(topic === "benefit" ? "benefit" : topic))).slice(0, 2),
    source: "rules",
  };
}

// --------------------------------------------------------------- knowledge

export function retrieve(text: string, articles: HelpArticle[] = HELP_ARTICLES, limit = 3): Array<{ article: HelpArticle; score: number }> {
  const t = ` ${norm(text).replace(/[^a-z0-9' ]/g, " ")} `;
  const words = new Set(t.split(" ").filter((word) => word.length > 3));
  return articles
    .map((article) => {
      let score = 0;
      for (const keyword of article.keywords) if (t.includes(` ${keyword} `) || t.includes(keyword)) score += keyword.split(" ").length * 2;
      for (const word of norm(article.title).split(/\W+/)) if (word.length > 3 && words.has(word)) score += 1;
      return { article, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

const GREETING = /^(hi|hello|hey|hiya|good (morning|afternoon|evening)|hey there)[!. ]*$/;
const THANKS = /^(thanks|thank you|cheers|ta|that's great|great|ok thanks|okay thanks|brilliant|perfect)[!. ]*$/;
const HUMAN = /\b(real person|human|speak to (someone|a person|staff)|talk to (someone|a person)|contact (you|support|roomsnow|the team)|support team|complain|complaint|customer service|agent)\b/;
const CAPABILITIES = /\b(help using|help me use|how (do i|to) use|what can you (do|help)|what do you do|i need help|need some help|help$)\b/;

export function smallTalk(text: string): AssistantReply | null {
  const t = norm(text);
  if (GREETING.test(t)) {
    return { kind: "smalltalk", text: "Hello! I can help you search for a room, understand an advert, or find your way around RoomsNow. What would you like to do?", links: [], suggestions: ["Help me search for a room", "How do I contact a provider?", "I need help using RoomsNow"], source: "rules" };
  }
  if (THANKS.test(t)) {
    return { kind: "smalltalk", text: "You're welcome. Good luck with your search. I'm here if you need anything else.", links: [], suggestions: [], source: "rules" };
  }
  if (HUMAN.test(t)) return handoffReply();
  return null;
}

export function capabilitiesReply(text: string): AssistantReply | null {
  const t = norm(text);
  if (CAPABILITIES.test(t)) {
    return {
      kind: "answer",
      text: "Of course. I can help you search for rooms by area, support needs, budget and move-in date; explain what an advert means; show you how to message a provider, save adverts and track requests; and help with your account. What would you like to start with?",
      links: [{ label: "Search rooms", href: "/search" }, { label: "How it works", href: "/how-it-works" }],
      suggestions: ["Help me search for a room", "How do I contact a provider?", "I can't sign in"],
      source: "rules",
    };
  }
  return null;
}

export function handoffReply(): AssistantReply {
  return {
    kind: "handoff",
    text: "You can contact the RoomsNow team. Press \"Contact RoomsNow support\" below to send them a short message, and they'll reply by email. Please don't include sensitive details like ID or bank numbers.",
    links: [],
    suggestions: [],
    handoff: true,
    source: "rules",
  };
}

export function unknownReply(): AssistantReply {
  return {
    kind: "unknown",
    text: "I'm not sure about that one, and I don't want to guess. You could look through our guides, ask the provider directly if it's about a particular advert, or contact the RoomsNow team.",
    links: [{ label: "Guides", href: "/guides" }, { label: "How it works", href: "/how-it-works" }],
    suggestions: ["How do I find a room?", "How do I contact a provider?"],
    handoff: true,
    source: "rules",
  };
}

export function articleReply(article: HelpArticle): AssistantReply {
  return { kind: "answer", text: article.answer, links: article.links, suggestions: article.next ?? [], source: "rules" };
}

// ------------------------------------------------------------- AI plumbing

export function isAllowedHref(href: string): boolean {
  if (ALLOWED_EXTERNAL.some((origin) => href === origin || href.startsWith(`${origin}/`))) return true;
  if (!href.startsWith("/") || href.startsWith("//")) return false;
  const path = href.split(/[?#]/)[0];
  return ALLOWED_LINK_PATHS.includes(path) || ALLOWED_LINK_PREFIXES.some((prefix) => path.startsWith(prefix));
}

export function sanitiseLinks(links: unknown): AssistantLink[] {
  if (!Array.isArray(links)) return [];
  const seen = new Set<string>();
  const out: AssistantLink[] = [];
  for (const link of links) {
    if (!link || typeof link !== "object") continue;
    const { label, href } = link as { label?: unknown; href?: unknown };
    if (typeof label !== "string" || typeof href !== "string" || !isAllowedHref(href) || seen.has(href)) continue;
    seen.add(href);
    out.push({ label: clip(label.trim(), 40), href });
    if (out.length === 4) break;
  }
  return out;
}

/** Pulls the model's JSON reply apart defensively; returns null if it isn't usable. */
export function parseModelReply(raw: string): { text: string; links: AssistantLink[]; suggestions: string[]; handoff: boolean } | null {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const data = JSON.parse(match[0]) as { reply?: unknown; links?: unknown; suggestions?: unknown; handoff?: unknown };
    if (typeof data.reply !== "string" || !data.reply.trim()) return null;
    const suggestions = Array.isArray(data.suggestions)
      ? data.suggestions.filter((s): s is string => typeof s === "string" && s.length <= 80).slice(0, 3)
      : [];
    return { text: clip(data.reply.trim(), 900), links: sanitiseLinks(data.links), suggestions, handoff: data.handoff === true };
  } catch {
    return null;
  }
}

export function systemPrompt(articles: HelpArticle[], facts: AdvertFacts | null): string {
  const help = articles
    .map((article) => `### ${article.title}\n${article.answer}\nLinks: ${article.links.map((link) => `${link.label} -> ${link.href}`).join("; ")}`)
    .join("\n\n");
  const advert = facts
    ? `\n\nThe person is viewing this live advert (facts from the database; use only these):\n${JSON.stringify(facts)}`
    : "";
  return `You are the RoomsNow Help Assistant, an automated assistant on RoomsNow, a UK website for HMO rooms, supported accommodation and move-on housing. People using it may be stressed or new to online housing services.

Rules:
- Answer ONLY from the approved help content below${facts ? " and the advert facts" : ""}. If the answer isn't there, say plainly that you don't know and suggest a next step (search, the provider, or RoomsNow support, setting "handoff": true).
- Never invent listings, prices, availability, provider policies, eligibility decisions or guarantees. Never say a room is available unless the advert facts show rooms available, and then remind them availability can change and to check with the provider.
- No legal, benefits or medical advice: point to the support services page, their council or Citizens Advice instead.
- Never ask for personal or sensitive information (health, ID, bank details, address, date of birth).
- You are not emergency or crisis support. If someone may be in danger, tell them calmly to call 999.
- Be warm, calm and brief: at most 3 short sentences or a very short list, plain UK English, no jargon, no markdown headings, no emoji.
- Only link to pages listed in the help content (use their exact paths).

Reply with JSON only: {"reply": string, "links": [{"label": string, "href": string}], "suggestions": [up to 3 short follow-up questions the person might tap], "handoff": boolean}

Approved help content:
${help}${advert}`;
}

// ------------------------------------------------------------ orchestration

export type RespondInput = {
  messages: ChatMessage[];
  state?: AssistantState;
  facts: AdvertFacts | null;
  context: SearchContext;
  /** Calls the language model; resolves to null when unavailable. */
  ai?: (system: string, messages: ChatMessage[]) => Promise<string | null>;
  today?: Date;
};

/**
 * Decides how to answer the latest message. Order matters: safety first,
 * then anything we can answer exactly (search links, advert facts), and only
 * then general help, from the model if configured or the articles if not.
 */
export async function respond(input: RespondInput): Promise<AssistantReply> {
  const last = [...input.messages].reverse().find((message) => message.role === "user");
  if (!last) return capabilitiesReply("what can you do")!;

  const safety = detectSafety(last.content);
  if (safety) return safetyReply(safety);

  const sensitive = findSensitive(last.content).length > 0;
  const text = redact(last.content);
  const withNote = (reply: AssistantReply): AssistantReply => (sensitive ? { ...reply, text: SENSITIVE_NOTE + reply.text } : reply);

  const small = smallTalk(text);
  if (small) return withNote(small);

  // Room search: a fresh request, an answer to "which area?", or a refinement.
  const draft = extractSearch(text, input.context, input.today);
  const wordCount = norm(text).split(" ").length;
  const awaitingArea = input.state?.awaiting === "area";
  if (awaitingArea && !draft.where && !draft.anywhere && wordCount <= 4 && !/[?]/.test(text) && !HOW_TO.test(norm(text))) {
    draft.where = clip(text.replace(/[^\p{L}\p{N} '-]/gu, "").trim(), 40);
  }
  const refining = Boolean(input.state?.search) && hasFilters(draft) && !HOW_TO.test(norm(text));
  if (isSearchIntent(text) || (awaitingArea && hasFilters(draft)) || refining) {
    return withNote(searchReply(mergeDraft(input.state?.search, draft), input.context));
  }
  if (/^(add a support need)$/i.test(text.trim())) {
    return {
      kind: "search",
      text: "Which kind of support are you looking for? Choose one, or type it in your own words.",
      links: [],
      suggestions: input.context.supportTypes.filter((type) => type.slug !== "other").slice(0, 5).map((type) => type.label),
      state: input.state,
      source: "rules",
    };
  }
  if (/^(set a weekly budget)$/i.test(text.trim())) {
    return { kind: "search", text: "What's the most you can pay each week? For example, \"up to £150 a week\".", links: [], suggestions: ["Up to £120 a week", "Up to £150 a week", "Up to £200 a week"], state: input.state, source: "rules" };
  }
  if (input.state?.search && input.context.supportTypes.some((type) => norm(type.label) === norm(text))) {
    const slug = input.context.supportTypes.find((type) => norm(type.label) === norm(text))!.slug;
    return withNote(searchReply(mergeDraft(input.state.search, { support: [slug] }), input.context));
  }

  const capabilities = capabilitiesReply(text);
  if (capabilities) return withNote(capabilities);

  // Questions about the advert on screen are answered from its live data.
  if (input.facts) {
    const topics = advertTopics(text);
    if (topics.length) return withNote(advertAnswer(input.facts, topics));
  }

  const matches = retrieve(text);
  if (input.ai) {
    const context = matches.length ? matches.map((m) => m.article) : HELP_ARTICLES.slice(0, 4);
    const history = input.messages.slice(-6).map((message) => ({ role: message.role, content: redact(message.content) }));
    const raw = await input.ai(systemPrompt(context, input.facts), history);
    const parsed = raw ? parseModelReply(raw) : null;
    if (parsed) {
      const mentionsAvailability = /\bavailab/i.test(parsed.text) && !parsed.text.includes(AVAILABILITY_CAVEAT);
      return withNote({
        kind: "answer",
        text: mentionsAvailability ? `${parsed.text} ${AVAILABILITY_CAVEAT}` : parsed.text,
        links: parsed.links.length ? parsed.links : (matches[0]?.article.links ?? []),
        suggestions: parsed.suggestions,
        handoff: parsed.handoff,
        source: "ai",
      });
    }
  }
  if (matches[0] && matches[0].score >= 2) return withNote(articleReply(matches[0].article));
  return withNote(unknownReply());
}
