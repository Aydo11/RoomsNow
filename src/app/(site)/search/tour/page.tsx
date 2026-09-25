import { searchListings, type SearchParams } from "@/server/search";
import { tourSlides } from "@/server/tour";
import { getCurrentUser } from "@/lib/session";
import { TourFeed } from "@/components/tour-feed";

export const metadata = { title: "Tour mode", robots: { index: false, follow: true } };
export const dynamic = "force-dynamic";

/** Rebuilds a search query string from the parsed params, minus the given keys. */
function queryString(params: Record<string, string | string[] | undefined>, omit: string[] = [], extra: Record<string, string> = {}) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (omit.includes(key) || value == null || value === "") continue;
    for (const item of Array.isArray(value) ? value : [value]) search.append(key, item);
  }
  for (const [key, value] of Object.entries(extra)) search.set(key, value);
  const text = search.toString();
  return text ? `?${text}` : "";
}

/**
 * Tour mode for search results: the same rooms as /search with the same
 * filters (boosted and sponsored first, then the rest), one full screen at a time.
 */
export default async function SearchTourPage({ searchParams }: { searchParams: Promise<SearchParams & { view?: string }> }) {
  const params = await searchParams;
  const [results, user] = await Promise.all([searchListings(params), getCurrentUser()]);
  const ids = [...results.boosted, ...results.sponsored, ...results.items].map((listing) => listing.id);
  const slides = await tourSlides(ids, { userId: user?.id });

  const raw = params as Record<string, string | string[] | undefined>;
  const listQuery = queryString(raw, ["view"]);
  const page = results.page;
  const heading = params.where ? `Rooms near ${params.where}` : "Rooms across the UK";
  const hasFilters = Object.keys(raw).some((key) => !["view", "page", "sort", "where", "radius"].includes(key) && raw[key]);

  return (
    <TourFeed
      slides={slides}
      heading={heading}
      backHref={`/search${listQuery}`}
      signedIn={Boolean(user)}
      loginHref={`/login?next=${encodeURIComponent(`/search/tour${listQuery}`)}`}
      refer={user?.role === "REFERRER" ? {} : null}
      moreHref={page < results.pages ? `/search/tour${queryString(raw, ["view"], { page: String(page + 1) })}` : null}
      widenHref={
        hasFilters
          ? `/search/tour${params.where ? `?where=${encodeURIComponent(params.where)}` : ""}`
          : params.where
            ? `/search/tour${queryString(raw, ["view", "page"], { radius: "50" })}`
            : null
      }
    />
  );
}
