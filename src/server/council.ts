import "server-only";
import { db } from "@/lib/db";
import { inCouncilArea } from "@/lib/council-areas";
import { median } from "@/lib/response-label";
import { supportLabel } from "@/lib/taxonomy";

const DAY = 24 * 60 * 60 * 1000;

export type CouncilRange = "30" | "90" | "365";

/**
 * Aggregate figures for a council's areas. Nothing here identifies a person:
 * only counts, medians and rates. Providers are named in the vacancies table
 * because their adverts are public anyway.
 */
export async function councilStats(areas: string[], range: CouncilRange) {
  const since = new Date(Date.now() - Number(range) * DAY);

  const [listings, referrals] = await Promise.all([
    db.listing.findMany({
      where: { status: "ACTIVE", company: { status: "ACTIVE" } },
      select: {
        id: true,
        supportTypes: true,
        housingBenefit: true,
        companyId: true,
        property: { select: { city: true, area: true, postcode: true } },
        rooms: { select: { status: true } },
      },
      take: 5000,
    }),
    db.referral.findMany({
      where: { OR: [{ createdAt: { gte: since } }, { events: { some: { status: "MOVED_IN", createdAt: { gte: since } } } }], listingId: { not: null } },
      select: {
        id: true,
        createdAt: true,
        status: true,
        referrerId: true,
        supportTypes: true,
        listing: { select: { property: { select: { city: true, area: true, postcode: true } } } },
        events: { orderBy: { createdAt: "asc" }, select: { status: true, createdAt: true } },
        checkIns: { select: { week: true, health: true } },
      },
      take: 10000,
    }),
  ]);

  // Supply: live adverts and free rooms in the council's areas.
  const local = listings.filter((listing) => inCouncilArea(areas, listing.property));
  const roomsFree = (listing: (typeof local)[number]) => listing.rooms.filter((room) => room.status === "AVAILABLE").length;
  const byArea = new Map<string, { adverts: number; rooms: number }>();
  const bySupport = new Map<string, { rooms: number; referrals: number }>();
  for (const listing of local) {
    const name = listing.property.area || listing.property.city;
    const entry = byArea.get(name) ?? { adverts: 0, rooms: 0 };
    entry.adverts += 1;
    entry.rooms += roomsFree(listing);
    byArea.set(name, entry);
    for (const slug of listing.supportTypes) {
      const s = bySupport.get(slug) ?? { rooms: 0, referrals: 0 };
      s.rooms += roomsFree(listing);
      bySupport.set(slug, s);
    }
  }

  // Demand and outcomes: referrals into rooms in the council's areas.
  const localReferrals = referrals.filter((referral) => referral.listing && inCouncilArea(areas, referral.listing.property));
  const made = localReferrals.filter((referral) => referral.createdAt >= since);
  for (const referral of made) {
    for (const slug of referral.supportTypes) {
      const s = bySupport.get(slug) ?? { rooms: 0, referrals: 0 };
      s.referrals += 1;
      bySupport.set(slug, s);
    }
  }
  const placed = localReferrals.filter((referral) => referral.events.some((e) => e.status === "MOVED_IN" && e.createdAt >= since));
  const daysToPlace = placed.map((referral) => {
    const movedIn = referral.events.find((e) => e.status === "MOVED_IN")!;
    return (movedIn.createdAt.getTime() - referral.createdAt.getTime()) / DAY;
  });
  const daysToReply = made.flatMap((referral) => {
    const reply = referral.events.find((e) => e.status !== "SUBMITTED");
    const days = reply ? (reply.createdAt.getTime() - referral.createdAt.getTime()) / DAY : -1;
    return days >= 0 ? [days] : [];
  });

  // Sustainment from the 12-week check-ins (falls back to 4-week while few exist).
  const outcomes = (week: number) => {
    const answered = localReferrals.filter((referral) => referral.checkIns.some((c) => c.week === week));
    const worst = answered.map((referral) => {
      const healths = referral.checkIns.filter((c) => c.week === week).map((c) => c.health);
      if (healths.includes("ENDED")) return "ENDED";
      if (healths.includes("AT_RISK")) return "AT_RISK";
      if (healths.includes("SOME_CONCERNS")) return "SOME_CONCERNS";
      return "GOING_WELL";
    });
    const count = (h: string) => worst.filter((w) => w === h).length;
    return {
      answered: answered.length,
      goingWell: count("GOING_WELL"),
      concerns: count("SOME_CONCERNS"),
      atRisk: count("AT_RISK"),
      ended: count("ENDED"),
    };
  };
  const week4 = outcomes(4);
  const week12 = outcomes(12);
  const currentlyAtRisk = localReferrals.filter((referral) => referral.status === "MOVED_IN" && referral.checkIns.some((c) => c.health === "AT_RISK")).length;

  return {
    adverts: local.length,
    roomsFree: local.reduce((sum, listing) => sum + roomsFree(listing), 0),
    providers: new Set(local.map((listing) => listing.companyId)).size,
    housingBenefitAdverts: local.filter((listing) => listing.housingBenefit).length,
    areas: [...byArea.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.rooms - a.rooms || b.adverts - a.adverts),
    support: [...bySupport.entries()]
      .map(([slug, v]) => ({ label: supportLabel(slug), ...v }))
      .sort((a, b) => b.referrals - a.referrals || b.rooms - a.rooms),
    referralsMade: made.length,
    agencies: new Set(made.map((referral) => referral.referrerId)).size,
    placed: placed.length,
    placementRate: made.length ? Math.round((made.filter((r) => r.status === "MOVED_IN").length / made.length) * 100) : null,
    medianDaysToPlace: median(daysToPlace),
    medianDaysToReply: median(daysToReply),
    week4,
    week12,
    currentlyAtRisk,
  };
}
