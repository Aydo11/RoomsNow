/**
 * The advert writer: turns the facts a provider has already entered (plus any
 * rough notes) into a title, one-line summary and description.
 *
 * Pure functions only, so they can be tested and shared by the server action.
 * With an ANTHROPIC_API_KEY set the server asks Claude for the copy; without
 * one, `templateAdvert` writes a solid, fact-only version so the feature
 * always works.
 */
import { z } from "zod";
import { ACCOMMODATION_TYPES, GENDER_ARRANGEMENTS, REFERRAL_ROUTES, SUPPORT_TYPES } from "./taxonomy";

export const WRITER_TONES = {
  warm: "Warm and welcoming",
  professional: "Professional",
  concise: "Short and clear",
} as const;
export type WriterTone = keyof typeof WRITER_TONES;

export const advertFactsSchema = z.object({
  propertyName: z.string().trim().max(120).optional().default(""),
  city: z.string().trim().max(80).optional().default(""),
  area: z.string().trim().max(80).optional().default(""),
  postcode: z.string().trim().max(12).optional().default(""),
  accommodationType: z.string().trim().max(40).optional().default(""),
  bedrooms: z.coerce.number().int().min(0).max(200).optional(),
  roomCount: z.coerce.number().int().min(0).max(200).optional(),
  weeklyRentFrom: z.coerce.number().min(0).max(100000).optional(),
  weeklyRentTo: z.coerce.number().min(0).max(100000).optional(),
  availableFrom: z.string().trim().max(20).optional().default(""),
  genderArrangement: z.string().trim().max(20).optional().default(""),
  minAge: z.coerce.number().int().min(0).max(120).optional(),
  maxAge: z.coerce.number().int().min(0).max(120).optional(),
  features: z.array(z.string().max(40)).max(12).optional().default([]),
  accessibilityNotes: z.string().trim().max(1500).optional().default(""),
  supportTypes: z.array(z.string().max(40)).max(20).optional().default([]),
  supportDescription: z.string().trim().max(3000).optional().default(""),
  supportAvailability: z.string().trim().max(200).optional().default(""),
  supportProvider: z.string().trim().max(200).optional().default(""),
  referralRoutes: z.array(z.string().max(40)).max(10).optional().default([]),
  referralProcess: z.string().trim().max(2000).optional().default(""),
  houseRules: z.string().trim().max(2000).optional().default(""),
  notes: z.string().trim().max(2000).optional().default(""),
  tone: z.enum(["warm", "professional", "concise"]).optional().default("warm"),
});
export type AdvertFacts = z.infer<typeof advertFactsSchema>;

export type AdvertCopy = { title: string; summary: string; description: string };

/** Feature toggles from the form, by field name, with their public wording. */
export const FEATURE_LABELS: Record<string, string> = {
  ensuite: "en-suite rooms",
  furnished: "furnished rooms",
  selfContained: "self-contained living",
  sharedFacilities: "shared kitchen and living space",
  wheelchairAccess: "wheelchair access",
  petsAllowed: "pets considered",
  billsIncluded: "bills included",
  housingBenefit: "benefits accepted, including Universal Credit",
};

/** How each accommodation type reads in a sentence ("a shared house"). */
const TYPE_NOUN: Record<string, string> = {
  SINGLE_ROOM: "room",
  SHARED_ACCOMMODATION: "shared house",
  SELF_CONTAINED: "self-contained home",
  FLAT: "flat",
  HOUSE: "house",
};

const supportLabel = (slug: string) => SUPPORT_TYPES.find((t) => t.slug === slug)?.label ?? slug;
const typeLabel = (value: string) => (ACCOMMODATION_TYPES as Record<string, string>)[value] ?? "";
const routeLabel = (value: string) => (REFERRAL_ROUTES as Record<string, string>)[value] ?? value;

/** Only the outward half of a postcode (e.g. "B21"), never the full one. */
export function outwardPostcode(postcode: string) {
  const clean = postcode.toUpperCase().replace(/\s+/g, "");
  if (clean.length < 5) return clean;
  return clean.slice(0, clean.length - 3);
}

function place(facts: AdvertFacts) {
  return [facts.area, facts.city].filter(Boolean).join(", ");
}

function money(pounds?: number) {
  if (pounds === undefined || Number.isNaN(pounds) || pounds <= 0) return null;
  return `£${pounds % 1 === 0 ? pounds.toFixed(0) : pounds.toFixed(2)}`;
}

export function rentText(facts: AdvertFacts) {
  const from = money(facts.weeklyRentFrom);
  const to = money(facts.weeklyRentTo);
  if (from && to && from !== to) return `${from}–${to} per week`;
  if (from || to) return `${from ?? to} per week`;
  return null;
}

function ageText(facts: AdvertFacts) {
  if (facts.minAge && facts.maxAge) return `aged ${facts.minAge}–${facts.maxAge}`;
  if (facts.minAge) return `aged ${facts.minAge}+`;
  if (facts.maxAge) return `aged up to ${facts.maxAge}`;
  return null;
}

function listJoin(items: string[]) {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

function sentence(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return "";
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function clip(text: string, max: number) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), max - 20)).trim()}…`;
}

/** A dependable, facts-only advert used when no AI key is configured. */
export function templateAdvert(facts: AdvertFacts): AdvertCopy {
  const where = place(facts);
  const type = typeLabel(facts.accommodationType);
  const support = facts.supportTypes.map(supportLabel);
  const household = facts.genderArrangement && facts.genderArrangement !== "ANY" ? (GENDER_ARRANGEMENTS as Record<string, string>)[facts.genderArrangement] : null;
  const rooms = facts.roomCount && facts.roomCount > 1 ? `${facts.roomCount} rooms` : "Room";
  const beds = facts.bedrooms && facts.bedrooms > 1 ? `${facts.bedrooms}-bed ` : "";

  const kind = support.length ? "supported accommodation" : type ? type.toLowerCase() : "accommodation";
  const householdFor: Record<string, string> = { MALE_ONLY: "for men", FEMALE_ONLY: "for women" };
  const titleParts = [
    `${beds}${kind}`,
    householdFor[facts.genderArrangement] ?? null,
    where ? `in ${where}` : null,
  ].filter(Boolean);
  let title = titleParts.join(" ");
  title = title.charAt(0).toUpperCase() + title.slice(1);
  if (facts.features.includes("ensuite")) title += " with en-suite rooms";

  const rent = rentText(facts);
  const summaryBits = [
    `${rooms} available${where ? ` in ${where}` : ""}${support.length ? ` with ${listJoin(support.slice(0, 2).map((s) => s.toLowerCase()))} support` : ""}`,
    rent,
    facts.features.includes("housingBenefit") ? "benefits accepted" : null,
  ].filter(Boolean);
  const summary = clip(summaryBits.join(" · "), 160);

  const paragraphs: string[] = [];
  const intro = [
    `${facts.propertyName ? `${facts.propertyName} is a` : "A"} ${beds}${TYPE_NOUN[facts.accommodationType] ?? "home"}${where ? ` in ${where}` : ""}`,
    household || ageText(facts) ? ` for ${[household?.toLowerCase(), ageText(facts)].filter(Boolean).join(", ")}` : "",
  ].join("");
  paragraphs.push(sentence(`${intro}${support.length ? `, offering ${listJoin(support.map((s) => s.toLowerCase()))} support` : ""}`));

  const features = facts.features.map((key) => FEATURE_LABELS[key]).filter(Boolean);
  if (features.length) {
    paragraphs.push(["What's included:", ...features.map((f) => `- ${f.charAt(0).toUpperCase()}${f.slice(1)}`)].join("\n"));
  }
  if (facts.supportDescription) paragraphs.push(sentence(facts.supportDescription));
  const supportLine = [
    facts.supportAvailability ? `Support is available ${facts.supportAvailability.replace(/^support\s+/i, "")}` : null,
    facts.supportProvider ? `delivered by ${facts.supportProvider}` : null,
  ].filter(Boolean).join(", ");
  if (supportLine) paragraphs.push(sentence(supportLine));
  if (facts.accessibilityNotes) paragraphs.push(sentence(facts.accessibilityNotes));
  if (facts.notes) paragraphs.push(sentence(facts.notes.charAt(0).toUpperCase() + facts.notes.slice(1)));

  const practical = [
    rent ? `Rent is ${rent}${facts.features.includes("billsIncluded") ? ", with bills included" : ""}` : null,
    facts.availableFrom ? `and rooms are available from ${new Date(facts.availableFrom).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}` : null,
  ].filter(Boolean).join(", ");
  if (practical) paragraphs.push(sentence(rent ? practical : practical.replace(/^and rooms are/, "Rooms are")));

  const routes = facts.referralRoutes.map(routeLabel);
  if (routes.length || facts.referralProcess) {
    paragraphs.push(sentence([
      routes.length ? `Ways to apply: ${routes.map((r) => r.toLowerCase()).join(", ")}` : null,
      facts.referralProcess || null,
    ].filter(Boolean).join(". ")));
  }
  paragraphs.push("Get in touch through RoomsNow to ask a question or arrange a viewing.");

  return { title: clip(title, 90), summary, description: paragraphs.filter(Boolean).join("\n\n") };
}

/** What we send to the model: facts only, no full address. */
export function factsForPrompt(facts: AdvertFacts) {
  const lines: string[] = [];
  const add = (label: string, value: string | null | undefined) => {
    if (value && String(value).trim()) lines.push(`${label}: ${String(value).trim()}`);
  };
  add("Property name", facts.propertyName);
  add("Location", place(facts));
  add("Postcode district", outwardPostcode(facts.postcode));
  add("Accommodation type", typeLabel(facts.accommodationType));
  add("Bedrooms in property", facts.bedrooms ? String(facts.bedrooms) : "");
  add("Rooms being advertised", facts.roomCount ? String(facts.roomCount) : "");
  add("Weekly rent", rentText(facts));
  add("Available from", facts.availableFrom);
  add("Household", facts.genderArrangement ? (GENDER_ARRANGEMENTS as Record<string, string>)[facts.genderArrangement] : "");
  add("Ages", ageText(facts));
  add("Features", facts.features.map((key) => FEATURE_LABELS[key]).filter(Boolean).join("; "));
  add("Accessibility", facts.accessibilityNotes);
  add("Support categories", facts.supportTypes.map(supportLabel).join(", "));
  add("Support provided", facts.supportDescription);
  add("Support hours", facts.supportAvailability);
  add("Support delivered by", facts.supportProvider);
  add("How people can apply", facts.referralRoutes.map(routeLabel).join(", "));
  add("Referral process", facts.referralProcess);
  add("House rules", facts.houseRules);
  add("Provider's own notes", facts.notes);
  return lines.join("\n");
}

export const WRITER_SYSTEM_PROMPT = `You write accommodation adverts for RoomsNow, a UK platform for HMO rooms and supported, transitional and specialist accommodation. Readers are people looking for a home and the professionals who refer them (support workers, probation, local authorities).

Rules:
- Use only the facts provided. Never invent amenities, distances, staff, prices, transport links or support that isn't stated. If something is unknown, leave it out.
- Never include a street address or full postcode.
- UK English. Plain, respectful, person-first language (e.g. "people with experience of homelessness", not "the homeless"). No slang, hype, emojis or exclamation marks.
- Do not discourage people on benefits, and do not add eligibility restrictions that weren't provided.
- The title is at most 80 characters and says what it is and where (e.g. "En-suite rooms in supported shared house, Handsworth").
- The summary is one sentence, at most 150 characters.
- The description is plain text, 120–260 words: short paragraphs separated by a blank line, and a "- " bulleted list for features where useful. No headings, no markdown bold.
- End the description with one line inviting people to get in touch through RoomsNow.

Reply with only a JSON object: {"title": "...", "summary": "...", "description": "..."}`;

export function writerUserPrompt(facts: AdvertFacts) {
  return `Tone: ${WRITER_TONES[facts.tone]}.\n\nFacts about the accommodation:\n${factsForPrompt(facts) || "(very few details given — keep it short and general)"}`;
}

const copySchema = z.object({
  title: z.string().min(3),
  summary: z.string().default(""),
  description: z.string().min(20),
});

/** Pull the JSON object out of a model reply and tidy it to our limits. */
export function parseAdvertCopy(reply: string): AdvertCopy | null {
  const start = reply.indexOf("{");
  const end = reply.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const parsed = copySchema.parse(JSON.parse(reply.slice(start, end + 1)));
    return {
      title: clip(parsed.title.replace(/[\r\n]+/g, " "), 120),
      summary: clip(parsed.summary.replace(/[\r\n]+/g, " "), 200),
      description: parsed.description.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim().slice(0, 6000),
    };
  } catch {
    return null;
  }
}

const HTML_TAG = /<\/?(p|br|ul|ol|li|h3|h4|strong|em|u|blockquote)\b/i;

const escapeHtml = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * Descriptions typed (or written) as plain text keep their paragraphs and
 * bullet lists when shown. Anything that already contains our HTML is left
 * alone for the sanitiser.
 */
export function plainTextToAdvertHtml(text: string) {
  if (!text.trim() || HTML_TAG.test(text)) return text;
  return text
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
      const bullet = /^[-•*]\s+/;
      const firstBullet = lines.findIndex((line) => bullet.test(line));
      if (firstBullet === -1) return `<p>${lines.map(escapeHtml).join("<br>")}</p>`;
      const lead = lines.slice(0, firstBullet);
      const items = lines.slice(firstBullet);
      const leadHtml = lead.length ? `<p>${lead.map(escapeHtml).join("<br>")}</p>` : "";
      return `${leadHtml}<ul>${items.map((line) => `<li>${escapeHtml(line.replace(bullet, ""))}</li>`).join("")}</ul>`;
    })
    .join("");
}

/**
 * The reverse, for the edit form's plain textarea: simple paragraph and
 * bullet HTML comes back as readable text. Anything richer is left as HTML so
 * no formatting is lost.
 */
export function advertHtmlToPlainText(html: string) {
  if (!html || !HTML_TAG.test(html)) return html;
  if (/<\/?(strong|em|u|h3|h4|blockquote|ol)\b/i.test(html)) return html;
  const unescape = (text: string) => text.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
  return unescape(
    html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<li>/gi, "- ")
      .replace(/<\/li>\s*/gi, "\n")
      .replace(/<\/?ul>/gi, "\n")
      .replace(/<\/p>\s*/gi, "\n\n")
      .replace(/<p>/gi, "")
      .replace(/<[^>]+>/g, ""),
  )
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
