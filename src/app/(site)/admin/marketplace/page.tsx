import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/rbac";
import { hasAdminPermission } from "@/lib/admin-permissions";
import { DashboardShell, DataTable, StatCard } from "@/components/dashboard-shell";
import { AdvertStatusPill, BusinessStatusPill, QuoteStatusPill } from "@/components/service-ui";
import { AdvertDecisionForm, ServiceReviewVisibilityButton } from "@/components/service-admin-forms";
import { Stars } from "@/components/star-rating";
import { categoryLabel, priceLabel, SERVICE_PLANS, serviceSubscriptionActive } from "@/lib/service-marketplace";
import { money, shortDate } from "@/lib/format";
import { clsx } from "@/lib/clsx";
import { adminNav } from "../nav";

export const metadata = { title: "Services marketplace" };
export const dynamic = "force-dynamic";

const TABS = [
  { key: "queue", label: "To review" },
  { key: "businesses", label: "Businesses", full: true },
  { key: "adverts", label: "Adverts" },
  { key: "quotes", label: "Quotes", full: true },
  { key: "boosts", label: "Boosts and plans", full: true },
  { key: "reviews", label: "Reviews" },
  { key: "reports", label: "Reports" },
] as const;

export default async function AdminMarketplacePage({ searchParams }: { searchParams: Promise<{ tab?: string; q?: string }> }) {
  const { tab = "queue", q = "" } = await searchParams;
  const admin = await requireAdmin("MODERATION");
  const full = hasAdminPermission(admin, "ALL");
  const tabs = TABS.filter((t) => !("full" in t) || full);
  const active = tabs.some((t) => t.key === tab) ? tab : "queue";
  const now = new Date();

  const [nav, counts, subscriptions] = await Promise.all([
    adminNav(),
    Promise.all([
      db.serviceBusiness.count({ where: { status: "APPROVED" } }),
      db.serviceBusiness.count({ where: { status: "PENDING_REVIEW" } }),
      db.serviceAdvert.count({ where: { status: "ACTIVE" } }),
      db.serviceAdvert.count({ where: { status: "PENDING_REVIEW" } }),
      db.serviceQuoteRequest.count({ where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } }),
      db.serviceBoost.count({ where: { endsAt: { gt: now } } }),
    ]),
    full ? db.serviceSubscription.findMany({ select: { tier: true, status: true, trialEndsAt: true } }) : Promise.resolve([]),
  ]);
  const [approved, pendingBusinesses, liveAdverts, pendingAdverts, quotes30, liveBoosts] = counts;
  const paying = subscriptions.filter((s) => s.status === "ACTIVE" || s.status === "PAST_DUE");
  const mrr = paying.reduce((sum, s) => sum + SERVICE_PLANS[s.tier].monthly, 0);
  const trials = subscriptions.filter((s) => s.status === "TRIALING" && serviceSubscriptionActive(s, now)).length;

  return (
    <DashboardShell
      title="Services marketplace"
      subtitle="Trades and suppliers advertising to paid providers. Businesses and their documents need a full admin; adverts, reviews and reports can be moderated by the team."
      nav={nav}
      active="/admin/marketplace"
    >
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard compact label="Approved businesses" value={approved} hint={`${pendingBusinesses} waiting`} />
        <StatCard compact label="Live adverts" value={liveAdverts} hint={`${pendingAdverts} waiting`} />
        <StatCard compact label="Quote requests (30 days)" value={quotes30} />
        {full ? <StatCard compact label="Plan revenue / month" value={money(mrr)} hint={`${paying.length} paying · ${trials} on trial · ${liveBoosts} boosts running`} /> : <StatCard compact label="Boosts running" value={liveBoosts} />}
      </div>

      <nav aria-label="Marketplace sections" className="mt-6 flex flex-wrap gap-1.5">
        {tabs.map((t) => (
          <Link key={t.key} href={`/admin/marketplace?tab=${t.key}`} aria-current={active === t.key ? "page" : undefined} className={clsx("chip", active === t.key && "chip-active")}>{t.label}</Link>
        ))}
      </nav>

      <div className="mt-5">
        {active === "queue" && <Queue full={full} />}
        {active === "businesses" && full && <Businesses q={q} />}
        {active === "adverts" && <Adverts />}
        {active === "quotes" && full && <Quotes />}
        {active === "boosts" && full && <Boosts />}
        {active === "reviews" && <Reviews />}
        {active === "reports" && <Reports />}
      </div>
    </DashboardShell>
  );
}

async function Queue({ full }: { full: boolean }) {
  const [businesses, adverts, evidence] = await Promise.all([
    full ? db.serviceBusiness.findMany({ where: { status: "PENDING_REVIEW" }, orderBy: { submittedAt: "asc" }, select: { id: true, name: true, categories: true, submittedAt: true } }) : Promise.resolve([]),
    db.serviceAdvert.findMany({ where: { status: "PENDING_REVIEW" }, orderBy: { submittedAt: "asc" }, include: { business: { select: { id: true, name: true, status: true } } }, take: 50 }),
    full ? db.serviceEvidence.findMany({ where: { status: "PENDING", business: { status: "APPROVED" } }, orderBy: { createdAt: "asc" }, select: { id: true, label: true, business: { select: { id: true, name: true } } }, take: 50 }) : Promise.resolve([]),
  ]);
  return (
    <div className="space-y-6">
      {full && (
        <section>
          <h2 className="text-[18px]">Businesses waiting for verification</h2>
          {businesses.length === 0 ? <p className="mt-2 text-[14px] text-ink-soft">None waiting.</p> : (
            <ul className="mt-2 divide-y divide-line rounded-card border border-line bg-white">
              {businesses.map((b) => (
                <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                  <span><Link href={`/admin/marketplace/${b.id}`} className="font-medium hover:underline">{b.name}</Link><span className="block text-[13px] text-ink-faint">{b.categories.map(categoryLabel).join(", ")}</span></span>
                  <span className="text-[13px] text-ink-soft">Sent {shortDate(b.submittedAt)}</span>
                </li>
              ))}
            </ul>
          )}
          {evidence.length > 0 && (
            <>
              <h3 className="mt-4 text-[15px] font-semibold">New documents from approved businesses</h3>
              <ul className="mt-2 space-y-1 text-[14px]">{evidence.map((e) => <li key={e.id}><Link className="text-brand hover:underline" href={`/admin/marketplace/${e.business.id}`}>{e.business.name}</Link> — {e.label}</li>)}</ul>
            </>
          )}
        </section>
      )}
      <section>
        <h2 className="text-[18px]">Adverts waiting for review</h2>
        {adverts.length === 0 ? <p className="mt-2 text-[14px] text-ink-soft">None waiting.</p> : (
          <ul className="mt-2 space-y-3">
            {adverts.map((advert) => (
              <li key={advert.id} className="card p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium">{advert.title}</p>
                    <p className="text-[13px] text-ink-faint">{advert.business.name} · {categoryLabel(advert.category)} · {priceLabel(advert)} · {advert.nationwide ? "Nationwide" : advert.locations.join(", ")}</p>
                  </div>
                  <BusinessStatusPill status={advert.business.status} />
                </div>
                <details className="mt-2 text-[14px]"><summary className="cursor-pointer text-ink-soft">Read description</summary><p className="mt-2 whitespace-pre-line">{advert.description}</p>{advert.images.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{advert.images.map((i) => <img key={i} src={i} alt="" className="h-20 w-20 rounded-[8px] object-cover" />)}</div>}</details>
                <AdvertDecisionForm advertId={advert.id} status={advert.status} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

async function Businesses({ q }: { q: string }) {
  const businesses = await db.serviceBusiness.findMany({
    where: q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }, { companyNumber: { contains: q, mode: "insensitive" } }] } : {},
    orderBy: { createdAt: "desc" },
    take: 300,
    include: { subscription: { select: { tier: true, status: true } }, _count: { select: { adverts: true, quotes: true } } },
  });
  return (
    <>
      <form className="mb-3 flex gap-2" method="get">
        <input type="hidden" name="tab" value="businesses" />
        <label htmlFor="q" className="sr-only">Search businesses</label>
        <input id="q" name="q" defaultValue={q} placeholder="Name, email or company number" className="field max-w-sm" />
        <button className="btn-secondary">Search</button>
      </form>
      <DataTable head={["Business", "Status", "Plan", "Adverts", "Quotes", "Joined"]} compact>
        {businesses.map((b) => (
          <tr key={b.id}>
            <td><Link href={`/admin/marketplace/${b.id}`} className="font-medium hover:underline">{b.name}</Link><span className="block text-ink-faint">{b.email}</span></td>
            <td><BusinessStatusPill status={b.status} /></td>
            <td>{b.subscription ? `${b.subscription.tier === "PRO" ? "Pro" : "Standard"} · ${b.subscription.status.toLowerCase()}` : "—"}</td>
            <td className="tabular-nums">{b._count.adverts}</td>
            <td className="tabular-nums">{b._count.quotes}</td>
            <td>{shortDate(b.createdAt)}</td>
          </tr>
        ))}
      </DataTable>
    </>
  );
}

async function Adverts() {
  const adverts = await db.serviceAdvert.findMany({ orderBy: { updatedAt: "desc" }, take: 200, include: { business: { select: { id: true, name: true } } } });
  return (
    <DataTable head={["Advert", "Business", "Status", "Views", "Enquiries", "Action"]} compact>
      {adverts.map((a) => (
        <tr key={a.id}>
          <td className="max-w-[260px]"><span className="font-medium">{a.title}</span><span className="block text-ink-faint">{categoryLabel(a.category)}</span></td>
          <td><Link href={`/admin/marketplace/${a.business.id}`} className="hover:underline">{a.business.name}</Link></td>
          <td><AdvertStatusPill status={a.status} /></td>
          <td className="tabular-nums">{a.views}</td>
          <td className="tabular-nums">{a.enquiries}</td>
          <td className="min-w-[240px]">{["PENDING_REVIEW", "ACTIVE", "PAUSED"].includes(a.status) ? <AdvertDecisionForm advertId={a.id} status={a.status} /> : null}</td>
        </tr>
      ))}
    </DataTable>
  );
}

async function Quotes() {
  const quotes = await db.serviceQuoteRequest.findMany({ orderBy: { createdAt: "desc" }, take: 200, include: { business: { select: { id: true, name: true } }, company: { select: { name: true } } } });
  return (
    <DataTable head={["Request", "From", "To", "Status", "Quote", "Sent"]} compact>
      {quotes.map((q) => (
        <tr key={q.id}>
          <td>{q.service}<span className="block text-ink-faint">{q.location}</span></td>
          <td>{q.company.name}</td>
          <td><Link href={`/admin/marketplace/${q.business.id}`} className="hover:underline">{q.business.name}</Link></td>
          <td><QuoteStatusPill status={q.status} /></td>
          <td className="tabular-nums">{q.quoteAmount !== null ? money(q.quoteAmount) : "—"}</td>
          <td>{shortDate(q.createdAt)}</td>
        </tr>
      ))}
    </DataTable>
  );
}

async function Boosts() {
  const boosts = await db.serviceBoost.findMany({ orderBy: { createdAt: "desc" }, take: 200, include: { advert: { select: { title: true } }, business: { select: { id: true, name: true } } } });
  return (
    <DataTable head={["Advert", "Business", "Days", "Paid", "Source", "Runs", "Views / clicks"]} compact>
      {boosts.map((b) => (
        <tr key={b.id}>
          <td>{b.advert.title}</td>
          <td><Link href={`/admin/marketplace/${b.business.id}`} className="hover:underline">{b.business.name}</Link></td>
          <td className="tabular-nums">{b.days}</td>
          <td className="tabular-nums">{money(b.amount)}</td>
          <td>{b.source.toLowerCase()}</td>
          <td>{shortDate(b.startsAt)} – {shortDate(b.endsAt)}</td>
          <td className="tabular-nums">{b.impressions} / {b.clicks}</td>
        </tr>
      ))}
    </DataTable>
  );
}

async function Reviews() {
  const reviews = await db.serviceReview.findMany({ orderBy: { createdAt: "desc" }, take: 200, include: { business: { select: { id: true, name: true } }, quote: { select: { service: true } } } });
  if (!reviews.length) return <p className="text-[14px] text-ink-soft">No reviews yet.</p>;
  return (
    <ul className="space-y-3">
      {reviews.map((r) => (
        <li key={r.id} className="card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-2"><Stars rating={r.rating} /><Link href={`/admin/marketplace/${r.business.id}`} className="text-[14px] font-medium hover:underline">{r.business.name}</Link><span className="text-[13px] text-ink-faint">{r.quote.service} · {shortDate(r.createdAt)}</span></span>
            {r.hiddenAt && <span className="text-[12px] font-medium text-clay">Hidden{r.hiddenReason ? `: ${r.hiddenReason}` : ""}</span>}
          </div>
          {r.comment && <p className="mt-2 text-[14px]">{r.comment}</p>}
          {r.reply && <p className="mt-2 rounded-[8px] bg-paper-sunk px-3 py-2 text-[13px]">Reply: {r.reply}</p>}
          <div className="mt-2"><ServiceReviewVisibilityButton reviewId={r.id} hidden={Boolean(r.hiddenAt)} /></div>
        </li>
      ))}
    </ul>
  );
}

async function Reports() {
  const reports = await db.report.findMany({ where: { targetType: { in: ["SERVICE_ADVERT", "SERVICE_BUSINESS"] } }, orderBy: { createdAt: "desc" }, take: 200 });
  if (!reports.length) return <p className="text-[14px] text-ink-soft">No reports about services.</p>;
  const adverts = await db.serviceAdvert.findMany({ where: { id: { in: reports.filter((r) => r.targetType === "SERVICE_ADVERT").map((r) => r.targetId) } }, select: { id: true, title: true, businessId: true } });
  return (
    <DataTable head={["Reported", "Reason", "Detail", "Status", "Filed"]} compact>
      {reports.map((r) => {
        const advert = adverts.find((a) => a.id === r.targetId);
        const businessId = advert?.businessId ?? (r.targetType === "SERVICE_BUSINESS" ? r.targetId : null);
        return (
          <tr key={r.id}>
            <td>{businessId ? <Link href={`/admin/marketplace/${businessId}`} className="hover:underline">{advert?.title ?? "Business profile"}</Link> : "Removed"}</td>
            <td>{r.reason.toLowerCase().replace(/_/g, " ")}</td>
            <td className="max-w-[280px]">{r.detail}</td>
            <td><Link href={`/admin/reports/${r.id}`} className="hover:underline">{r.status.toLowerCase()}</Link></td>
            <td>{shortDate(r.createdAt)}</td>
          </tr>
        );
      })}
    </DataTable>
  );
}
