import Link from "next/link";
import { clsx } from "@/lib/clsx";
import { SERVICE_CATEGORIES } from "@/lib/service-marketplace";
import { CountUp } from "./motion";

/**
 * Presentation pieces for the Provider Services marketplace: the search hero,
 * category tiles with icons, "how it works" strip and curated rails. They take
 * plain data only, so they're safe to use on the redacted preview too.
 */

const ICONS: Record<string, React.ReactNode> = {
  cleaning: <path d="M9 3h6l-1 5h-4L9 3Zm1 5-3 13h10L14 8m-7 6h10" />,
  electrical: <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />,
  "gas-heating": <path d="M12 22a7 7 0 0 0 7-7c0-3-2-5.5-4-8-.6 2.4-2 3.5-3 3.5.4-3-1-6-4-8.5.3 4-4 6.5-4 13a7 7 0 0 0 8 7Z" />,
  plumbing: <path d="M4 8h8a4 4 0 0 1 4 4v2h4v6h-6v-6h-2v-2H4V8Zm0-3v6" />,
  "fire-safety": <><path d="M8 21h8M9 21V9a3 3 0 0 1 6 0v12" /><path d="M15 11h3a2 2 0 0 1 2 2v1M9 6 6 4" /></>,
  maintenance: <path d="M14.5 5.5a4 4 0 0 0-5.3 5L4 15.7 8.3 20l5.2-5.2a4 4 0 0 0 5-5.3l-2.6 2.6-2.4-.6-.6-2.4 2.6-2.6Z" />,
  "pest-control": <><ellipse cx="12" cy="13" rx="4" ry="6" /><path d="M12 7V4M8 10 4 8m4 5H3m5 3-4 2m12-8 4-2m-4 5h5m-5 3 4 2" /></>,
  furniture: <path d="M4 11V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3M3 11h18v5H3v-5Zm2 5v3m14-3v3" />,
  waste: <path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v6m4-6v6" />,
  security: <><path d="M3 7h13l-2 5H3V7Zm13 2 5-2v5l-5-2" /><path d="M6 12v5H4" /></>,
  compliance: <path d="M8 3h8l4 4v14H4V3h4Zm0 9 3 3 5-6" />,
  "support-services": <><circle cx="9" cy="8" r="3" /><path d="M3.5 19a5.5 5.5 0 0 1 11 0M16 5.5a3 3 0 0 1 0 5.5M17.5 14a5 5 0 0 1 3 5" /></>,
  professional: <path d="M4 8h16v11H4V8Zm5 0V5h6v3M4 13h16" />,
  other: <><circle cx="6" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="18" cy="12" r="1.5" /></>,
};

export function ServiceCategoryIcon({ slug, className }: { slug: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className ?? "h-5 w-5"} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONS[slug] ?? ICONS.other}
    </svg>
  );
}

export const POPULAR_SEARCHES: Array<{ label: string; q?: string; category?: string }> = [
  { label: "Gas safety certificate", q: "gas safety", category: "gas-heating" },
  { label: "EICR", q: "EICR", category: "electrical" },
  { label: "End of tenancy clean", q: "end of tenancy", category: "cleaning" },
  { label: "Fire risk assessment", q: "fire risk", category: "fire-safety" },
  { label: "Pest control", category: "pest-control" },
  { label: "Furniture packs", q: "furniture", category: "furniture" },
];

function searchHref(item: { q?: string; category?: string }) {
  const params = new URLSearchParams();
  if (item.q) params.set("q", item.q);
  if (item.category) params.set("category", item.category);
  return `/services?${params.toString()}`;
}

export type MarketplaceStats = { services: number; businesses: number; verified: number; rating: number | null };

/** Search-led header. `compact` is used once someone is already filtering. */
export function ServiceSearchHero({
  q,
  location,
  category,
  stats,
  compact = false,
  children,
}: {
  q?: string;
  location?: string;
  category?: string;
  stats?: MarketplaceStats;
  compact?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <section className="surface-home relative overflow-hidden border-b border-line">
      {!compact && (
        <>
          <span aria-hidden="true" className="hero-grid" />
          <span aria-hidden="true" className="ambient-orb -right-16 -top-10 h-64 w-64 bg-pine-light/70 blur-3xl" />
          <span aria-hidden="true" className="ambient-orb ambient-orb-2 -left-20 bottom-0 h-56 w-56 bg-[#70baff]/20 blur-3xl" />
        </>
      )}
      <div className={clsx("shell relative", compact ? "py-6" : "py-8 sm:py-12")}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-[62ch]">
            <p className="text-[12.5px] font-semibold uppercase tracking-[0.08em] text-brand">Provider Services</p>
            <h1 className={clsx("mt-1 font-bold leading-[1.1] text-balance", compact ? "text-[26px] sm:text-[30px]" : "text-[30px] sm:text-[44px]")}>
              {compact ? "Find trades and suppliers" : "Trusted trades and suppliers for supported housing"}
            </h1>
            {!compact && (
              <p className="mt-3 text-[16px] leading-relaxed text-ink-soft">
                Compliance certificates, void turnarounds, repairs, cleaning and furnishing from businesses that work with HMOs and supported
                accommodation. Compare quotes and message them directly.
              </p>
            )}
          </div>
          {children}
        </div>

        <form method="get" action="/services" role="search" className="mt-5 grid gap-2 rounded-[16px] border border-line bg-paper-card p-2 shadow-raise sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto]">
          {category && <input type="hidden" name="category" value={category} />}
          <label className="flex items-center gap-2.5 rounded-[11px] px-3 focus-within:bg-paper-sunk">
            <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-ink-faint" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6" /><path d="m20 20-4.2-4.2" /></svg>
            <span className="sr-only">What do you need?</span>
            <input name="q" type="search" defaultValue={q} placeholder="What do you need? e.g. EICR, void clean" className="h-12 w-full min-w-0 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-faint" />
          </label>
          <label className="flex items-center gap-2.5 rounded-[11px] border-line px-3 focus-within:bg-paper-sunk sm:border-l">
            <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-ink-faint" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z" /><circle cx="12" cy="9.5" r="2.5" /></svg>
            <span className="sr-only">Town or postcode</span>
            <input name="location" defaultValue={location} placeholder="Town or postcode" className="h-12 w-full min-w-0 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-faint" />
          </label>
          <button type="submit" className="btn-primary h-12 px-6">Search</button>
        </form>

        {!compact && (
          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[13px] text-ink-faint">Popular:</span>
            {POPULAR_SEARCHES.map((item) => (
              <Link key={item.label} href={searchHref(item)} className="chip bg-paper-card">{item.label}</Link>
            ))}
          </div>
        )}

        {!compact && stats && (
          <dl className="mt-7 grid max-w-3xl grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
            <Stat label="Live services" value={<CountUp value={stats.services} />} />
            <Stat label="Businesses" value={<CountUp value={stats.businesses} />} />
            <Stat label="Verified" value={<CountUp value={stats.verified} />} />
            <Stat label="Average rating" value={stats.rating !== null ? `${stats.rating.toFixed(1)} ★` : "New"} />
          </dl>
        )}
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="border-l-2 border-brand/30 pl-3">
      <dt className="text-[12.5px] text-ink-faint">{label}</dt>
      <dd className="font-display text-[22px] font-bold tabular-nums text-ink">{value}</dd>
    </div>
  );
}

/** Icon tiles for each category, with how many live services it has. */
export function ServiceCategoryTiles({ counts, active, hrefFor }: { counts: Record<string, number>; active?: string; hrefFor?: (slug: string) => string }) {
  const href = hrefFor ?? ((slug: string) => `/services?category=${slug}`);
  return (
    <ul data-reveal="stagger" className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-7">
      {SERVICE_CATEGORIES.filter((c) => c.slug !== "other" || counts.other).map((category) => {
        const count = counts[category.slug] ?? 0;
        return (
          <li key={category.slug}>
            <Link
              href={href(category.slug)}
              aria-current={active === category.slug ? "page" : undefined}
              className={clsx(
                "group flex h-full flex-col gap-2.5 rounded-[14px] border bg-paper-card p-3.5 transition-[border-color,transform,box-shadow] hover:-translate-y-0.5 hover:border-brand/50 hover:shadow-raise",
                active === category.slug ? "border-brand" : "border-line",
              )}
            >
              <span className="grid h-10 w-10 place-items-center rounded-[11px] bg-brand/10 text-brand transition-colors group-hover:bg-brand group-hover:text-white">
                <ServiceCategoryIcon slug={category.slug} />
              </span>
              <span className="text-[14px] font-medium leading-snug text-ink">{category.label}</span>
              <span className="mt-auto text-[12.5px] text-ink-faint">{count ? `${count} ${count === 1 ? "service" : "services"}` : "Coming soon"}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function SectionHeading({ title, subtitle, href, linkLabel = "See all" }: { title: string; subtitle?: string; href?: string; linkLabel?: string }) {
  return (
    <div data-reveal className="mb-4 flex flex-wrap items-end justify-between gap-2">
      <div>
        <h2 className="text-[20px] font-bold sm:text-[22px]">{title}</h2>
        {subtitle && <p className="mt-0.5 text-[14px] text-ink-soft">{subtitle}</p>}
      </div>
      {href && <Link href={href} className="text-[14px] font-medium text-brand underline-offset-2 hover:underline">{linkLabel} <span aria-hidden="true" className="nudge-arrow">→</span></Link>}
    </div>
  );
}

const STEPS = [
  { title: "Find the right trade", body: "Search by service and area. Verified businesses have had their insurance and incorporation checked." },
  { title: "Request quotes", body: "Send a structured request in a minute. Businesses reply in your Messages, so everything stays in one place." },
  { title: "Compare and hire", body: "Compare prices, reviews and response times, then agree the job directly with the business." },
  { title: "Review the work", body: "Once the job is complete, leave a review so other providers know who to trust." },
];

export function ServiceHowItWorks() {
  return (
    <section aria-labelledby="how-heading" className="rounded-card border border-line bg-paper-card p-5 sm:p-7">
      <h2 id="how-heading" className="text-[20px] font-bold">How Provider Services works</h2>
      <ol className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((step, index) => (
          <li key={step.title} className="flex gap-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand text-[13px] font-bold text-white">{index + 1}</span>
            <div>
              <h3 className="text-[15px] font-semibold">{step.title}</h3>
              <p className="mt-1 text-[13.5px] leading-relaxed text-ink-soft">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Removable chips for each active filter. */
export function ActiveFilterChips({ chips }: { chips: Array<{ label: string; href: string }> }) {
  if (!chips.length) return null;
  return (
    <ul className="flex flex-wrap items-center gap-1.5" aria-label="Active filters">
      {chips.map((chip) => (
        <li key={chip.label}>
          <Link href={chip.href} className="inline-flex items-center gap-1.5 rounded-pill border border-brand/40 bg-brand/10 px-3 py-1 text-[13px] font-medium text-brand hover:bg-brand/15">
            {chip.label}
            <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="m4 4 8 8m0-8-8 8" /></svg>
            <span className="sr-only">Remove filter</span>
          </Link>
        </li>
      ))}
      <li><Link href="/services" className="px-2 text-[13px] text-ink-soft underline-offset-2 hover:underline">Clear all</Link></li>
    </ul>
  );
}
