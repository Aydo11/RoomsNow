import { rentRange } from "./format";
import { ACCOMMODATION_TYPES, GENDER_ARRANGEMENTS, REFERRAL_ROUTES, supportLabel } from "./taxonomy";
import { responseLabel } from "./response-label";

/** The rows compared side by side on a shortlist and printed in the referral pack. */
export const SHORTLIST_ROWS = [
  "Rent",
  "Bills",
  "Housing Benefit",
  "Type",
  "Room free",
  "Who it's for",
  "Ages",
  "Support",
  "Facilities",
  "Step-free access",
  "Pets",
  "Referral routes",
  "Provider",
  "Replies",
] as const;

export type ShortlistFactInput = {
  accommodationType: string;
  genderArrangement: string;
  minAge: number | null;
  maxAge: number | null;
  wheelchairAccess: boolean;
  ensuite: boolean;
  furnished: boolean;
  selfContained: boolean;
  petsAllowed: boolean;
  housingBenefit: boolean;
  billsIncluded: boolean;
  referralRoutes: string[];
  weeklyRentFrom: number | null;
  weeklyRentTo: number | null;
  availableFrom: Date | null;
  supportTypes: string[];
  rooms: { status: string; availableFrom: Date | null; weeklyRent: number | null; name: string }[];
  company: {
    name: string;
    verification: string;
    responseMinutes: number | null;
    responseSampleSize: number;
    accreditations: { scheme: string; rating: string | null }[];
  };
};

function when(date: Date | null) {
  if (!date || date.getTime() <= Date.now()) return "Now";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function shortlistFacts(listing: ShortlistFactInput, bestRoom?: { name: string; weeklyRent: number | null } | null): Record<(typeof SHORTLIST_ROWS)[number], string> {
  const free = listing.rooms.filter((room) => room.status === "AVAILABLE");
  const soonest = listing.rooms
    .map((room) => room.availableFrom)
    .filter((date): date is Date => Boolean(date))
    .sort((a, b) => a.getTime() - b.getTime())[0];
  const facilities = [
    listing.selfContained ? "Self-contained" : listing.ensuite ? "En-suite" : "Shared bathroom",
    listing.furnished ? "Furnished" : "Unfurnished",
  ];
  const accreditations = listing.company.accreditations.map((a) => `${a.scheme}${a.rating ? ` (${a.rating})` : ""}`);
  return {
    Rent: bestRoom?.weeklyRent ? `£${Math.round(bestRoom.weeklyRent / 100)} per week (${bestRoom.name})` : rentRange(listing.weeklyRentFrom, listing.weeklyRentTo),
    Bills: listing.billsIncluded ? "Included" : "Not included",
    "Housing Benefit": listing.housingBenefit ? "Accepted" : "Not accepted",
    Type: ACCOMMODATION_TYPES[listing.accommodationType as keyof typeof ACCOMMODATION_TYPES] ?? "Other",
    "Room free": free.length ? `${free.length} now` : listing.rooms.length ? `From ${when(soonest ?? listing.availableFrom)}` : "No rooms free",
    "Who it's for": GENDER_ARRANGEMENTS[listing.genderArrangement as keyof typeof GENDER_ARRANGEMENTS] ?? "Any",
    Ages: listing.minAge || listing.maxAge ? `${listing.minAge ?? 16}–${listing.maxAge ?? "any"}` : "Any adult",
    Support: listing.supportTypes.length ? listing.supportTypes.map(supportLabel).join(", ") : "Not stated",
    Facilities: facilities.join(" · "),
    "Step-free access": listing.wheelchairAccess ? "Yes" : "No",
    Pets: listing.petsAllowed ? "Allowed" : "Not allowed",
    "Referral routes": listing.referralRoutes.length
      ? listing.referralRoutes.map((route) => REFERRAL_ROUTES[route as keyof typeof REFERRAL_ROUTES] ?? route).join(", ")
      : "Ask the provider",
    Provider: [listing.company.name, listing.company.verification === "APPROVED" ? "Verified" : null, ...accreditations].filter(Boolean).join(" · "),
    Replies: responseLabel(listing.company.responseMinutes, listing.company.responseSampleSize) ?? "Not enough messages yet",
  };
}
