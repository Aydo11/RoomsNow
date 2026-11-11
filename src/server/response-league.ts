import "server-only";
import { db } from "@/lib/db";
import { companyReplySamples } from "@/lib/response-time";
import { LEAGUE_DAYS, rankResponders } from "@/lib/response-league";

/** Cities with at least one live advert, for the league and area pages. */
export async function liveCities() {
  const rows = await db.property.findMany({
    where: { listings: { some: { status: "ACTIVE", company: { status: "ACTIVE" } } } },
    select: { city: true },
    distinct: ["city"],
  });
  return [...new Set(rows.map((r) => r.city.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

/**
 * The fastest-replying providers over the last 30 days, optionally limited to
 * providers with a live advert in one city.
 */
export async function responseLeague(city: string | null, limit = 20) {
  const ranked = rankResponders(await companyReplySamples(new Date(Date.now() - LEAGUE_DAYS * 24 * 60 * 60_000)));
  if (!ranked.length) return [];
  const companies = await db.company.findMany({
    where: {
      id: { in: ranked.map((r) => r.companyId) },
      status: "ACTIVE",
      listings: { some: { status: "ACTIVE", ...(city ? { property: { city: { equals: city, mode: "insensitive" } } } : {}) } },
    },
    select: { id: true, name: true, slug: true, logoUrl: true, verification: true },
  });
  const byId = new Map(companies.map((c) => [c.id, c]));
  return ranked
    .filter((r) => byId.has(r.companyId))
    .slice(0, limit)
    .map((r, index) => ({ ...r, rank: index + 1, company: byId.get(r.companyId)! }));
}
