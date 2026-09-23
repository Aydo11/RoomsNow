/**
 * Client-to-room matching for referrers. It ranks live adverts — and the best
 * room in each — against what the referrer has recorded about a client. Like
 * the marketplace score in ./matching.ts it is a shortlisting aid, never an
 * eligibility or suitability decision: the provider still assesses.
 *
 * Pure functions only, so it's easy to test and tune.
 */
import type { AccommodationType, GenderArrangement } from "@prisma/client";
import type { Assessment } from "./assessment";
import { raisedRisks } from "./assessment";

export type MatchClient = {
  dateOfBirth?: Date | null;
  preferredLocation?: string | null;
  supportTypes: string[];
  assessment: Assessment;
};

export type MatchRoom = {
  id: string;
  name: string;
  status: string;
  ensuite: boolean;
  furnished: boolean;
  weeklyRent: number | null; // pence
  availableFrom: Date | null;
};

export type MatchAdvert = {
  city: string;
  area: string | null;
  postcode: string;
  /** Miles from the client's first preferred area, when both could be placed on a map. */
  distanceMiles: number | null;
  supportTypes: string[];
  supportText: string;
  accommodationType: AccommodationType;
  genderArrangement: GenderArrangement;
  minAge: number | null;
  maxAge: number | null;
  wheelchairAccess: boolean;
  ensuite: boolean;
  furnished: boolean;
  selfContained: boolean;
  petsAllowed: boolean;
  housingBenefit: boolean;
  weeklyRentFrom: number | null; // pence
  availableFrom: Date | null;
  sharedFacilities: boolean;
  rooms: MatchRoom[];
};

export type ClientMatch = {
  score: number;
  room: MatchRoom | null;
  reasons: string[];
  flags: string[];
  blockers: string[];
};

const W = {
  location: 20,
  support: 25,
  type: 10,
  household: 8,
  age: 7,
  facilities: 10,
  funding: 10,
  availability: 5,
  supportLevel: 5,
};

/** How much credit a criterion gets when the referrer hasn't said anything about it. */
const UNKNOWN = 0.6;

const LETTABLE = new Set(["AVAILABLE", "VOID", "RESERVED"]);

function ageOn(dob: Date, at = new Date()) {
  return Math.floor((at.getTime() - dob.getTime()) / (365.25 * 24 * 3600 * 1000));
}

export function clientAreas(client: MatchClient) {
  const fromAssessment = client.assessment.areas ?? [];
  if (fromAssessment.length) return fromAssessment;
  return (client.preferredLocation ?? "")
    .split(/[,;/]| or /i)
    .map((a) => a.trim())
    .filter(Boolean);
}

function listingPart(client: MatchClient, advert: MatchAdvert) {
  const a = client.assessment;
  let score = 0;
  const reasons: string[] = [];
  const flags: string[] = [];
  const blockers: string[] = [];

  // Location
  const areas = clientAreas(client).map((x) => x.toLowerCase());
  const radius = a.radiusMiles ?? 10;
  const place = [advert.city, advert.area ?? "", advert.postcode].join(" ").toLowerCase();
  const outward = advert.postcode.split(/\s+/)[0]?.toLowerCase();
  if (!areas.length) {
    score += W.location * UNKNOWN;
  } else if (areas.some((x) => place.includes(x) || x === outward)) {
    score += W.location;
    reasons.push(`In ${advert.area ? `${advert.area}, ` : ""}${advert.city}`);
  } else if (advert.distanceMiles !== null && advert.distanceMiles <= radius) {
    score += W.location;
    reasons.push(`${advert.distanceMiles.toFixed(1)} miles from ${clientAreas(client)[0]}`);
  } else if (advert.distanceMiles !== null && advert.distanceMiles <= radius * 2) {
    score += W.location * 0.5;
    flags.push(`${advert.distanceMiles.toFixed(0)} miles from ${clientAreas(client)[0]} — outside the ${radius}-mile range`);
  } else {
    flags.push("Outside the preferred area");
  }

  // Support needs
  if (client.supportTypes.length) {
    const overlap = client.supportTypes.filter((s) => advert.supportTypes.includes(s));
    score += W.support * (overlap.length / client.supportTypes.length);
    if (overlap.length === client.supportTypes.length) reasons.push("Supports every need recorded");
    else if (overlap.length) reasons.push(`Supports ${overlap.length} of ${client.supportTypes.length} needs`);
    else flags.push("Doesn't list the support categories recorded");
  } else {
    score += W.support * UNKNOWN;
  }

  // Accommodation type
  const types = a.accommodationTypes ?? [];
  if (!types.length) score += W.type * UNKNOWN;
  else if (types.includes(advert.accommodationType)) {
    score += W.type;
    reasons.push("Right type of accommodation");
  } else flags.push("Different type of accommodation");

  // Household / single-sex housing
  const gender = a.gender;
  const pref = a.household ?? "ANY";
  const houseOk =
    (advert.genderArrangement !== "FEMALE_ONLY" || gender !== "MALE") &&
    (advert.genderArrangement !== "MALE_ONLY" || gender !== "FEMALE");
  if (!houseOk) {
    blockers.push(advert.genderArrangement === "FEMALE_ONLY" ? "Women-only house" : "Men-only house");
  } else if (pref !== "ANY" && pref !== "MIXED" && advert.genderArrangement !== pref) {
    flags.push(pref === "FEMALE_ONLY" ? "Not a women-only house" : "Not a men-only house");
  } else {
    score += gender || pref !== "ANY" ? W.household : W.household * UNKNOWN;
    if (pref !== "ANY" && advert.genderArrangement === pref) reasons.push(pref === "FEMALE_ONLY" ? "Women-only, as needed" : "Men-only, as needed");
  }

  // Age
  if (client.dateOfBirth) {
    const age = ageOn(client.dateOfBirth);
    if ((advert.minAge ?? 0) <= age && age <= (advert.maxAge ?? 200)) score += W.age;
    else blockers.push(`Age range ${advert.minAge ?? "any"}–${advert.maxAge ?? "any"}`);
  } else score += W.age * UNKNOWN;

  // Support intensity — adverts describe this in free text, so read it loosely.
  const level = a.supportLevel;
  const text = advert.supportText.toLowerCase();
  const round = /24\s*(\/|-|\s)?\s*(7|hour|hr)|on[-\s]?site|overnight|waking night|sleep[-\s]?in/.test(text);
  if (!level) score += W.supportLevel * UNKNOWN;
  else if (level === "TWENTY_FOUR" || level === "HIGH") {
    if (round) {
      score += W.supportLevel;
      reasons.push("Mentions on-site or 24-hour support");
    } else flags.push(level === "TWENTY_FOUR" ? "Check they can staff 24 hours" : "Check they can offer daily support");
  } else score += W.supportLevel;

  // Funding
  if (a.funding === "HOUSING_BENEFIT") {
    if (advert.housingBenefit) {
      score += W.funding * 0.5;
      reasons.push("Accepts Housing Benefit");
    } else blockers.push("Doesn't accept Housing Benefit");
  } else score += W.funding * 0.5 * (a.funding ? 1 : UNKNOWN);

  // Risk — adverts don't publish exclusion criteria, so risks only ever flag.
  for (const risk of raisedRisks(a)) {
    if (risk.area === "arson" && advert.sharedFacilities) flags.push(`${risk.level === "HIGH" ? "High" : "Medium"} arson risk in shared housing — discuss with provider`);
    else if (risk.level === "HIGH") flags.push(`High ${risk.label.split(" (")[0].toLowerCase()} — share the risk assessment`);
  }
  if (a.mappa && a.mappa !== "NONE") flags.push(`${a.mappa.replace("_", " ").replace("LEVEL", "MAPPA level")} — confirm the provider accepts`);

  return { score, reasons, flags, blockers };
}

function roomPart(client: MatchClient, advert: MatchAdvert, room: MatchRoom | null) {
  const a = client.assessment;
  let score = 0;
  const reasons: string[] = [];
  const flags: string[] = [];
  const blockers: string[] = [];

  // Facilities
  const wanted = a.facilities ?? [];
  if (a.facilities === undefined) score += W.facilities * UNKNOWN;
  else if (!wanted.length) score += W.facilities;
  else {
    let met = 0;
    for (const f of wanted) {
      const ok =
        f === "stepFree" || f === "groundFloor" ? advert.wheelchairAccess :
        f === "ensuite" ? Boolean(room?.ensuite || advert.ensuite) :
        f === "selfContained" ? advert.selfContained || advert.accommodationType === "SELF_CONTAINED" || advert.accommodationType === "FLAT" :
        f === "furnished" ? Boolean(room ? room.furnished : advert.furnished) :
        advert.petsAllowed;
      if (ok) met += 1;
      else if (f === "stepFree") blockers.push("No step-free access listed");
      else if (f === "pet") flags.push("Pets not listed as allowed");
      else if (f === "groundFloor") flags.push("Ground floor not confirmed");
      else flags.push(`No ${f === "selfContained" ? "self-contained option" : f}`);
    }
    score += W.facilities * (met / wanted.length);
    if (met === wanted.length) reasons.push("Has the facilities needed");
  }

  // Budget
  const rent = room?.weeklyRent ?? advert.weeklyRentFrom;
  if (a.maxWeeklyRent && rent) {
    const cap = a.maxWeeklyRent * 100;
    if (rent <= cap) {
      score += W.funding * 0.5;
      reasons.push(`£${Math.round(rent / 100)}/wk is within budget`);
    } else if (rent <= cap * 1.15) {
      score += W.funding * 0.2;
      flags.push(`£${Math.round(rent / 100)}/wk is a little over budget`);
    } else blockers.push(`£${Math.round(rent / 100)}/wk is over budget`);
  } else score += W.funding * 0.5 * (a.maxWeeklyRent ? 1 : UNKNOWN);

  // Availability
  const moveBy = a.moveBy ? new Date(a.moveBy) : null;
  const from = room?.availableFrom ?? advert.availableFrom;
  const reserved = room?.status === "RESERVED";
  if (reserved) {
    score += W.availability * 0.3;
    flags.push("Room is currently reserved");
  } else if (!from || from <= new Date() || (moveBy && from <= moveBy)) {
    score += W.availability;
    reasons.push(!from || from <= new Date() ? "Available now" : "Available in time");
  } else if (!moveBy) score += W.availability * UNKNOWN;
  else flags.push(`Not free until ${from.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`);

  return { score, reasons, flags, blockers };
}

/** Score an advert for a client, picking the best lettable room in it. */
export function matchClientToAdvert(client: MatchClient, advert: MatchAdvert): ClientMatch {
  const base = listingPart(client, advert);
  const rooms = advert.rooms.filter((r) => LETTABLE.has(r.status));
  const options = (rooms.length ? rooms : [null]).map((room) => ({ room, part: roomPart(client, advert, room) }));
  options.sort((x, y) => y.part.score - x.part.score || x.part.blockers.length - y.part.blockers.length);
  const best = options[0];

  const blockers = [...base.blockers, ...best.part.blockers];
  let score = base.score + best.part.score;
  // A hard mismatch keeps an advert visible (the referrer may know better) but never near the top.
  if (blockers.length) score = Math.min(score, 45 - (blockers.length - 1) * 10);

  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    room: best.room,
    reasons: [...base.reasons, ...best.part.reasons],
    flags: [...base.flags, ...best.part.flags],
    blockers,
  };
}

export const matchBand = (score: number) =>
  score >= 80 ? { label: "Strong match", tone: "text-pine-dark bg-pine-light" } :
  score >= 60 ? { label: "Good match", tone: "text-pine-dark bg-pine-light/60" } :
  score >= 46 ? { label: "Possible", tone: "text-clay bg-clay-light" } :
  { label: "Poor fit", tone: "text-ink-soft bg-paper-sunk" };
