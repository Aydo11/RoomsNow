import { money } from "./format";
import { supportLabel } from "./taxonomy";

/**
 * "In simple words": an advert's key facts as short, plain sentences, built
 * from the advert's own fields rather than the provider's free text, so every
 * advert gets one and it's always accurate. Written for a low reading age:
 * one idea per sentence, everyday words, no jargon.
 */
export type PlainSummaryInput = {
  accommodationType: string;
  area: string | null;
  city: string;
  weeklyRentFrom: number | null;
  weeklyRentTo: number | null;
  billsIncluded: boolean;
  housingBenefit: boolean;
  supportTypes: string[];
  genderArrangement: string;
  minAge: number | null;
  maxAge: number | null;
  referralRoutes: string[];
  wheelchairAccess: boolean;
  petsAllowed: boolean;
  availableRooms: number;
  availableFrom: Date | string | null;
};

const KIND: Record<string, string> = {
  SINGLE_ROOM: "a single room",
  SHARED_ACCOMMODATION: "a room in a shared home",
  SELF_CONTAINED: "a home with its own kitchen and bathroom",
  FLAT: "a flat",
  HOUSE: "a house",
};

function joinWords(items: string[]) {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/** Support labels read naturally mid-sentence ("mental health", "young people"). */
function supportWords(slugs: string[]) {
  return slugs
    .filter((slug) => slug !== "other")
    .map((slug) => supportLabel(slug).replace(/\s*\(.*\)$/, ""))
    .map((label) => (label === label.toUpperCase() ? label : label.charAt(0).toLowerCase() + label.slice(1)));
}

export function plainSummary(input: PlainSummaryInput, now = new Date()): string[] {
  const lines: string[] = [];
  const place = [input.area, input.city].filter(Boolean).join(", ");
  lines.push(`This is ${KIND[input.accommodationType] ?? "a home"} in ${place}.`);

  const from = input.availableFrom ? new Date(input.availableFrom) : null;
  if (from && from.getTime() > now.getTime()) {
    lines.push(`You can move in from ${from.toLocaleDateString("en-GB", { day: "numeric", month: "long" })}.`);
  } else if (input.availableRooms > 0) {
    lines.push(input.availableRooms === 1 ? "1 room is free now." : `${input.availableRooms} rooms are free now.`);
  }

  if (input.weeklyRentFrom || input.weeklyRentTo) {
    const low = input.weeklyRentFrom ?? input.weeklyRentTo;
    const high = input.weeklyRentTo ?? input.weeklyRentFrom;
    lines.push(low !== high ? `The rent is ${money(low)} to ${money(high)} a week.` : `The rent is ${money(low)} a week.`);
  } else {
    lines.push("Ask the provider how much the rent is.");
  }
  lines.push(input.billsIncluded ? "Bills are included in the rent." : "Bills are not included. You pay them on top.");
  lines.push(input.housingBenefit ? "You can pay with Housing Benefit." : "You cannot pay with Housing Benefit here.");

  const support = supportWords(input.supportTypes);
  if (support.length) lines.push(`Staff can help with ${joinWords(support)}.`);

  if (input.genderArrangement === "FEMALE_ONLY") lines.push("It is for women only.");
  else if (input.genderArrangement === "MALE_ONLY") lines.push("It is for men only.");
  else if (input.genderArrangement === "MIXED") lines.push("Men and women live here.");

  if (input.minAge && input.maxAge) lines.push(`You need to be aged ${input.minAge} to ${input.maxAge}.`);
  else if (input.minAge) lines.push(`You need to be ${input.minAge} or older.`);
  else if (input.maxAge) lines.push(`You need to be ${input.maxAge} or younger.`);

  const routes = input.referralRoutes;
  if (routes.includes("SELF_REFERRAL") || routes.includes("ANY")) lines.push("You can apply yourself.");
  else if (routes.length) lines.push("A support worker or the council needs to refer you.");

  if (input.wheelchairAccess) lines.push("It has step-free access.");
  if (input.petsAllowed) lines.push("Pets are allowed.");
  return lines;
}

/** Breaks text into pieces short enough for the browser's speech engine. */
export function speechChunks(text: string, max = 220): string[] {
  const sentences = text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  const chunks: string[] = [];
  for (const sentence of sentences) {
    if (sentence.length <= max) {
      chunks.push(sentence);
      continue;
    }
    // Very long sentences split at commas, then at spaces.
    let rest = sentence;
    while (rest.length > max) {
      const cut = Math.max(rest.lastIndexOf(", ", max), rest.lastIndexOf(" ", max));
      const at = cut > max / 2 ? cut + 1 : max;
      chunks.push(rest.slice(0, at).trim());
      rest = rest.slice(at).trim();
    }
    if (rest) chunks.push(rest);
  }
  return chunks;
}
