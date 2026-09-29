import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { resolveArea } from "@/lib/geo";
import { loadPublicAdverts, marketplaceViewer, recordServiceEvent, viewerAccess } from "@/server/service-marketplace";
import { ServiceAdvertCard, ServicePreviewTile, ServicesTabs } from "@/components/service-cards";
import { PaymentsNote } from "@/components/service-ui";
import {
  ActiveFilterChips,
  SectionHeading,
  ServiceCategoryTiles,
  ServiceHowItWorks,
  ServiceSearchHero,
  type MarketplaceStats,
} from "@/components/service-marketplace-ui";
import { ServiceSortSelect } from "@/components/service-sort-select";
import {
  canContactServiceBusiness,
  categoryLabel,
  isServiceCategory,
  isServiceSort,
  isSponsored,
  isBoosted,
  matchesFilters,
  previewCard,
  rankAdverts,
  SERVICE_CATEGORIES,
  type ServiceFilters,
} from "@/lib/service-marketplace";
import { poundsToPence } from "@/lib/service-validation";
import { clsx } from "@/lib/clsx";

export const metadata = { title: "Provider Services · Trades and suppliers for housing providers", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const PER_PAGE = 24;
type Params = { q?: string; category?: string; location?: string; radius?: string; verified?: string; emergency?: string; rating?: string; maxPrice?: string; sort?: string; page?: string };

function parseFilters(params: Params): ServiceFilters {
  const radius = Number(params.radius);
  const rating = Number(params.rating);
  const maxPrice = params.maxPrice ? poundsToPence(params.maxPrice) : null;
  return {
    q: params.q?.trim().slice(0, 80) || undefined,
    category: params.category && isServiceCategory(params.category) ? params.category : undefined,
    location: params.location?.trim().slice(0, 60) || undefined,
    radius: Number.isFinite(radius) && radius > 0 ? Math.min(radius, 100) : undefined,
    verifiedOnly: params.verified === "1",
    emergency: params.emergency === "1",
    minRating: Number.isFinite(rating) && rating >= 1 && rating <= 5 ? rating : undefined,
    maxPrice: maxPrice !== null && Number.isFinite(maxPrice) ? maxPrice : undefined,
    sort: isServiceSort(params.sort) ? params.sort : "recommended",
  };
}

export default async function ServicesPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (user?.role === "SERVICE_PROVIDER") redirect("/service-provider");
  const access = viewerAccess(user);

  if (access === "none") return <ServicesForEveryoneElse signedIn={Boolean(user)} />;

  const filters = parseFilters(params);
  const all = await loadPublicAdverts();
  const categoryCounts = SERVICE_CATEGORIES.map((category) => ({ ...category, count: all.filter((advert) => advert.category === category.slug).length }));
  const countsBySlug = Object.fromEntries(categoryCounts.map((c) => [c.slug, c.count]));
  const businesses = new Map(all.map((advert) => [advert.business.id, advert.business]));
  const rated = [...businesses.values()].filter((b) => b.rating !== null);
  const stats: MarketplaceStats = {
    services: all.length,
    businesses: businesses.size,
    verified: [...businesses.values()].filter((b) => b.verified).length,
    rating: rated.length ? Math.round((rated.reduce((sum, b) => sum + (b.rating ?? 0), 0) / rated.length) * 10) / 10 : null,
  };

  if (access === "preview") {
    // Server-side redaction: only previewCard() output reaches the page.
    const sample = all.filter((advert) => !filters.category || advert.category === filters.category).slice(0, 12).map(previewCard);
    return (
      <div>
        <ServiceSearchHero category={filters.category} stats={stats}>
          <div className="flex flex-wrap gap-2">
            <Link href="/provider/membership" className="btn-primary">Unlock Provider Services</Link>
            <Link href="/pricing" className="btn-secondary">Compare memberships</Link>
          </div>
        </ServiceSearchHero>
        <div className="shell space-y-10 py-8 sm:py-10">
          <section aria-labelledby="categories-heading">
            <SectionHeading title="Browse by category" subtitle="Preview what's available. Business names and contact details unlock with a paid membership." />
            <ServiceCategoryTiles counts={countsBySlug} active={filters.category} />
          </section>

          <section aria-labelledby="preview-heading">
            <SectionHeading title={filters.category ? categoryLabel(filters.category) : "A preview of what's on offer"} href={filters.category ? "/services" : undefined} linkLabel="All categories" />
            {sample.length > 0 ? (
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {sample.map((card, index) => <li key={index}><ServicePreviewTile card={card} /></li>)}
              </ul>
            ) : (
              <p className="card p-6 text-[15px] text-ink-soft">Businesses are joining now. Upgrade and you&apos;ll see them the moment they&apos;re approved.</p>
            )}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-card border border-brand/30 bg-brand/5 p-5">
              <p className="max-w-[60ch] text-[14.5px] text-ink">
                Business names, contact details, full descriptions, reviews, quote requests and messaging are included with Professional and Business memberships.
              </p>
              <Link href="/provider/membership" className="btn-primary">Upgrade now</Link>
            </div>
          </section>
          <ServiceHowItWorks />
        </div>
      </div>
    );
  }

  // Full access.
  const point = filters.location && filters.radius ? await resolveArea(filters.location) : null;
  const matching = all.filter((advert) => matchesFilters(advert, filters, point));
  const seed = `${new Date().toISOString().slice(0, 10)}:${user!.id}`;
  const ranked = rankAdverts(matching, filters, seed);
  const pages = Math.max(1, Math.ceil(ranked.length / PER_PAGE));
  const page = Math.min(Math.max(1, Number(params.page) || 1), pages);
  const shown = ranked.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const [favourites] = await Promise.all([
    db.serviceFavourite.findMany({ where: { userId: user!.id, advertId: { in: shown.map((a) => a.id) } }, select: { advertId: true } }),
    // Count a top-slot view for each boosted advert shown, for the business's boost report.
    shown.some((a) => a.promoted)
      ? db.serviceBoost.updateMany({ where: { advertId: { in: shown.filter((a) => a.promoted).map((a) => a.id) }, startsAt: { lte: new Date() }, endsAt: { gt: new Date() } }, data: { impressions: { increment: 1 } } })
      : null,
    shown.some((a) => a.sponsored)
      ? db.serviceAdvert.updateMany({ where: { id: { in: shown.filter((a) => a.sponsored).map((a) => a.id) }, sponsoredUntil: { gt: new Date() } }, data: { sponsoredImpressions: { increment: 1 } } })
      : null,
    filters.category || filters.location ? recordServiceEvent({ type: "SEARCH", category: filters.category, location: filters.location }) : null,
  ]);
  const saved = new Set(favourites.map((f) => f.advertId));
  const canAct = canContactServiceBusiness(marketplaceViewer(user));
  const advancedFilters = [filters.location, filters.minRating, filters.maxPrice !== undefined, filters.verifiedOnly, filters.emergency, filters.sort !== "recommended"].filter(Boolean).length;

  const query = (overrides: Partial<Params>) => {
    const next = new URLSearchParams();
    for (const [key, value] of Object.entries({ ...params, ...overrides })) if (value) next.set(key, String(value));
    return `/services?${next.toString()}`;
  };

  const browsing = !filters.q && !filters.category && !filters.location && !filters.verifiedOnly && !filters.emergency && !filters.minRating && filters.maxPrice === undefined && page === 1;
  const now = new Date();
  const organic = all.filter((advert) => !isBoosted(advert, now) && !isSponsored(advert, now));
  const rails = browsing && all.length >= 6
    ? [
        {
          key: "rated",
          title: "Top rated by providers",
          subtitle: "Highest average rating from completed jobs",
          href: query({ sort: "rating" }),
          items: organic.filter((a) => a.business.rating !== null).sort((a, b) => (b.business.rating ?? 0) - (a.business.rating ?? 0) || b.business.reviewCount - a.business.reviewCount).slice(0, 4),
        },
        {
          key: "verified",
          title: "Verified businesses",
          subtitle: "Insurance and incorporation checked by RoomsNow",
          href: query({ verified: "1" }),
          items: rankAdverts(organic.filter((a) => a.business.verified), {}, seed).slice(0, 4),
        },
        {
          key: "urgent",
          title: "Emergency and same-day",
          subtitle: "For leaks, lock-outs and urgent void turnarounds",
          href: query({ emergency: "1" }),
          items: rankAdverts(organic.filter((a) => a.emergency || a.sameDay), {}, seed).slice(0, 4),
        },
        {
          key: "new",
          title: "New on RoomsNow",
          subtitle: "Recently approved services",
          href: query({ sort: "newest" }),
          items: [...organic].sort((a, b) => (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0)).slice(0, 4),
        },
      ].filter((rail) => rail.items.length >= 2)
    : [];
  const railSaved = rails.length
    ? new Set((await db.serviceFavourite.findMany({ where: { userId: user!.id, advertId: { in: rails.flatMap((r) => r.items.map((a) => a.id)) } }, select: { advertId: true } })).map((f) => f.advertId))
    : new Set<string>();

  const chips = [
    filters.q && { label: `“${filters.q}”`, href: query({ q: undefined, page: undefined }) },
    filters.category && { label: categoryLabel(filters.category), href: query({ category: undefined, page: undefined }) },
    filters.location && { label: `${filters.location}${filters.radius ? ` +${filters.radius} mi` : ""}`, href: query({ location: undefined, radius: undefined, page: undefined }) },
    filters.verifiedOnly && { label: "Verified only", href: query({ verified: undefined, page: undefined }) },
    filters.emergency && { label: "Emergency or same day", href: query({ emergency: undefined, page: undefined }) },
    filters.minRating && { label: `${filters.minRating}★ and up`, href: query({ rating: undefined, page: undefined }) },
    filters.maxPrice !== undefined && { label: `Up to £${params.maxPrice}`, href: query({ maxPrice: undefined, page: undefined }) },
  ].filter(Boolean) as Array<{ label: string; href: string }>;

  return (
    <div>
      <ServiceSearchHero q={filters.q} location={filters.location} category={filters.category} stats={stats} compact={!browsing}>
        <ServicesTabs active="browse" />
      </ServiceSearchHero>

      <div className="shell py-6 sm:py-8">
        {browsing && (
          <div className="space-y-10 pb-10">
            <section>
              <SectionHeading title="Browse by category" subtitle="Everything a housing provider needs, from compliance to furnishing" />
              <ServiceCategoryTiles counts={countsBySlug} />
            </section>
            {rails.map((rail) => (
              <section key={rail.key}>
                <SectionHeading title={rail.title} subtitle={rail.subtitle} href={rail.href} />
                <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {rail.items.map((advert) => (
                    <li key={advert.id}><ServiceAdvertCard advert={advert} promoted={false} saved={railSaved.has(advert.id)} canSave={canAct} /></li>
                  ))}
                </ul>
              </section>
            ))}
            <ServiceHowItWorks />
          </div>
        )}

        {browsing && <SectionHeading title="All services" subtitle="Filter by area, rating, price and more" />}

        <div className="grid gap-6 lg:grid-cols-[270px_minmax(0,1fr)]">
        <form method="get" action="/services" className="card h-fit space-y-4 p-4 lg:sticky lg:top-24" aria-label="Filter services">
          {filters.sort && filters.sort !== "recommended" && <input type="hidden" name="sort" value={filters.sort} />}
          <h2 className="text-[16px] font-semibold">Filters</h2>
          <div>
            <label htmlFor="q" className="label">Search</label>
            <input id="q" name="q" type="search" defaultValue={filters.q} placeholder="e.g. gas safety, EICR" className="field" />
          </div>
          <div>
            <label htmlFor="category" className="label">Category</label>
            <select id="category" name="category" defaultValue={filters.category ?? ""} className="field">
              <option value="">All categories</option>
              {categoryCounts.map((c) => <option key={c.slug} value={c.slug}>{c.label} ({c.count})</option>)}
            </select>
          </div>
          <details className="service-filters-more group" open={advancedFilters > 0}>
            <summary className="flex cursor-pointer list-none items-center justify-between rounded-[10px] border border-line px-3 py-2.5 text-[14px] font-medium text-ink marker:hidden">
              <span>More filters{advancedFilters > 0 ? ` (${advancedFilters})` : ""}</span>
              <svg viewBox="0 0 20 20" className="h-4 w-4 text-ink-faint transition-transform group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m5 8 5 5 5-5" /></svg>
            </summary>
            <div className="mt-4 space-y-4">
            <div className="grid grid-cols-[minmax(0,1fr)_112px] gap-2">
              <div>
                <label htmlFor="location" className="label">Town or postcode</label>
                <input id="location" name="location" defaultValue={filters.location} className="field" />
              </div>
              <div>
                <label htmlFor="radius" className="label">Within</label>
                <select id="radius" name="radius" defaultValue={String(filters.radius ?? "")} className="field">
                  <option value="">Area only</option>
                  {[5, 10, 25, 50].map((miles) => <option key={miles} value={miles}>{miles} mi</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="rating" className="label">Rating</label>
                <select id="rating" name="rating" defaultValue={String(filters.minRating ?? "")} className="field">
                  <option value="">Any</option>
                  <option value="4">4★ and up</option>
                  <option value="4.5">4.5★ and up</option>
                </select>
              </div>
              <div>
                <label htmlFor="maxPrice" className="label">Max price (£)</label>
                <input id="maxPrice" name="maxPrice" inputMode="decimal" defaultValue={params.maxPrice ?? ""} className="field" />
              </div>
            </div>
            <label className="flex items-center gap-2 text-[14px]"><input type="checkbox" name="verified" value="1" defaultChecked={filters.verifiedOnly} className="h-4 w-4 rounded border-line-strong text-pine" /> Verified only</label>
            <label className="flex items-center gap-2 text-[14px]"><input type="checkbox" name="emergency" value="1" defaultChecked={filters.emergency} className="h-4 w-4 rounded border-line-strong text-pine" /> Emergency or same day</label>
            </div>
          </details>
          <div className="flex gap-2">
            <button type="submit" className="btn-primary flex-1">Show results</button>
            <Link href="/services" className="btn-ghost">Clear</Link>
          </div>
        </form>

        <section aria-live="polite" aria-label="Results" className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-[15px] text-ink">
              <span className="font-semibold">{ranked.length}</span> {ranked.length === 1 ? "service" : "services"}
              {filters.category ? ` in ${categoryLabel(filters.category)}` : ""}
              {filters.location ? ` covering ${filters.location}` : ""}
              {filters.radius && filters.location && !point ? <span className="text-ink-soft"> (we couldn&apos;t place that location, so radius wasn&apos;t applied)</span> : null}
            </p>
            <ServiceSortSelect value={filters.sort ?? "recommended"} />
          </div>
          {chips.length > 0 && <div className="mb-4"><ActiveFilterChips chips={chips} /></div>}
          {shown.length === 0 ? (
            <div className="card flex flex-col items-center gap-3 p-8 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-paper-sunk text-ink-faint">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6" /><path d="m20 20-4.2-4.2" /></svg>
              </span>
              <h2 className="text-[18px]">No services match yet</h2>
              <p className="max-w-[48ch] text-[14.5px] text-ink-soft">Try a wider radius, another category, or fewer filters. New businesses join every week.</p>
              <div className="flex flex-wrap justify-center gap-2">
                <Link href="/services" className="btn-secondary">See all services</Link>
                {filters.location && <Link href={query({ location: undefined, radius: undefined, page: undefined })} className="btn-ghost">Search everywhere</Link>}
              </div>
            </div>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {shown.map((advert) => (
                <li key={advert.id}><ServiceAdvertCard advert={advert} promoted={advert.promoted} sponsored={advert.sponsored} saved={saved.has(advert.id)} canSave={canAct} /></li>
              ))}
            </ul>
          )}
          {pages > 1 && (
            <nav className="mt-8 flex items-center justify-center gap-3" aria-label="Pagination">
              {page > 1 && <Link href={query({ page: String(page - 1) })} className="btn-secondary">Previous</Link>}
              <span className="text-[14px] text-ink-soft">Page {page} of {pages}</span>
              {page < pages && <Link href={query({ page: String(page + 1) })} className="btn-secondary">Next</Link>}
            </nav>
          )}
          <p className="mt-6 text-[12.5px] text-ink-faint">Boosted and sponsored adverts are paid placements and are always labelled. Other results rotate fairly each day.</p>
          <PaymentsNote className="mt-3" />
        </section>
        </div>
      </div>
    </div>
  );
}

function ServicesForEveryoneElse({ signedIn }: { signedIn: boolean }) {
  return (
    <div className="shell max-w-2xl py-16">
      <p className="text-[13px] font-semibold uppercase tracking-wide text-brand">Provider Services</p>
      <h1 className="mt-1 text-[30px] leading-tight">A marketplace for accommodation providers</h1>
      <p className="mt-3 text-[16px] leading-relaxed text-ink-soft">
        Provider Services connects supported and shared housing providers with checked trades and suppliers. It&apos;s part of paid RoomsNow provider memberships.
      </p>
      <div className="mt-6 flex flex-wrap gap-2">
        {!signedIn && <Link href="/login?next=/services" className="btn-primary">Sign in</Link>}
        <Link href="/register?type=PROVIDER" className="btn-secondary">I provide accommodation</Link>
        <Link href="/advertise-services" className="btn-secondary">I offer services to providers</Link>
      </div>
    </div>
  );
}
