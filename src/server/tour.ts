import "server-only";
import { db } from "@/lib/db";
import { publicLocation, rentRange } from "@/lib/format";
import { ACCOMMODATION_TYPES, supportLabel } from "@/lib/taxonomy";
import { youtubeId } from "@/lib/cover-image";
import { demoListingImage } from "@/lib/demo-listings";
import { responseLabel } from "@/lib/response-label";
import { htmlToText } from "@/lib/html-text";

/**
 * Data for Tour mode, the full-screen swipe feed of rooms. Everything here is
 * plain JSON so it can go straight to the client component.
 */
export type TourMedia =
  | { kind: "image"; url: string; caption: string | null }
  | { kind: "video"; url: string }
  | { kind: "youtube"; id: string };

export type TourSlide = {
  id: string;
  title: string;
  summary: string | null;
  description: string | null;
  rent: string;
  location: string;
  typeLabel: string;
  supports: string[];
  roomsAvailable: number;
  availableFrom: string | null;
  billsIncluded: boolean;
  housingBenefit: boolean;
  company: { name: string; slug: string; verified: boolean; response: string | null };
  media: TourMedia[];
  saved: boolean;
  /** Referrer tours only. */
  match?: { score: number; label: string } | null;
  referred?: boolean;
};

const MAX_MEDIA = 10;
const DESCRIPTION_LIMIT = 1200;

/**
 * Loads tour slides for these adverts, in the order given. Adverts that are no
 * longer live are dropped.
 */
export async function tourSlides(
  ids: string[],
  options: { userId?: string | null; matches?: Map<string, { score: number; label: string }>; referred?: Set<string> } = {},
): Promise<TourSlide[]> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return [];
  const [listings, saves] = await Promise.all([
    db.listing.findMany({
      where: { id: { in: unique }, status: "ACTIVE" },
      select: {
        id: true,
        title: true,
        summary: true,
        description: true,
        weeklyRentFrom: true,
        weeklyRentTo: true,
        accommodationType: true,
        supportTypes: true,
        availableFrom: true,
        billsIncluded: true,
        housingBenefit: true,
        property: { select: { city: true, area: true, postcode: true, showExactAddress: true, addressLine1: true } },
        company: { select: { name: true, slug: true, verification: true, responseMinutes: true, responseSampleSize: true } },
        rooms: { select: { status: true } },
        media: {
          where: { type: { in: ["IMAGE", "VIDEO", "VIDEO_URL"] } },
          orderBy: [{ isPrimary: "desc" }, { position: "asc" }],
          take: 20,
          select: { type: true, url: true, caption: true },
        },
      },
    }),
    options.userId
      ? db.savedListing.findMany({ where: { userId: options.userId, listingId: { in: unique } }, select: { listingId: true } })
      : Promise.resolve([]),
  ]);
  const savedIds = new Set(saves.map((save) => save.listingId));
  const byId = new Map(listings.map((listing) => [listing.id, listing]));

  return unique.flatMap((id) => {
    const listing = byId.get(id);
    if (!listing) return [];
    // A video tour leads the slide when there is one; photos follow.
    const videos: TourMedia[] = [];
    const photos: TourMedia[] = [];
    for (const item of listing.media) {
      if (item.type === "VIDEO") videos.push({ kind: "video", url: item.url });
      else if (item.type === "VIDEO_URL") {
        const yt = youtubeId(item.url);
        if (yt) videos.push({ kind: "youtube", id: yt });
      } else photos.push({ kind: "image", url: item.url, caption: item.caption });
    }
    let media = [...videos.slice(0, 1), ...photos].slice(0, MAX_MEDIA);
    if (media.length === 0) {
      // Same illustrative fallback as the listing cards, labelled as illustrative.
      const demo = demoListingImage(listing.id);
      media = [{ kind: "image", url: demo.url, caption: demo.caption }];
    }

    return [
      {
        id: listing.id,
        title: listing.title,
        summary: listing.summary,
        description: htmlToText(listing.description, DESCRIPTION_LIMIT),
        rent: rentRange(listing.weeklyRentFrom, listing.weeklyRentTo),
        location: publicLocation(listing.property),
        typeLabel: ACCOMMODATION_TYPES[listing.accommodationType as keyof typeof ACCOMMODATION_TYPES] ?? "Accommodation",
        supports: listing.supportTypes.slice(0, 4).map(supportLabel),
        roomsAvailable: listing.rooms.filter((room) => room.status === "AVAILABLE").length,
        availableFrom: listing.availableFrom ? listing.availableFrom.toISOString() : null,
        billsIncluded: listing.billsIncluded,
        housingBenefit: listing.housingBenefit,
        company: {
          name: listing.company.name,
          slug: listing.company.slug,
          verified: listing.company.verification === "APPROVED",
          response: responseLabel(listing.company.responseMinutes, listing.company.responseSampleSize),
        },
        media,
        saved: savedIds.has(listing.id),
        match: options.matches?.get(listing.id) ?? null,
        referred: options.referred?.has(listing.id) ?? false,
      },
    ];
  });
}
