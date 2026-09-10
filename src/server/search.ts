import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
import { boundingBox, distanceMiles, resolveArea, type Point } from "@/lib/geo";
import { BOOST_SLOTS, rankBoosted, rotateHourly } from "@/lib/boost-packages";
import type { Prisma } from "@prisma/client";

// Search results, facets and map pins all resolve the same location during one
// render. React's request cache prevents duplicate geocoding/network calls.
const resolveAreaOnce = cache(resolveArea);

export type SearchParams = {
  q?: string;
  where?: string;
  support?: string[];
  type?: string[];
  from?: string;
  gender?: string;
  minAge?: string;
  wheelchair?: string;
  furnished?: string;
  ensuite?: string;
  selfContained?: string;
  referral?: string[];
  verified?: string;
  maxRent?: string;
  minRent?: string;
  radius?: string;
  /** Map viewport, as "minLng,minLat,maxLng,maxLat". Set by "search this area". */
  bbox?: string;
  sort?: string;
  page?: string;
};

export const PAGE_SIZE = 24;
/** Sponsored slots are capped and only ever shown on the first page. */
export const SPONSORED_SLOTS = 3;
const PROMOTED_POOL_LIMIT = 200;
/** Deep paging is pointless and expensive; past this we ask people to refine. */
export const MAX_PAGES = 40;
/** How many pins the map will draw before it asks for a tighter area. */
export const MAP_PIN_LIMIT = 500;

const LISTING_CARD_SELECT = {
  company: { select: { id: true, name: true, slug: true, logoUrl: true, verification: true } },
  property: {
    select: {
      city: true, area: true, postcode: true, showExactAddress: true,
      addressLine1: true, latitude: true, longitude: true, verification: true,
    },
  },
  media: { where: { type: "IMAGE" as const }, orderBy: [{ isPrimary: "desc" as const }, { position: "asc" as const }], take: 1 },
  rooms: { select: { status: true } },
} satisfies Prisma.ListingInclude;

export function parseArrayParam(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : value.split(",").filter(Boolean);
}

function parseBbox(value?: string) {
  if (!value) return null;
  const parts = value.split(",").map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return null;
  const [minLng, minLat, maxLng, maxLat] = parts;
  return { minLng, minLat, maxLng, maxLat };
}

/**
 * Free-text matching. Every word has to appear somewhere — title, summary,
 * description, support blurb, town, area or provider name — so "leeds dry house"
 * narrows rather than widens. Postgres handles this with the indexes in the
 * schema; if the catalogue grows past a few hundred thousand adverts, swap the
 * body of this function for a tsvector column or a search service. Nothing
 * outside it needs to change.
 */
function textFilter(query: string | undefined): Prisma.ListingWhereInput[] {
  const terms = (query ?? "").trim().toLowerCase().split(/\s+/).filter((t) => t.length > 1).slice(0, 6);
  if (!terms.length) return [];

  return terms.map((term) => ({
    OR: [
      { title: { contains: term, mode: "insensitive" as const } },
      { summary: { contains: term, mode: "insensitive" as const } },
      { description: { contains: term, mode: "insensitive" as const } },
      { supportDescription: { contains: term, mode: "insensitive" as const } },
      { eligibility: { contains: term, mode: "insensitive" as const } },
      { company: { name: { contains: term, mode: "insensitive" as const } } },
      { property: { city: { contains: term, mode: "insensitive" as const } } },
      { property: { area: { contains: term, mode: "insensitive" as const } } },
    ],
  }));
}

async function buildWhere(params: SearchParams) {
  const support = parseArrayParam(params.support);
  const types = parseArrayParam(params.type);
  const referral = parseArrayParam(params.referral);
  const bbox = parseBbox(params.bbox);

  // A place name or postcode becomes a radius search when we can geocode it,
  // and falls back to a plain name match when we can't.
  const radius = Math.min(100, Math.max(1, Number(params.radius ?? 15) || 15));
  const centre: Point | null = bbox ? null : await resolveAreaOnce(params.where);
  const box = bbox ?? (centre ? boundingBox(centre, radius) : null);

  const AND: Prisma.ListingWhereInput[] = [...textFilter(params.q)];

  if (box) {
    AND.push({
      property: {
        latitude: { gte: box.minLat, lte: box.maxLat },
        longitude: { gte: box.minLng, lte: box.maxLng },
      },
    });
  } else if (params.where) {
    AND.push({
      OR: [
        { property: { city: { contains: params.where, mode: "insensitive" } } },
        { property: { area: { contains: params.where, mode: "insensitive" } } },
        { property: { postcode: { startsWith: params.where.toUpperCase() } } },
      ],
    });
  }

  if (params.from) {
    AND.push({ OR: [{ availableFrom: null }, { availableFrom: { lte: new Date(params.from) } }] });
  }
  if (params.minAge) {
    AND.push({ OR: [{ minAge: null }, { minAge: { lte: Number(params.minAge) } }] });
  }

  const where: Prisma.ListingWhereInput = {
    status: "ACTIVE",
    company: {
      status: "ACTIVE",
      ...(params.verified === "1" ? { verification: "APPROVED" as const } : {}),
    },
    ...(support.length ? { supportTypes: { hasSome: support } } : {}),
    ...(types.length ? { accommodationType: { in: types as never } } : {}),
    ...(params.gender && params.gender !== "ANY"
      ? { genderArrangement: { in: [params.gender as never, "ANY"] } }
      : {}),
    ...(params.wheelchair === "1" ? { wheelchairAccess: true } : {}),
    ...(params.furnished === "1" ? { furnished: true } : {}),
    ...(params.ensuite === "1" ? { ensuite: true } : {}),
    ...(params.selfContained === "1" ? { selfContained: true } : {}),
    ...(referral.length ? { referralRoutes: { hasSome: referral as never } } : {}),
    ...(params.maxRent || params.minRent
      ? {
          weeklyRentFrom: {
            ...(params.maxRent ? { lte: Number(params.maxRent) * 100 } : {}),
            ...(params.minRent ? { gte: Number(params.minRent) * 100 } : {}),
          },
        }
      : {}),
    // Only show adverts that actually have somewhere to live.
    rooms: { some: { status: { in: ["AVAILABLE", "RESERVED", "VOID"] } } },
    ...(AND.length ? { AND } : {}),
  };

  return { where, centre, radius, bbox: box };
}

function orderFor(sort: string | undefined): Prisma.ListingOrderByWithRelationInput[] {
  switch (sort) {
    case "rent":
      return [{ weeklyRentFrom: "asc" }, { publishedAt: "desc" }];
    case "rent-desc":
      return [{ weeklyRentFrom: "desc" }, { publishedAt: "desc" }];
    case "available":
      return [{ availableFrom: "asc" }, { publishedAt: "desc" }];
    case "newest":
      return [{ publishedAt: "desc" }];
    default:
      // Default order still favours adverts people can actually move into soon.
      return [{ availableFrom: "asc" }, { publishedAt: "desc" }];
  }
}

function paidMemberLane(now: Date): Prisma.ListingWhereInput {
  return {
    OR: [
      {
        company: {
          subscription: {
            is: {
              status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] },
              membership: { audience: "PROVIDER", priceMonthly: { gt: 0 } },
            },
          },
        },
      },
      {
        company: {
          membershipGrants: {
            some: {
              startsAt: { lte: now },
              revokedAt: null,
              OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
              membership: { audience: "PROVIDER", priceMonthly: { gt: 0 } },
            },
          },
        },
      },
    ],
  };
}

function rankSponsored<T extends { id: string }>(items: T[], now: Date) {
  return rotateHourly([...items].sort((a, b) => a.id.localeCompare(b.id)), now);
}

/**
 * Public search. Only ACTIVE adverts from ACTIVE companies are ever returned.
 *
 * Four separate lanes keep placement clear and predictable: boosted, sponsored,
 * paid members, then free adverts. Rotation within promoted lanes prevents one
 * provider holding the same top position indefinitely.
 */
export async function searchListings(params: SearchParams) {
  const requestedPage = Math.max(1, Number(params.page ?? 1) || 1);
  const page = Math.min(requestedPage, MAX_PAGES);
  const { where, centre, radius, bbox } = await buildWhere(params);
  const now = new Date();

  const activeBoost: Prisma.ListingWhereInput = {
    boostStartsAt: { lte: now },
    boostedUntil: { gt: now },
  };
  // Spell out inactive states instead of negating date comparisons. SQL treats
  // comparisons with NULL as unknown, which previously hid ordinary adverts
  // that had never been boosted.
  const inactiveBoost: Prisma.ListingWhereInput = {
    OR: [
      { boostStartsAt: null },
      { boostedUntil: null },
      { boostStartsAt: { gt: now } },
      { boostedUntil: { lte: now } },
    ],
  };
  const activeSponsor: Prisma.ListingWhereInput = {
    featured: true,
    OR: [{ featuredUntil: null }, { featuredUntil: { gt: now } }],
  };
  const inactiveSponsor: Prisma.ListingWhereInput = {
    OR: [{ featured: false }, { featuredUntil: { lte: now } }],
  };

  const sponsoredWhere: Prisma.ListingWhereInput = {
    AND: [where, activeSponsor, inactiveBoost],
  };
  const boostedWhere: Prisma.ListingWhereInput = {
    AND: [where, activeBoost],
  };
  const organicWhere: Prisma.ListingWhereInput = {
    AND: [where, inactiveSponsor, inactiveBoost],
  };
  const memberLane = paidMemberLane(now);
  const paidWhere: Prisma.ListingWhereInput = { AND: [organicWhere, memberLane] };
  const freeWhere: Prisma.ListingWhereInput = { AND: [organicWhere, { NOT: memberLane }] };

  const [boostedPool, sponsoredPool, paidCount, freeCount, total] = await Promise.all([
    page === 1
      ? db.listing.findMany({ where: boostedWhere, orderBy: { boostStartsAt: "desc" }, take: PROMOTED_POOL_LIMIT, include: LISTING_CARD_SELECT })
      : Promise.resolve([]),
    page === 1
      ? db.listing.findMany({ where: sponsoredWhere, orderBy: { publishedAt: "desc" }, take: PROMOTED_POOL_LIMIT, include: LISTING_CARD_SELECT })
      : Promise.resolve([]),
    db.listing.count({ where: paidWhere }),
    db.listing.count({ where: freeWhere }),
    db.listing.count({ where }),
  ]);
  const boosted = rankBoosted(boostedPool, now).slice(0, BOOST_SLOTS);
  const sponsored = rankSponsored(sponsoredPool, now).slice(0, SPONSORED_SLOTS);

  const offset = (page - 1) * PAGE_SIZE;
  const paidSkip = Math.min(offset, paidCount);
  const paidTake = Math.min(PAGE_SIZE, Math.max(0, paidCount - paidSkip));
  const freeSkip = Math.max(0, offset - paidCount);
  const freeTake = PAGE_SIZE - paidTake;
  const [paidItems, freeItems] = await Promise.all([
    paidTake
      ? db.listing.findMany({ where: paidWhere, orderBy: orderFor(params.sort), skip: paidSkip, take: paidTake, include: LISTING_CARD_SELECT })
      : Promise.resolve([]),
    freeTake
      ? db.listing.findMany({ where: freeWhere, orderBy: orderFor(params.sort), skip: freeSkip, take: freeTake, include: LISTING_CARD_SELECT })
      : Promise.resolve([]),
  ]);
  const items = [
    ...paidItems.map((listing) => ({ ...listing, memberListing: true })),
    ...freeItems.map((listing) => ({ ...listing, memberListing: false })),
  ];

  const sponsoredIds = sponsored.map((listing) => listing.id);
  const boostedIds = boosted.map((listing) => listing.id);
  if (sponsoredIds.length) {
    await db.listing.updateMany({
      where: { id: { in: sponsoredIds } },
      data: { sponsoredImpressions: { increment: 1 } },
    });
  }
  if (boostedIds.length) {
    await db.listing.updateMany({
      where: { id: { in: boostedIds } },
      data: { boostedImpressions: { increment: 1 } },
    });
  }

  const distanceFrom = (
    property: { latitude: number | null; longitude: number | null },
  ): number | null =>
    centre && property.latitude !== null && property.longitude !== null
      ? distanceMiles(centre, { latitude: property.latitude, longitude: property.longitude })
      : null;

  return {
    items: items.map((listing) => ({ ...listing, distanceMiles: distanceFrom(listing.property) })),
    boosted: boosted.map((listing) => ({
      ...listing,
      memberListing: true,
      distanceMiles: distanceFrom(listing.property),
    })),
    sponsored: sponsored.map((listing) => ({
      ...listing,
      memberListing: true,
      distanceMiles: distanceFrom(listing.property),
    })),
    total,
    page,
    pages: Math.min(MAX_PAGES, Math.max(1, Math.ceil((paidCount + freeCount) / PAGE_SIZE))),
    truncated: Math.ceil((paidCount + freeCount) / PAGE_SIZE) > MAX_PAGES,
    centre,
    radius,
    bbox,
  };
}

type RankedSearchResult = Awaited<ReturnType<typeof searchListings>>["items"][number];
export type SearchResult = Omit<RankedSearchResult, "memberListing"> & { memberListing?: boolean };

/**
 * Counts for the refine panel, so people can narrow a big result set without
 * guessing which filter will empty it. One grouped query, not one per facet.
 */
export async function searchFacets(params: SearchParams) {
  const { where } = await buildWhere(params);

  const [byType, byCity, verified, wheelchair] = await Promise.all([
    db.listing.groupBy({ by: ["accommodationType"], where, _count: true }),
    db.listing.findMany({ where, select: { property: { select: { city: true } } }, take: 2000 }),
    db.listing.count({ where: { ...where, company: { status: "ACTIVE", verification: "APPROVED" } } }),
    db.listing.count({ where: { ...where, wheelchairAccess: true } }),
  ]);

  const cities = new Map<string, number>();
  for (const row of byCity) {
    cities.set(row.property.city, (cities.get(row.property.city) ?? 0) + 1);
  }

  return {
    types: byType.map((row) => ({ value: row.accommodationType, count: row._count })),
    cities: [...cities.entries()]
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8),
    verified,
    wheelchair,
  };
}

/**
 * Pins for the map. Deliberately lightweight — no media, no company — because a
 * viewport can hold far more adverts than a page of cards.
 */
export async function searchMapPins(params: SearchParams) {
  const { where, centre, bbox } = await buildWhere(params);

  const [pins, total] = await Promise.all([
    db.listing.findMany({
      where: { ...where, property: { latitude: { not: null }, longitude: { not: null } } },
      orderBy: [{ featured: "desc" }, { publishedAt: "desc" }],
      take: MAP_PIN_LIMIT,
      select: {
        id: true,
        title: true,
        featured: true,
        weeklyRentFrom: true,
        weeklyRentTo: true,
        property: { select: { city: true, area: true, latitude: true, longitude: true } },
        rooms: { select: { status: true } },
      },
    }),
    db.listing.count({ where }),
  ]);

  return {
    pins: pins.map((listing) => ({
      id: listing.id,
      title: listing.title,
      city: listing.property.area ?? listing.property.city,
      latitude: listing.property.latitude!,
      longitude: listing.property.longitude!,
      available: listing.rooms.filter((room) => room.status === "AVAILABLE").length,
      rooms: listing.rooms.length,
      sponsored: listing.featured,
      rentFrom: listing.weeklyRentFrom,
      rentTo: listing.weeklyRentTo,
    })),
    total,
    capped: total > MAP_PIN_LIMIT,
    centre,
    bbox,
  };
}

export async function searchLookingForAds(params: {
  where?: string;
  support?: string[];
  type?: string[];
  minAge?: string;
  maxAge?: string;
  page?: string;
}) {
  const support = parseArrayParam(params.support);
  const types = parseArrayParam(params.type);
  const page = Math.max(1, Number(params.page ?? 1) || 1);

  const where: Prisma.LookingForAdWhereInput = {
    status: "ACTIVE",
    // Only people who have explicitly opted into being found by providers.
    user: { status: "ACTIVE", profile: { discoverable: true } },
    ...(params.where ? { city: { contains: params.where, mode: "insensitive" } } : {}),
    ...(support.length ? { supportTypes: { hasSome: support } } : {}),
    ...(types.length ? { accommodationTypes: { hasSome: types as never } } : {}),
    ...(params.minAge ? { age: { gte: Number(params.minAge) } } : {}),
    ...(params.maxAge ? { age: { lte: Number(params.maxAge) } } : {}),
  };

  const [items, total] = await Promise.all([
    db.lookingForAd.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            profile: { select: { showPhoto: true, photoUrl: true, showAge: true, showLocation: true } },
          },
        },
      },
    }),
    db.lookingForAd.count({ where }),
  ]);

  return { items, total, page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function getListing(id: string) {
  return db.listing.findUnique({
    where: { id },
    include: {
      company: {
        select: {
          id: true, name: true, slug: true, about: true, logoUrl: true,
          verification: true, orgType: true, city: true, status: true,
          subscription: { include: { membership: true } },
          membershipGrants: {
            where: { revokedAt: null },
            include: { membership: true },
            orderBy: { createdAt: "desc" },
          },
        },
      },
      property: true,
      media: {
        orderBy: [{ isPrimary: "desc" }, { position: "asc" }],
        include: { room: { select: { id: true, name: true } } },
      },
      rooms: { orderBy: { name: "asc" } },
    },
  });
}

export type ListingDetail = NonNullable<Awaited<ReturnType<typeof getListing>>>;
