import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { resolveArea } from "@/lib/geo";
import { loadPublicAdverts, marketplaceViewer, recordServiceEvent, viewerAccess } from "@/server/service-marketplace";
import { ServiceAdvertCard, ServicePreviewTile, ServicesTabs } from "@/components/service-cards";
import { PaymentsNote } from "@/components/service-ui";
import {
  canContactServiceBusiness,
  isServiceCategory,
  isServiceSort,
  matchesFilters,
  previewCard,
  rankAdverts,
  SERVICE_CATEGORIES,
  type ServiceFilters,
} from "@/lib/service-marketplace";
import { poundsToPence } from "@/lib/service-validation";
import { clsx } from "@/lib/clsx";

export const metadata = { title: "Provider Services", robots: { index: false, follow: false } };
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

  if (access === "preview") {
    // Server-side redaction: only previewCard() output reaches the page.
    const sample = all.filter((advert) => !filters.category || advert.category === filters.category).slice(0, 12).map(previewCard);
    return (
      <div className="shell py-6 sm:py-10">
        <header className="max-w-[70ch]">
          <p className="text-[13px] font-semibold uppercase tracking-wide text-brand">Provider Services</p>
          <h1 className="mt-1 text-[28px] leading-tight sm:text-[36px]">Trusted trades and suppliers for supported housing</h1>
          <p className="mt-3 text-[16px] leading-relaxed text-ink-soft">
            Gas and electrical safety, void cleans, pest control, furniture packs and more — from businesses our team has checked for insurance and incorporation.
            Browse, compare quotes and message them directly with a paid RoomsNow membership.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/provider/membership" className="btn-primary">Upgrade to unlock Provider Services</Link>
            <Link href="/pricing" className="btn-secondary">Compare memberships</Link>
          </div>
        </header>

        <section className="mt-8" aria-labelledby="categories-heading">
          <h2 id="categories-heading" className="text-[18px]">{all.length} verified service adverts across {categoryCounts.filter((c) => c.count).length || SERVICE_CATEGORIES.length} categories</h2>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Link href="/services" className={clsx("chip", !filters.category && "chip-active")}>All</Link>
            {categoryCounts.map((category) => (
              <Link key={category.slug} href={`/services?category=${category.slug}`} className={clsx("chip", filters.category === category.slug && "chip-active")}>
                {category.label}{category.count ? ` (${category.count})` : ""}
              </Link>
            ))}
          </div>
        </section>

        {sample.length > 0 ? (
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sample.map((card, index) => <li key={index}><ServicePreviewTile card={card} /></li>)}
          </ul>
        ) : (
          <p className="card mt-6 p-6 text-[15px] text-ink-soft">Businesses are joining now. Upgrade and you&apos;ll see them the moment they&apos;re approved.</p>
        )}
        <p className="mt-6 text-[14px] text-ink-soft">
          Business names, contact details, full descriptions, reviews and messaging are included with Professional and Business memberships.
        </p>
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
    filters.category || filters.location ? recordServiceEvent({ type: "SEARCH", category: filters.category, location: filters.location }) : null,
  ]);
  const saved = new Set(favourites.map((f) => f.advertId));
  const canAct = canContactServiceBusiness(marketplaceViewer(user));

  const query = (overrides: Partial<Params>) => {
    const next = new URLSearchParams();
    for (const [key, value] of Object.entries({ ...params, ...overrides })) if (value) next.set(key, String(value));
    return `/services?${next.toString()}`;
  };

  return (
    <div className="shell py-6 sm:py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-[70ch]">
          <p className="text-[13px] font-semibold uppercase tracking-wide text-brand">Provider Services</p>
          <h1 className="mt-1 text-[26px] leading-tight sm:text-[32px]">Find trades and suppliers</h1>
          <p className="mt-2 text-[15px] text-ink-soft">Checked businesses that work with supported housing. Request quotes, compare them and message directly.</p>
        </div>
        <ServicesTabs active="browse" />
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <form method="get" action="/services" className="card h-fit space-y-4 p-4 lg:sticky lg:top-24" aria-label="Filter services">
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
          <div className="grid grid-cols-[minmax(0,1fr)_96px] gap-2">
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
          <div>
            <label htmlFor="sort" className="label">Sort by</label>
            <select id="sort" name="sort" defaultValue={filters.sort} className="field">
              <option value="recommended">Recommended</option>
              <option value="rating">Highest rated</option>
              <option value="price_low">Lowest price</option>
              <option value="price_high">Highest price</option>
              <option value="response">Fastest response</option>
              <option value="newest">Newest</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn-primary flex-1">Show results</button>
            <Link href="/services" className="btn-ghost">Clear</Link>
          </div>
        </form>

        <section aria-live="polite" aria-label="Results">
          <p className="mb-3 text-[14px] text-ink-soft">
            {ranked.length} {ranked.length === 1 ? "service" : "services"}
            {filters.location ? ` covering ${filters.location}` : ""}
            {filters.radius && filters.location && !point ? " (we couldn't place that location, so radius wasn't applied)" : ""}
          </p>
          {shown.length === 0 ? (
            <div className="card p-6 text-[15px] text-ink-soft">No services match those filters yet. Try a wider radius or another category.</div>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {shown.map((advert) => (
                <li key={advert.id}><ServiceAdvertCard advert={advert} promoted={advert.promoted} saved={saved.has(advert.id)} canSave={canAct} /></li>
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
          <p className="mt-6 text-[12.5px] text-ink-faint">Boosted adverts are paid placements and are always labelled. Other results rotate fairly each day.</p>
          <PaymentsNote className="mt-3" />
        </section>
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
        <Link href="/register?type=SERVICE_PROVIDER" className="btn-secondary">I offer services to providers</Link>
      </div>
    </div>
  );
}
