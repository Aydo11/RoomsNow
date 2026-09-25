import { locationSlug } from "./seo";

/**
 * Area pages for Google: "Supported housing in Handsworth", "Mental health
 * accommodation in Birmingham". Built from live adverts, so they only exist
 * where there's something real to show. Pure helpers here; the pages query.
 */

export const AREA_NEEDS = [
  { slug: "mental-health", support: "mental-health", phrase: "Mental health accommodation", short: "mental health support" },
  { slug: "homeless", support: "homelessness", phrase: "Accommodation for homeless people", short: "homelessness support" },
  { slug: "substance-misuse", support: "substance-misuse", phrase: "Substance misuse supported housing", short: "support with drugs or alcohol" },
  { slug: "learning-disability", support: "learning-disability", phrase: "Learning disability supported living", short: "learning disability support" },
  { slug: "physical-disability", support: "physical-disability", phrase: "Physical disability supported housing", short: "physical disability support" },
  { slug: "young-people", support: "young-people", phrase: "Supported housing for young people", short: "support for young people" },
  { slug: "care-leavers", support: "care-leavers", phrase: "Care leaver accommodation", short: "support for care leavers" },
  { slug: "vulnerable-adults", support: "vulnerable-adults", phrase: "Supported housing for vulnerable adults", short: "support for vulnerable adults" },
  { slug: "domestic-abuse", support: "domestic-abuse", phrase: "Supported housing after domestic abuse", short: "domestic abuse support" },
  { slug: "prison-leavers", support: "ex-offenders", phrase: "Accommodation for prison leavers", short: "support for prison leavers" },
] as const;

export type AreaNeed = (typeof AREA_NEEDS)[number];

export const needFromSlug = (slug: string): AreaNeed | null => AREA_NEEDS.find((need) => need.slug === slug) ?? null;
export const needForSupport = (support: string): AreaNeed | null => AREA_NEEDS.find((need) => need.support === support) ?? null;

export type PlaceProperty = { city: string; area: string | null };
export type Place = { kind: "city" | "area"; name: string; slug: string; city: string };

/** Every town and neighbourhood that has at least one property, cities first. */
export function placesFrom(properties: PlaceProperty[]): Place[] {
  const places = new Map<string, Place>();
  for (const property of properties) {
    const city = property.city.trim();
    const citySlug = locationSlug(city);
    if (citySlug && !places.has(citySlug)) places.set(citySlug, { kind: "city", name: city, slug: citySlug, city });
  }
  for (const property of properties) {
    const area = property.area?.trim();
    if (!area) continue;
    const slug = locationSlug(area);
    // A neighbourhood never takes over a town's address.
    if (slug && !places.has(slug)) places.set(slug, { kind: "area", name: area, slug, city: property.city.trim() });
  }
  return [...places.values()];
}

export function inPlace(place: Place, property: PlaceProperty): boolean {
  if (place.kind === "city") return locationSlug(property.city) === place.slug;
  return Boolean(property.area) && locationSlug(property.area!) === place.slug;
}

export type AreaListing = {
  weeklyRentFrom: number | null;
  weeklyRentTo: number | null;
  housingBenefit: boolean;
  billsIncluded: boolean;
  supportTypes: string[];
  referralRoutes: string[];
  companyId: string;
  rooms: { status: string }[];
};

export type AreaStats = {
  adverts: number;
  roomsFree: number;
  providers: number;
  lowestRent: number | null;
  typicalRent: number | null;
  housingBenefit: number;
  billsIncluded: number;
  selfReferral: number;
  needs: { need: AreaNeed; adverts: number }[];
};

export function areaStats(listings: AreaListing[]): AreaStats {
  const rents = listings
    .map((listing) => listing.weeklyRentFrom ?? listing.weeklyRentTo)
    .filter((rent): rent is number => typeof rent === "number" && rent > 0)
    .sort((a, b) => a - b);
  const counts = new Map<string, number>();
  for (const listing of listings) for (const support of new Set(listing.supportTypes)) counts.set(support, (counts.get(support) ?? 0) + 1);
  return {
    adverts: listings.length,
    roomsFree: listings.reduce((sum, listing) => sum + listing.rooms.filter((room) => room.status === "AVAILABLE").length, 0),
    providers: new Set(listings.map((listing) => listing.companyId)).size,
    lowestRent: rents[0] ?? null,
    typicalRent: rents.length ? rents[Math.floor((rents.length - 1) / 2)] : null,
    housingBenefit: listings.filter((listing) => listing.housingBenefit).length,
    billsIncluded: listings.filter((listing) => listing.billsIncluded).length,
    selfReferral: listings.filter((listing) => listing.referralRoutes.includes("SELF_REFERRAL") || listing.referralRoutes.includes("ANY")).length,
    needs: AREA_NEEDS.map((need) => ({ need, adverts: counts.get(need.support) ?? 0 }))
      .filter((row) => row.adverts > 0)
      .sort((a, b) => b.adverts - a.adverts),
  };
}

export const areaPath = (place: { slug: string }, need?: AreaNeed | null) =>
  need ? `/supported-housing/${place.slug}/${need.slug}` : `/supported-housing/${place.slug}`;

export const areaTitle = (place: { name: string }, need?: AreaNeed | null) =>
  need ? `${need.phrase} in ${place.name}` : `Supported housing in ${place.name}`;
