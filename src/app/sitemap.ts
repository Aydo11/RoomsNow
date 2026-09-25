import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { absoluteUrl, locationSlug } from "@/lib/seo";
import { guides } from "@/lib/guides";
import { AREA_NEEDS, areaPath, inPlace, placesFrom } from "@/lib/area-pages";

export const dynamic = "force-dynamic";

const staticPages: Array<[string, MetadataRoute.Sitemap[number]["changeFrequency"], number]> = [
  ["/", "daily", 1],
  ["/search", "daily", 0.9],
  ["/hmo-rooms", "weekly", 0.9],
  ["/supported-accommodation", "weekly", 0.9],
  ["/transitional-accommodation", "weekly", 0.8],
  ["/adult-social-care-accommodation", "weekly", 0.8],
  ["/hmo-rooms-birmingham", "daily", 0.8],
  ["/supported-accommodation-birmingham", "daily", 0.8],
  ["/supported-accommodation-manchester", "daily", 0.8],
  ["/transitional-accommodation-london", "daily", 0.8],
  ["/accommodation-for-care-leavers", "weekly", 0.8],
  ["/mental-health-supported-accommodation", "weekly", 0.8],
  ["/accommodation-for-prison-leavers", "weekly", 0.8],
  ["/advertise-accommodation", "monthly", 0.8],
  ["/accommodation-referrals", "monthly", 0.8],
  ["/how-it-works", "monthly", 0.6],
  ["/eligibility", "monthly", 0.7],
  ["/next-steps", "monthly", 0.7],
  ["/supported-housing", "daily", 0.8],
  ["/pricing", "monthly", 0.5],
  ["/safety", "monthly", 0.4],
  ["/verification", "monthly", 0.4],
  ["/guides", "weekly", 0.7],
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = staticPages.map(([path, changeFrequency, priority]) => ({
    url: absoluteUrl(path),
    changeFrequency,
    priority,
  }));
  const guidePages = guides.map((guide) => ({
    url: absoluteUrl(`/guides/${guide.slug}`),
    lastModified: new Date(guide.updatedAt),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  try {
    const [listings, companies, cities, areaListings] = await Promise.all([
      db.listing.findMany({
        where: { status: "ACTIVE", rooms: { some: { status: "AVAILABLE" } } },
        select: { id: true, updatedAt: true },
      }),
      db.company.findMany({
        where: { status: "ACTIVE", listings: { some: { status: "ACTIVE", rooms: { some: { status: "AVAILABLE" } } } } },
        select: { slug: true, updatedAt: true },
      }),
      db.property.findMany({
        where: { listings: { some: { status: "ACTIVE", rooms: { some: { status: "AVAILABLE" } } } } },
        select: { city: true, updatedAt: true },
        distinct: ["city"],
      }),
      db.listing.findMany({
        where: { status: "ACTIVE", company: { status: "ACTIVE" } },
        select: { supportTypes: true, updatedAt: true, property: { select: { city: true, area: true } } },
      }),
    ]);

    // Area pages ("Supported housing in Handsworth", "Mental health accommodation in
    // Birmingham"): only places and needs with at least one live advert.
    const areaPages: MetadataRoute.Sitemap = [];
    for (const place of placesFrom(areaListings.map((listing) => listing.property))) {
      const here = areaListings.filter((listing) => inPlace(place, listing.property));
      if (!here.length) continue;
      const latest = (rows: typeof here) => new Date(Math.max(...rows.map((row) => row.updatedAt.getTime())));
      areaPages.push({ url: absoluteUrl(areaPath(place)), lastModified: latest(here), changeFrequency: "daily", priority: 0.8 });
      for (const need of AREA_NEEDS) {
        const matching = here.filter((listing) => listing.supportTypes.includes(need.support));
        if (matching.length) areaPages.push({ url: absoluteUrl(areaPath(place, need)), lastModified: latest(matching), changeFrequency: "daily", priority: 0.7 });
      }
    }

    return [
      ...base,
      ...guidePages,
      ...areaPages,
      ...cities.map((city) => ({
        url: absoluteUrl(`/rooms/${locationSlug(city.city)}`),
        lastModified: city.updatedAt,
        changeFrequency: "daily" as const,
        priority: 0.8,
      })),
      ...listings.map((listing) => ({
        url: absoluteUrl(`/listings/${listing.id}`),
        lastModified: listing.updatedAt,
        changeFrequency: "daily" as const,
        priority: 0.8,
      })),
      ...companies.map((company) => ({
        url: absoluteUrl(`/companies/${company.slug}`),
        lastModified: company.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.6,
      })),
    ];
  } catch {
    return [...base, ...guidePages];
  }
}
