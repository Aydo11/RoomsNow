import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
import { COVER_MEDIA } from "@/lib/cover-image";
import { areaStats, inPlace, needFromSlug, placesFrom, type AreaNeed, type Place } from "@/lib/area-pages";

const LIVE = { status: "ACTIVE" as const, company: { status: "ACTIVE" as const } };

/** Every place with at least one live advert. */
export const livePlaces = cache(async (): Promise<Place[]> => {
  const properties = await db.property.findMany({
    where: { listings: { some: LIVE } },
    select: { city: true, area: true },
    distinct: ["city", "area"],
  });
  return placesFrom(properties);
});

const LISTING_INCLUDE = {
  company: { select: { id: true, name: true, slug: true, logoUrl: true, verification: true, responseMinutes: true, responseSampleSize: true } },
  property: { select: { city: true, area: true, postcode: true, showExactAddress: true, addressLine1: true, latitude: true, longitude: true, verification: true } },
  media: COVER_MEDIA,
  rooms: { select: { status: true } },
} as const;

/** Live adverts in one town (all its neighbourhoods). */
const cityListings = cache(async (city: string) =>
  db.listing.findMany({
    where: { ...LIVE, property: { city: { equals: city, mode: "insensitive" } } },
    orderBy: [{ publishedAt: "desc" }],
    include: LISTING_INCLUDE,
    take: 500,
  }),
);

export type AreaPageData = NonNullable<Awaited<ReturnType<typeof loadAreaPage>>>;

/** Everything an area page shows, or null when the place (or need) doesn't exist. */
export async function loadAreaPage(placeSlug: string, needSlug?: string) {
  const need: AreaNeed | null = needSlug ? needFromSlug(needSlug) : null;
  if (needSlug && !need) return null;
  const places = await livePlaces();
  const place = places.find((item) => item.slug === placeSlug);
  if (!place) return null;

  const inCity = await cityListings(place.city);
  const here = inCity.filter((listing) => inPlace(place, listing.property));
  const matching = need ? here.filter((listing) => listing.supportTypes.includes(need.support)) : here;
  // Rooms free now first, then the newest.
  const listings = [...matching].sort(
    (a, b) => b.rooms.filter((r) => r.status === "AVAILABLE").length - a.rooms.filter((r) => r.status === "AVAILABLE").length,
  );

  const stats = areaStats(matching);
  const placeStats = need ? areaStats(here) : stats;
  const neighbourhoods =
    place.kind === "city"
      ? places
          .filter((item) => item.kind === "area" && item.city.toLowerCase() === place.city.toLowerCase())
          .map((item) => ({
            place: item,
            adverts: inCity.filter((listing) => inPlace(item, listing.property) && (!need || listing.supportTypes.includes(need.support))).length,
          }))
          .filter((row) => row.adverts > 0)
          .sort((a, b) => b.adverts - a.adverts)
          .slice(0, 24)
      : [];
  const town = place.kind === "area" ? places.find((item) => item.kind === "city" && item.city.toLowerCase() === place.city.toLowerCase()) ?? null : null;

  return { place, need, listings, stats, placeStats, neighbourhoods, town };
}
