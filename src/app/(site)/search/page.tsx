import Link from "next/link";
import { Suspense } from "react";
import { Filters, SortSelect, ViewToggle } from "@/components/filters";
import { SearchPanel } from "@/components/search-panel";
import { ListingCard } from "@/components/listing-card";
import { MapView } from "@/components/map-view";
import { Pagination } from "@/components/pagination";
import { RefineBar } from "@/components/refine-bar";
import { EmptyState } from "@/components/ui";
import { searchFacets, searchListings, searchMapPins, type SearchParams } from "@/server/search";
import { getCurrentUser } from "@/lib/session";
import { matchScore } from "@/lib/matching";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Search HMO Rooms & Accommodation Across the UK",
  description: "Search live HMO rooms, shared housing, supported accommodation and specialist vacancies across the UK by location, support, rent and availability.",
  path: "/search",
});
export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams & { view?: string }>;
}) {
  // Next.js 16 provides searchParams asynchronously. Awaiting them here is
  // important: otherwise view=map (and the other search filters) are silently
  // ignored during the server render.
  const params = await searchParams;
  const view = params.view === "map" ? "map" : "list";

  const [results, facets, user, map] = await Promise.all([
    searchListings(params),
    searchFacets(params),
    getCurrentUser(),
    view === "map" ? searchMapPins(params) : Promise.resolve(null),
  ]);

  // Compatibility is only shown to people who have told us what they need.
  const seeker = user?.profile
    ? {
        city: user.locationLabel,
        preferredLocations: user.profile.preferredLocations,
        supportTypes: user.profile.supportTypes,
        preferredTypes: user.profile.preferredTypes,
        availableFrom: user.profile.availableFrom,
        genderArrangement: user.profile.genderArrangement,
        age: user.profile.dateOfBirth
          ? Math.floor((Date.now() - user.profile.dateOfBirth.getTime()) / 31557600000)
          : null,
      }
    : null;

  // The empty state is the most-viewed screen while the marketplace is filling
  // up, so it points each audience at the thing that is actually useful to them
  // rather than sending everyone to the individual seeker's advert form.
  const noResults =
    user?.role === "REFERRER"
      ? {
          body: "Try widening the area or removing a support category. You can also add the client you're placing, so their details are ready to send the moment a suitable room is advertised.",
          actionHref: "/referrals/clients/new",
          actionLabel: "Add a client",
        }
      : user?.role === "PROVIDER"
        ? {
            body: "Try widening the area or removing a support category. If you have a vacancy in this area, advertising it puts you in front of the case workers searching here.",
            actionHref: "/provider/adverts/new",
            actionLabel: "Advertise a room",
          }
        : {
            body: "Try widening the area, removing a support category, or posting what you're looking for so providers can approach you.",
            actionHref: user ? "/dashboard/advert" : "/register?type=USER",
            actionLabel: "Post what you're looking for",
          };

  const scoreFor = (listing: (typeof results.items)[number]) =>
    seeker
      ? matchScore(seeker, {
          city: listing.property.city,
          supportTypes: listing.supportTypes,
          accommodationType: listing.accommodationType,
          availableFrom: listing.availableFrom,
          genderArrangement: listing.genderArrangement,
          minAge: listing.minAge,
          maxAge: listing.maxAge,
          wheelchairAccess: listing.wheelchairAccess,
          weeklyRentFrom: listing.weeklyRentFrom,
        }).score
      : undefined;

  const where = params.bbox
    ? " in this area"
    : params.where
      ? ` within ${results.radius} miles of ${params.where}`
      : " across the UK";
  const memberListings = results.items.filter((listing) => listing.memberListing);
  const freeListings = results.items.filter((listing) => !listing.memberListing);

  return (
    <>
      <div className="border-b border-line bg-white">
        <div className="shell py-6">
          <Suspense fallback={<div className="h-[76px]" />}>
            <SearchPanel size="compact" />
          </Suspense>
        </div>
      </div>

      <div className="shell grid gap-8 py-8 lg:grid-cols-[260px_1fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Suspense fallback={null}>
            <Filters />
          </Suspense>
        </aside>

        <div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-[28px]">Search HMO rooms and accommodation</h1>
              <p className="mt-1 text-[14px] text-ink-soft">
                {results.total.toLocaleString("en-GB")} {results.total === 1 ? "live advert" : "live adverts"}{where}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Suspense fallback={null}>
                <SortSelect />
                <ViewToggle view={view} />
              </Suspense>
            </div>
          </div>

          <Suspense fallback={null}>
            <RefineBar facets={facets} total={results.total} />
          </Suspense>

          {view === "map" && map ? (
            <div className="mt-5">
                <MapView
                pins={map.pins}
                centre={map.centre}
                capped={map.capped}
                total={map.total}
              />
            </div>
          ) : results.items.length === 0 && results.sponsored.length === 0 && results.boosted.length === 0 ? (
            <div className="mt-6">
              <EmptyState
                title="Nothing matches those filters yet"
                body={noResults.body}
                actionHref={noResults.actionHref}
                actionLabel={noResults.actionLabel}
              />
            </div>
          ) : (
            <>
              {results.boosted.length > 0 && (
                <section className="mt-6 rounded-card border border-pine/25 bg-pine-light/45 p-4 sm:p-5" aria-label="Boosted adverts">
                  <div className="flex flex-wrap items-end justify-between gap-2">
                    <div>
                      <span className="text-[12px] font-extrabold uppercase tracking-[0.1em] text-pine-dark">Boosted now</span>
                      <h2 className="mt-1 text-[22px] font-bold">Boosted accommodation</h2>
                    </div>
                    <p className="text-[13px] text-ink-soft">Priority placements rotate fairly</p>
                  </div>
                  <div className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                    {results.boosted.map((listing) => (
                      <ListingCard key={listing.id} listing={listing} match={scoreFor(listing)} distance={listing.distanceMiles} boosted />
                    ))}
                  </div>
                </section>
              )}

              {results.sponsored.length > 0 && (
                <section className="mt-6" aria-label="Sponsored adverts">
                  <div className="flex items-baseline justify-between gap-3">
                    <h2 className="text-[18px] font-bold text-clay">Sponsored accommodation</h2>
                    <Link href="/pricing#sponsored" className="text-[13px] text-ink-faint hover:text-ink-soft">
                      Why am I seeing these?
                    </Link>
                  </div>
                  <div className="mt-3 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                    {results.sponsored.map((listing) => (
                      <ListingCard
                        key={listing.id}
                        listing={listing}
                        match={scoreFor(listing)}
                        distance={listing.distanceMiles}
                        sponsored
                      />
                    ))}
                  </div>
                  <hr className="mt-7 border-line" />
                </section>
              )}

              {memberListings.length > 0 && (
                <section className="mt-6" aria-label="Member adverts">
                  <div className="flex items-baseline justify-between gap-3">
                    <h2 className="text-[16px] font-bold text-ink">Provider member listings</h2>
                    <span className="text-[12px] text-ink-faint">Paid members · ordered by your chosen sort</span>
                  </div>
                  <div className="mt-3 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                    {memberListings.map((listing) => (
                      <ListingCard key={listing.id} listing={listing} match={scoreFor(listing)} distance={listing.distanceMiles} memberListing />
                    ))}
                  </div>
                </section>
              )}

              {freeListings.length > 0 && (
                <section className="mt-8 border-t border-line pt-6" aria-label="Free adverts">
                  <h2 className="text-[15px] font-medium text-ink-soft">More accommodation</h2>
                  <div className="mt-3 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                    {freeListings.map((listing) => (
                      <ListingCard key={listing.id} listing={listing} match={scoreFor(listing)} distance={listing.distanceMiles} />
                    ))}
                  </div>
                </section>
              )}

              <Pagination page={results.page} pages={results.pages} truncated={results.truncated} />
            </>
          )}
        </div>
      </div>
    </>
  );
}
