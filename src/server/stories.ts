import "server-only";
import { db } from "@/lib/db";
import { money, publicLocation } from "@/lib/format";
import { showWhatsappContact } from "@/lib/whatsapp-display";
import { groupStories, OFFICIAL_STORY_KEY, type StoryGroup } from "@/lib/stories";

const companySelect = {
  id: true, name: true, slug: true, logoUrl: true, status: true, verification: true,
  whatsappEnabled: true, whatsappNumber: true, whatsappAddonStatus: true, whatsappGrantActive: true, whatsappGrantExpiresAt: true,
  subscription: { select: { status: true, membership: { select: { tier: true } } } },
  membershipGrants: { where: { revokedAt: null }, select: { startsAt: true, expiresAt: true, revokedAt: true, membership: { select: { tier: true } } } },
} as const;

/** Live stories for the public rail, grouped by provider. */
export async function liveStoryGroups(now = new Date()): Promise<StoryGroup[]> {
  const rows = await db.providerStory.findMany({
    where: { expiresAt: { gt: now }, OR: [{ companyId: null }, { company: { status: "ACTIVE" } }] },
    orderBy: { createdAt: "desc" },
    take: 120,
    select: {
      id: true, companyId: true, mediaType: true, mediaUrl: true, caption: true, createdAt: true, linkUrl: true,
      company: { select: companySelect },
      listing: { select: { id: true, title: true, status: true, weeklyRentFrom: true, property: { select: { city: true, area: true, postcode: true, showExactAddress: true, addressLine1: true } } } },
    },
  });
  const companies = new Map(rows.flatMap((row) => (row.company ? [[row.company.id, row.company] as const] : [])));
  const cards = rows.map((row) => {
    const listing = row.company && row.listing?.status === "ACTIVE" ? row.listing : null;
    return {
      id: row.id,
      companyId: row.companyId ?? OFFICIAL_STORY_KEY,
      mediaType: row.mediaType === "VIDEO" ? ("VIDEO" as const) : ("IMAGE" as const),
      mediaUrl: row.mediaUrl,
      caption: row.caption,
      createdAt: row.createdAt.toISOString(),
      listing: listing ? { id: listing.id, title: listing.title, price: listing.weeklyRentFrom ? money(listing.weeklyRentFrom, " a week") : "Rent on request", place: listing.property ? publicLocation(listing.property) : "" } : null,
      whatsapp: listing && row.company ? showWhatsappContact(listing.status, row.company) : false,
      link: row.companyId ? null : row.linkUrl,
    };
  });
  const groups = groupStories(cards).map((group): StoryGroup => {
    const stories = group.stories.map(({ companyId: _companyId, ...story }) => story);
    const company = companies.get(group.companyId);
    if (!company) return { companyId: OFFICIAL_STORY_KEY, companyName: "RoomsNow", slug: "", logoUrl: null, verified: true, official: true, stories };
    return { companyId: company.id, companyName: company.name, slug: company.slug, logoUrl: company.logoUrl, verified: company.verification === "APPROVED", official: false, stories };
  });
  // Official updates always lead the rail.
  return [...groups.filter((g) => g.official), ...groups.filter((g) => !g.official)];
}
