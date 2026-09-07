import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { absoluteUrl, locationSlug } from "@/lib/seo";
import { guides } from "@/lib/guides";

export const dynamic = "force-dynamic";

const staticPages: Array<[string, MetadataRoute.Sitemap[number]["changeFrequency"], number]> = [
  ["/", "daily", 1],
  ["/search", "daily", 0.9],
  ["/hmo-rooms", "weekly", 0.9],
  ["/supported-accommodation", "weekly", 0.9],
  ["/transitional-accommodation", "weekly", 0.8],
  ["/adult-social-care-accommodation", "weekly", 0.8],
  ["/advertise-accommodation", "monthly", 0.8],
  ["/accommodation-referrals", "monthly", 0.8],
  ["/how-it-works", "monthly", 0.6],
  ["/pricing", "monthly", 0.5],
  ["/safety", "monthly", 0.4],
  ["/verification", "monthly", 0.4],
  ["/guides", "weekly", 0.7],
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const base = staticPages.map(([path, changeFrequency, priority]) => ({
    url: absoluteUrl(path),
    lastModified: now,
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
    const [listings, companies, cities] = await Promise.all([
      db.listing.findMany({
        where: { status: "ACTIVE" },
        select: { id: true, updatedAt: true },
      }),
      db.company.findMany({
        where: { status: "ACTIVE", listings: { some: { status: "ACTIVE" } } },
        select: { slug: true, updatedAt: true },
      }),
      db.property.findMany({
        where: { listings: { some: { status: "ACTIVE" } } },
        select: { city: true, updatedAt: true },
        distinct: ["city"],
      }),
    ]);

    return [
      ...base,
      ...guidePages,
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
