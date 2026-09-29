import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import { getCurrentUser } from "@/lib/session";
import { clsx } from "@/lib/clsx";
import { isSupportCategory, SUPPORT_CATEGORIES, SUPPORT_AUDIENCES, isSupportAudience } from "@/lib/support-directory";
import { loadDirectory, loadSupportPosts } from "@/server/support-directory";
import { CrisisStrip, SupportCategoryIcon, SupportOrgCard, SupportPostCard } from "@/components/support-directory-ui";
import { SupportMap, type SupportPin } from "@/components/support-map";

export const metadata = pageMetadata({
  title: "Support Services: Mental Health, Drugs & Alcohol, Housing Help",
  description:
    "Free directory of support services across the UK and Birmingham: mental health and crisis lines, drug and alcohol services, homelessness help, domestic abuse support and free training.",
  path: "/support-services",
});
export const dynamic = "force-dynamic";

type Params = { q?: string; category?: string; area?: string; for?: string };

export default async function SupportServicesPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const category = isSupportCategory(params.category) ? params.category : undefined;
  const audience = isSupportAudience(params.for) ? params.for : undefined;
  const [organisations, posts, user] = await Promise.all([
    loadDirectory({ q: params.q, category, area: params.area }),
    loadSupportPosts({ audience, take: 6 }),
    getCurrentUser(),
  ]);
  const local = organisations.filter((org) => org.scope === "LOCAL");
  const national = organisations.filter((org) => org.scope === "NATIONAL");
  const pins: SupportPin[] = local.flatMap((org) =>
    org.locations
      .filter((location) => location.latitude != null && location.longitude != null)
      .map((location) => ({
        id: location.id,
        name: location.name,
        organisation: org.name,
        href: `/support-services/${org.slug}`,
        address: `${location.address}, ${location.city} ${location.postcode}`,
        latitude: location.latitude!,
        longitude: location.longitude!,
      })),
  );
  const hrefWith = (next: Partial<Params>) => {
    const merged = { ...params, ...next };
    const qs = new URLSearchParams(Object.entries(merged).filter(([, value]) => value) as Array<[string, string]>).toString();
    return `/support-services${qs ? `?${qs}` : ""}`;
  };
  const filtered = Boolean(params.q || category || params.area);

  return (
    <>
      <section className="surface-home relative overflow-hidden border-b border-line">
        <span aria-hidden="true" className="hero-grid" />
        <span aria-hidden="true" className="ambient-orb -right-16 -top-10 h-64 w-64 bg-pine-light/70 blur-3xl" />
        <div className="shell relative py-8 sm:py-12">
          <p className="text-[12.5px] font-semibold uppercase tracking-[0.08em] text-pine-dark">Support services</p>
          <h1 className="mt-1 max-w-[24ch] text-balance text-[30px] font-bold leading-[1.1] sm:text-[42px]">Find help beyond housing</h1>
          <p className="mt-3 max-w-[62ch] text-[16px] leading-relaxed text-ink-soft">
            Mental health and crisis lines, drug and alcohol services, homelessness help, domestic abuse support and free training, with numbers you can tap to call, addresses and maps.
          </p>
          <form method="get" action="/support-services" role="search" className="mt-5 grid max-w-4xl gap-2 rounded-[16px] border border-line bg-paper-card p-2 shadow-raise sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto]">
            {category && <input type="hidden" name="category" value={category} />}
            <label className="flex items-center gap-2.5 rounded-[11px] px-3 focus-within:bg-paper-sunk">
              <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-ink-faint" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="11" cy="11" r="6" /><path d="m20 20-4.2-4.2" /></svg>
              <span className="sr-only">What help do you need?</span>
              <input name="q" type="search" defaultValue={params.q} placeholder="e.g. alcohol, mental health, housing advice" className="h-12 w-full min-w-0 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-faint" />
            </label>
            <label className="flex items-center gap-2.5 rounded-[11px] border-line px-3 focus-within:bg-paper-sunk sm:border-l">
              <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-ink-faint" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z" /><circle cx="12" cy="9.5" r="2.5" /></svg>
              <span className="sr-only">Town or postcode</span>
              <input name="area" defaultValue={params.area} placeholder="Town or postcode" className="h-12 w-full min-w-0 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-faint" />
            </label>
            <button type="submit" className="btn-primary h-12 px-6">Search</button>
          </form>
        </div>
      </section>

      <div className="shell space-y-10 py-8 sm:py-10">
        <CrisisStrip />

        <nav aria-label="Types of support">
          <ul data-reveal="stagger" className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
            {SUPPORT_CATEGORIES.map((item) => {
              const active = item.slug === category;
              return (
                <li key={item.slug}>
                  <Link
                    href={hrefWith({ category: active ? undefined : item.slug })}
                    aria-current={active ? "true" : undefined}
                    className={clsx(
                      "group flex h-full items-center gap-2.5 rounded-card border p-3 text-[14px] font-medium transition-[border-color,background-color,transform] hover:-translate-y-0.5",
                      active ? "border-pine bg-pine-light text-pine-dark" : "border-line bg-paper-card text-ink hover:border-pine/40",
                    )}
                  >
                    <span className={clsx("grid h-9 w-9 shrink-0 place-items-center rounded-[10px] transition-colors", active ? "bg-pine text-white" : "bg-pine-light text-pine-dark group-hover:bg-pine group-hover:text-white")}>
                      <SupportCategoryIcon slug={item.slug} className="h-[18px] w-[18px]" />
                    </span>
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {posts.length > 0 && (
          <section aria-labelledby="whats-on">
            <div data-reveal className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 id="whats-on" className="text-[22px]">What&apos;s on</h2>
                <p className="text-[14px] text-ink-soft">Free training, events and news from local services.</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(["everyone", "residents", "providers"] as const).map((key) => (
                  <Link key={key} href={hrefWith({ for: key === "everyone" ? undefined : key })} className={clsx("chip", (audience ?? "everyone") === key && "chip-active")}>
                    {key === "everyone" ? "All" : SUPPORT_AUDIENCES[key]}
                  </Link>
                ))}
              </div>
            </div>
            <ul data-reveal="stagger" className="grid gap-4 md:grid-cols-2">
              {posts.map((post) => <li key={post.id}><SupportPostCard post={post} /></li>)}
            </ul>
          </section>
        )}

        {filtered && (
          <p className="flex flex-wrap items-center gap-2 text-[14px] text-ink-soft">
            {organisations.length} service{organisations.length === 1 ? "" : "s"} found
            <Link href="/support-services" className="font-medium text-pine-dark hover:underline">Clear filters</Link>
          </p>
        )}

        {local.length > 0 && (
          <section aria-labelledby="local-heading">
            <div data-reveal className="mb-4">
              <h2 id="local-heading" className="text-[22px]">Local services{params.area ? ` near ${params.area}` : ""}</h2>
              <p className="text-[14px] text-ink-soft">Tap a number to call, or open a service for addresses and directions.</p>
            </div>
            {pins.length > 0 && (
              <div className="card mb-5 overflow-hidden">
                <SupportMap pins={pins} />
              </div>
            )}
            <ul data-reveal="stagger" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {local.map((org) => <li key={org.id}><SupportOrgCard org={org} /></li>)}
            </ul>
          </section>
        )}

        {national.length > 0 && (
          <section aria-labelledby="national-heading">
            <div data-reveal className="mb-4">
              <h2 id="national-heading" className="text-[22px]">UK-wide helplines</h2>
              <p className="text-[14px] text-ink-soft">Free or low-cost lines you can call from anywhere.</p>
            </div>
            <ul data-reveal="stagger" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {national.map((org) => <li key={org.id}><SupportOrgCard org={org} /></li>)}
            </ul>
          </section>
        )}

        {organisations.length === 0 && (
          <div className="card grid place-items-center gap-2 p-10 text-center">
            <p className="text-[17px] font-semibold">No services match that search yet</p>
            <p className="max-w-md text-[14px] text-ink-soft">Try a different word or area, or clear the filters. UK-wide helplines work wherever you are.</p>
            <Link href="/support-services" className="btn-secondary mt-2">Show all services</Link>
          </div>
        )}

        <section className="rounded-card bg-gradient-to-br from-pine-dark to-pine p-6 text-white sm:p-8" aria-labelledby="list-heading">
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div className="max-w-[60ch]">
              <h2 id="list-heading" className="text-[22px] text-white">Run a support service or council team?</h2>
              <p className="mt-1.5 text-[15px] leading-relaxed text-white/85">
                List your service free so tenants, housing providers and referrers can find you, and post free training, drop-ins and service updates.
              </p>
            </div>
            <Link href={user ? "/support-services/join" : "/login?next=/support-services/join"} className="btn bg-white text-pine-dark hover:bg-pine-light">List your service free</Link>
          </div>
        </section>

        <p className="text-[12.5px] text-ink-faint">
          Details are checked by RoomsNow and by each organisation, but services can change. Call ahead before travelling. RoomsNow isn&apos;t an emergency service: if someone&apos;s life is at risk, call 999.
        </p>
      </div>
    </>
  );
}
