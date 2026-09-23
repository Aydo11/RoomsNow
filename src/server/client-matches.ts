import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { distanceMiles, resolveArea } from "@/lib/geo";
import { parseAssessment } from "@/lib/assessment";
import { clientAreas, matchClientToAdvert, type ClientMatch, type MatchClient } from "@/lib/client-matching";
import { COVER_MEDIA } from "@/lib/cover-image";

/** Cap on adverts scored per request — plenty for the current marketplace size. */
const CANDIDATES = 400;

const matchListingSelect = () => ({
  id: true,
  title: true,
  accommodationType: true,
  genderArrangement: true,
  minAge: true,
  maxAge: true,
  wheelchairAccess: true,
  ensuite: true,
  furnished: true,
  selfContained: true,
  sharedFacilities: true,
  petsAllowed: true,
  housingBenefit: true,
  weeklyRentFrom: true,
  availableFrom: true,
  supportTypes: true,
  supportDescription: true,
  supportAvailability: true,
  description: true,
  media: COVER_MEDIA,
  property: { select: { city: true, area: true, postcode: true, latitude: true, longitude: true } },
  company: {
    select: {
      id: true,
      name: true,
      slug: true,
      verification: true,
      accreditations: {
        where: { status: "APPROVED", scheme: { in: ["CQC", "BVSC"] }, OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }] },
        select: { scheme: true, rating: true },
      },
    },
  },
  rooms: {
    where: { status: { in: ["AVAILABLE", "VOID", "RESERVED"] } },
    select: { id: true, name: true, status: true, ensuite: true, furnished: true, weeklyRent: true, availableFrom: true },
  },
}) satisfies Prisma.ListingSelect;

type CandidateListing = Prisma.ListingGetPayload<{ select: ReturnType<typeof matchListingSelect> }>;
export type ClientMatchRow = { listing: CandidateListing; match: ClientMatch; distance: number | null };

export async function matchesForClient(
  client: { dateOfBirth: Date | null; preferredLocation: string | null; supportTypes: string[]; assessment: unknown },
  options: { vettedOnly?: boolean } = {},
): Promise<{ rows: ClientMatchRow[]; considered: number }> {
  const matchClient: MatchClient = {
    dateOfBirth: client.dateOfBirth,
    preferredLocation: client.preferredLocation,
    supportTypes: client.supportTypes,
    assessment: parseAssessment(client.assessment),
  };

  const [listings, origin] = await Promise.all([
    db.listing.findMany({
      where: {
        status: "ACTIVE",
        company: {
          status: "ACTIVE",
          ...(options.vettedOnly
            ? { accreditations: { some: { status: "APPROVED", scheme: { in: ["CQC", "BVSC"] }, OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }] } } }
            : {}),
        },
        rooms: { some: { status: { in: ["AVAILABLE", "VOID", "RESERVED"] } } },
      },
      orderBy: { publishedAt: "desc" },
      take: CANDIDATES,
      select: matchListingSelect(),
    }),
    resolveArea(clientAreas(matchClient)[0]).catch(() => null),
  ]);

  const rows = listings.map((listing) => {
    const point =
      listing.property.latitude !== null && listing.property.longitude !== null
        ? { latitude: listing.property.latitude, longitude: listing.property.longitude }
        : null;
    const distance = origin && point ? distanceMiles(origin, point) : null;
    const match = matchClientToAdvert(matchClient, {
      city: listing.property.city,
      area: listing.property.area,
      postcode: listing.property.postcode,
      distanceMiles: distance,
      supportTypes: listing.supportTypes,
      supportText: [listing.supportAvailability, listing.supportDescription, listing.description].filter(Boolean).join(" "),
      accommodationType: listing.accommodationType,
      genderArrangement: listing.genderArrangement,
      minAge: listing.minAge,
      maxAge: listing.maxAge,
      wheelchairAccess: listing.wheelchairAccess,
      ensuite: listing.ensuite,
      furnished: listing.furnished,
      selfContained: listing.selfContained,
      petsAllowed: listing.petsAllowed,
      housingBenefit: listing.housingBenefit,
      weeklyRentFrom: listing.weeklyRentFrom,
      availableFrom: listing.availableFrom,
      sharedFacilities: listing.sharedFacilities,
      rooms: listing.rooms,
    });
    return { listing, match, distance };
  });

  rows.sort((a, b) => b.match.score - a.match.score || (a.distance ?? 999) - (b.distance ?? 999));
  return { rows, considered: listings.length };
}
