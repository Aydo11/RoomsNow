import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireReferrer } from "@/lib/rbac";
import { DashboardShell } from "@/components/dashboard-shell";
import { ListingCard } from "@/components/listing-card";
import { AccreditationBadge, VerifiedBadge } from "@/components/badges";
import { EmptyState } from "@/components/ui";
import { LISTING_CARD_SELECT } from "@/server/search";
import { SUPPORT_TYPES } from "@/lib/taxonomy";
import { clsx } from "@/lib/clsx";
import { referrerNav } from "../nav";

export const metadata = { title: "Vetted providers" };
export const dynamic = "force-dynamic";

const SCHEMES = {
  ALL: { label: "CQC or BVSC", schemes: ["CQC", "BVSC"] },
  CQC: { label: "CQC", schemes: ["CQC"] },
  BVSC: { label: "BVSC", schemes: ["BVSC"] },
} as const;
type SchemeKey = keyof typeof SCHEMES;

const PAGE_SIZE = 24;

type Params = { scheme?: string; where?: string; support?: string; available?: string; page?: string };

export default async function VettedProvidersPage({ searchParams }: { searchParams: Promise<Params> }) {
  const user = await requireReferrer();
  const params = await searchParams;
  const schemeKey: SchemeKey = params.scheme === "CQC" || params.scheme === "BVSC" ? params.scheme : "ALL";
  const where = params.where?.trim() || "";
  const support = SUPPORT_TYPES.some((t) => t.slug === params.support) ? params.support! : "";
  const availableOnly = params.available === "1";
  const page = Math.max(1, Number(params.page) || 1);

  // An accreditation only counts once RoomsNow has checked it and while it is in date.
  const vetted: Prisma.ProviderAccreditationWhereInput = {
    scheme: { in: [...SCHEMES[schemeKey].schemes] },
    status: "APPROVED",
    OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
  };
  const vettedCompany: Prisma.CompanyWhereInput = { status: "ACTIVE", accreditations: { some: vetted } };

  const areaFilter: Prisma.ListingWhereInput = where
    ? {
        OR: [
          { property: { city: { contains: where, mode: "insensitive" } } },
          { property: { area: { contains: where, mode: "insensitive" } } },
          { property: { postcode: { startsWith: where.toUpperCase() } } },
        ],
      }
    : {};

  const listingWhere: Prisma.ListingWhereInput = {
    status: "ACTIVE",
    company: vettedCompany,
    rooms: { some: { status: { in: availableOnly ? ["AVAILABLE"] : ["AVAILABLE", "RESERVED", "VOID"] } } },
    ...(support ? { supportTypes: { has: support } } : {}),
    ...areaFilter,
  };

  const [nav, providers, listings, total] = await Promise.all([
    referrerNav(user.id),
    db.company.findMany({
      where: {
        ...vettedCompany,
        ...(where || support
          ? { listings: { some: { status: "ACTIVE", ...(support ? { supportTypes: { has: support } } : {}), ...areaFilter } } }
          : {}),
      },
      orderBy: { name: "asc" },
      take: 60,
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        city: true,
        verification: true,
        accreditations: { where: vetted, orderBy: { scheme: "asc" }, select: { id: true, scheme: true, name: true, rating: true, publicUrl: true } },
        _count: { select: { listings: { where: { status: "ACTIVE" } } } },
      },
    }),
    db.listing.findMany({
      where: listingWhere,
      include: LISTING_CARD_SELECT,
      orderBy: [{ availableFrom: "asc" }, { publishedAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.listing.count({ where: listingWhere }),
  ]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filtered = Boolean(where || support || availableOnly || schemeKey !== "ALL");
  const pageHref = (n: number) => {
    const qs = new URLSearchParams();
    if (schemeKey !== "ALL") qs.set("scheme", schemeKey);
    if (where) qs.set("where", where);
    if (support) qs.set("support", support);
    if (availableOnly) qs.set("available", "1");
    if (n > 1) qs.set("page", String(n));
    const s = qs.toString();
    return s ? `/referrals/vetted?${s}` : "/referrals/vetted";
  };

  return (
    <DashboardShell
      title="Vetted providers"
      subtitle="Only providers with a CQC registration or BVSC recognition that RoomsNow has checked against evidence — and only their adverts."
      nav={nav}
      active="/referrals/vetted"
    >
      <p className="mb-5 max-w-[80ch] text-[14px] leading-relaxed text-ink-soft">
        Useful when your organisation can only place with vetted providers. Each accreditation has been checked by the RoomsNow
        team against the provider&apos;s evidence and drops off this page automatically when it expires. RoomsNow doesn&apos;t
        issue CQC ratings — follow a badge to see the official record.
      </p>

      <form className="card grid gap-3 p-4 sm:grid-cols-[1fr_1.2fr_1.2fr_auto_auto] sm:items-end">
        <div>
          <label className="label" htmlFor="scheme">Vetted by</label>
          <select id="scheme" name="scheme" defaultValue={schemeKey === "ALL" ? "" : schemeKey} className="field">
            <option value="">CQC or BVSC</option>
            <option value="CQC">CQC</option>
            <option value="BVSC">BVSC</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="where">Area or postcode</label>
          <input id="where" name="where" defaultValue={where} className="field" placeholder="Birmingham" />
        </div>
        <div>
          <label className="label" htmlFor="support">Support need</label>
          <select id="support" name="support" defaultValue={support} className="field">
            <option value="">Any</option>
            {SUPPORT_TYPES.map((type) => (
              <option key={type.slug} value={type.slug}>{type.label}</option>
            ))}
          </select>
        </div>
        <label htmlFor="available" className="flex min-h-[46px] items-center gap-2 text-[14px] text-ink">
          <input id="available" name="available" type="checkbox" value="1" defaultChecked={availableOnly} className="h-4 w-4 accent-pine" />
          Rooms free now
        </label>
        <div className="flex gap-2">
          <button className="btn-primary h-[46px]">Show</button>
          {filtered && <Link href="/referrals/vetted" className="btn-secondary h-[46px]">Clear</Link>}
        </div>
      </form>

      <section aria-labelledby="vetted-providers" className="mt-7">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="vetted-providers" className="text-[18px]">
            Providers <span className="font-normal text-ink-faint">({providers.length}{providers.length === 60 ? "+" : ""})</span>
          </h2>
          <p className="text-[13px] text-ink-faint">Vetted by {SCHEMES[schemeKey].label}</p>
        </div>

        {providers.length === 0 ? (
          <div className="mt-3">
            <EmptyState
              title={filtered ? "No vetted providers match that search" : "No vetted providers yet"}
              body={
                filtered
                  ? "Try a wider area, another support need, or both schemes."
                  : "Providers appear here once their CQC or BVSC accreditation has been checked by RoomsNow. Until then, search all accommodation and look for the Verified badge."
              }
              actionHref={filtered ? "/referrals/vetted" : "/search"}
              actionLabel={filtered ? "Clear filters" : "Search all accommodation"}
            />
          </div>
        ) : (
          <ul className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {providers.map((provider) => (
              <li key={provider.id} className="card flex flex-col gap-3 p-4">
                <div className="flex items-center gap-3">
                  {provider.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={provider.logoUrl} alt="" className="h-11 w-11 shrink-0 rounded-[10px] border border-line bg-white object-contain" />
                  ) : (
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[10px] bg-paper-sunk text-[13px] font-semibold text-ink-soft">
                      {provider.name.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <Link href={`/companies/${provider.slug}`} className="block truncate text-[15px] font-semibold text-ink hover:text-pine-dark">
                      {provider.name}
                    </Link>
                    <p className="truncate text-[12.5px] text-ink-faint">
                      {[provider.city, `${provider._count.listings} live advert${provider._count.listings === 1 ? "" : "s"}`].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  {provider.verification === "APPROVED" && <VerifiedBadge compact />}
                </div>
                <div className="flex flex-wrap gap-2">
                  {provider.accreditations.map((item) =>
                    item.publicUrl ? (
                      <a key={item.id} href={item.publicUrl} target="_blank" rel="noopener noreferrer" className="rounded-[10px] focus:outline-none focus:ring-2 focus:ring-brand/40">
                        <AccreditationBadge scheme={item.scheme} name={item.name} rating={item.rating} />
                      </a>
                    ) : (
                      <AccreditationBadge key={item.id} scheme={item.scheme} name={item.name} rating={item.rating} />
                    ),
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {providers.length > 0 && (
        <section aria-labelledby="vetted-adverts" className="mt-9">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="vetted-adverts" className="text-[18px]">
              Adverts from vetted providers <span className="font-normal text-ink-faint">({total})</span>
            </h2>
            {pages > 1 && <p className="text-[13px] text-ink-faint">Page {page} of {pages}</p>}
          </div>

          {listings.length === 0 ? (
            <p className="card mt-3 px-5 py-6 text-[14px] text-ink-soft">
              {availableOnly ? "None of these providers has a room free right now. Untick “Rooms free now” to see all their adverts." : "No live adverts match that search."}
            </p>
          ) : (
            <ul className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {listings.map((listing) => (
                <li key={listing.id}>
                  <ListingCard listing={{ ...listing, distanceMiles: null }} />
                </li>
              ))}
            </ul>
          )}

          {pages > 1 && (
            <nav aria-label="Pages" className="mt-6 flex flex-wrap items-center justify-center gap-2">
              {page > 1 && <Link href={pageHref(page - 1)} className="btn-secondary">Previous</Link>}
              {Array.from({ length: pages }, (_, i) => i + 1)
                .filter((n) => Math.abs(n - page) <= 2 || n === 1 || n === pages)
                .map((n) => (
                  <Link
                    key={n}
                    href={pageHref(n)}
                    aria-current={n === page ? "page" : undefined}
                    className={clsx("grid h-10 min-w-10 place-items-center rounded-[10px] border px-3 text-[14px]", n === page ? "border-ink bg-ink text-white" : "border-line bg-white text-ink-soft hover:text-ink")}
                  >
                    {n}
                  </Link>
                ))}
              {page < pages && <Link href={pageHref(page + 1)} className="btn-secondary">Next</Link>}
            </nav>
          )}
        </section>
      )}
    </DashboardShell>
  );
}
