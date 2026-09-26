import Link from "next/link";
import { db } from "@/lib/db";
import { DashboardShell, MetricBar, StatCard } from "@/components/dashboard-shell";
import { AdvertStatusPill, BusinessStatusPill, InsuranceStatus, QuoteStatusPill } from "@/components/service-ui";
import { requireServiceBusiness } from "@/server/service-marketplace";
import { serviceProviderNav } from "./nav";
import {
  categoryLabel,
  conversionRate,
  COUNTED_ADVERT_STATUSES,
  insuranceState,
  readyForReview,
  SERVICE_PLANS,
  servicePlanFor,
  type EvidenceLike,
} from "@/lib/service-marketplace";
import { shortDate, timeAgo } from "@/lib/format";

export const metadata = { title: "Service provider dashboard" };
export const dynamic = "force-dynamic";

export default async function ServiceProviderDashboard() {
  const { user, business } = await requireServiceBusiness();
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const now = new Date();
  const plan = servicePlanFor(business.subscription);
  const advanced = Boolean(plan?.advancedAnalytics);

  const [nav, evidence, adverts, quotes30, quoteStatuses, recentQuotes, events, favourites, conversations, activeBoosts, topServices, demand] = await Promise.all([
    serviceProviderNav(user.id),
    db.serviceEvidence.findMany({ where: { businessId: business.id }, select: { type: true, status: true, label: true, issuer: true, expiresAt: true } }),
    db.serviceAdvert.findMany({ where: { businessId: business.id, status: { not: "ARCHIVED" } }, orderBy: { updatedAt: "desc" }, select: { id: true, title: true, status: true, views: true, enquiries: true, category: true } }),
    db.serviceQuoteRequest.count({ where: { businessId: business.id, createdAt: { gte: since } } }),
    db.serviceQuoteRequest.groupBy({ by: ["status"], where: { businessId: business.id }, _count: true }),
    db.serviceQuoteRequest.findMany({ where: { businessId: business.id }, orderBy: { createdAt: "desc" }, take: 5, select: { id: true, service: true, location: true, status: true, createdAt: true, company: { select: { name: true } } } }),
    db.serviceEvent.groupBy({ by: ["type"], where: { businessId: business.id, createdAt: { gte: since } }, _count: true }),
    db.serviceFavourite.count({ where: { advert: { businessId: business.id } } }),
    db.conversation.count({ where: { serviceBusinessId: business.id, lastMessageAt: { gte: since } } }),
    db.serviceBoost.findMany({ where: { businessId: business.id, endsAt: { gt: now } }, orderBy: { endsAt: "asc" }, select: { id: true, endsAt: true, impressions: true, clicks: true, advert: { select: { id: true, title: true } } } }),
    db.serviceQuoteRequest.groupBy({ by: ["advertId"], where: { businessId: business.id, advertId: { not: null } }, _count: true, orderBy: { _count: { advertId: "desc" } }, take: 3 }),
    db.serviceQuoteRequest.groupBy({ by: ["location"], where: { businessId: business.id, createdAt: { gte: since } }, _count: true, orderBy: { _count: { location: "desc" } }, take: 5 }),
  ]);

  const eventCount = (type: string) => events.find((e) => e.type === type)?._count ?? 0;
  const statusCount = (status: string) => quoteStatuses.find((s) => s.status === status)?._count ?? 0;
  const totalQuotes = quoteStatuses.reduce((sum, s) => sum + s._count, 0);
  const won = statusCount("ACCEPTED") + statusCount("COMPLETED");
  const live = adverts.filter((a) => COUNTED_ADVERT_STATUSES.includes(a.status)).length;
  const insurance = insuranceState(evidence as EvidenceLike[], now);
  const check = readyForReview(business, evidence as EvidenceLike[], now);
  const topTitles = topServices.map((row) => ({ title: adverts.find((a) => a.id === row.advertId)?.title ?? "Archived advert", count: row._count }));

  const steps = [
    { label: "Complete your business profile", done: Boolean(business.description && business.categories.length && (business.areas.length || business.nationalCoverage)), href: "/service-provider/profile" },
    { label: "Upload insurance and incorporation documents", done: !check.missing.some((m) => m.includes("insurance") || m.includes("incorporation")), href: "/service-provider/verification" },
    { label: "Send your business for verification", done: !["ONBOARDING", "CHANGES_REQUESTED", "REJECTED"].includes(business.status), href: "/service-provider/verification" },
    { label: "Choose a plan (14-day free trial)", done: Boolean(plan), href: "/service-provider/plan" },
    { label: "Create your first advert", done: adverts.length > 0, href: "/service-provider/adverts/new" },
    { label: "Get approved and go live", done: business.status === "APPROVED" && adverts.some((a) => a.status === "ACTIVE"), href: "/service-provider/adverts" },
  ];
  const setupDone = steps.every((step) => step.done);

  return (
    <DashboardShell
      title={business.tradingName || business.name}
      subtitle="Advertise your services to accommodation providers on a paid RoomsNow membership. Only they can see your details and contact you."
      nav={nav}
      active="/service-provider"
      action={<Link href="/service-provider/adverts/new" className="btn-primary">New advert</Link>}
    >
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <BusinessStatusPill status={business.status} />
        <InsuranceStatus state={insurance.state} expiresAt={insurance.expiresAt} />
        {plan ? (
          <span className="rounded-pill bg-paper-sunk px-2.5 py-1 text-[12px] font-medium text-ink-soft">
            {plan.name}
            {business.subscription?.status === "TRIALING" && business.subscription.trialEndsAt ? ` · trial ends ${shortDate(business.subscription.trialEndsAt)}` : ""}
          </span>
        ) : (
          <Link href="/service-provider/plan" className="rounded-pill bg-clay-light px-2.5 py-1 text-[12px] font-medium text-clay">No plan — adverts hidden</Link>
        )}
      </div>

      {business.statusReason && ["CHANGES_REQUESTED", "REJECTED", "SUSPENDED"].includes(business.status) && (
        <div className="card mb-5 border-clay/30 bg-clay-light/40 p-4 text-[14px]">
          <p className="font-semibold text-clay">A note from our team</p>
          <p className="mt-1 text-ink">{business.statusReason}</p>
        </div>
      )}

      {!setupDone && (
        <section className="card mb-6 p-5" aria-labelledby="setup-heading">
          <h2 id="setup-heading" className="text-[18px]">Get listed</h2>
          <ol className="mt-3 space-y-2">
            {steps.map((step) => (
              <li key={step.label} className="flex items-center gap-3 text-[14px]">
                <span aria-hidden="true" className={step.done ? "grid h-6 w-6 place-items-center rounded-full bg-pine text-[12px] text-white" : "grid h-6 w-6 place-items-center rounded-full border border-line-strong text-[12px] text-ink-faint"}>
                  {step.done ? "✓" : ""}
                </span>
                {step.done ? <span className="text-ink-soft line-through decoration-ink-faint/40">{step.label}</span> : <Link href={step.href} className="font-medium text-brand underline-offset-2 hover:underline">{step.label}</Link>}
                <span className="sr-only">{step.done ? "(done)" : "(to do)"}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-ink-faint">Last 30 days</h2>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Profile views" value={eventCount("PROFILE_VIEW")} />
        <StatCard label="Advert views" value={eventCount("ADVERT_VIEW")} />
        <StatCard label="Quote requests" value={quotes30} />
        <StatCard label="Active conversations" value={conversations} />
        <StatCard label="Conversion rate" value={`${conversionRate(totalQuotes, won)}%`} hint={`${won} won of ${totalQuotes} requests, all time`} />
        <StatCard label="Saved by providers" value={favourites} />
        <StatCard label="Live adverts" value={`${live}/${plan?.maxAdverts ?? SERVICE_PLANS.STANDARD.maxAdverts}`} hint="Awaiting review and paused count too" />
        <StatCard label="Boost credits" value={business.subscription?.boostCredits ?? 0} hint={plan?.boostCreditsPerMonth ? `${plan.boostCreditsPerMonth} added each month` : "Included with Pro"} />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <section className="card p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-[18px]">Latest quote requests</h2>
            <Link href="/service-provider/quotes" className="text-[14px] text-brand underline-offset-2 hover:underline">All requests</Link>
          </div>
          {recentQuotes.length === 0 ? (
            <p className="mt-3 text-[14px] text-ink-soft">No requests yet. Providers can request a quote once one of your adverts is live.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {recentQuotes.map((quote) => (
                <li key={quote.id} className="flex items-center justify-between gap-3 py-2.5">
                  <Link href={`/service-provider/quotes/${quote.id}`} className="min-w-0">
                    <span className="block truncate text-[14px] font-medium text-ink">{quote.service}</span>
                    <span className="block truncate text-[13px] text-ink-faint">{quote.company.name} · {quote.location} · {timeAgo(quote.createdAt)}</span>
                  </Link>
                  <QuoteStatusPill status={quote.status} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-[18px]">Your adverts</h2>
            <Link href="/service-provider/adverts" className="text-[14px] text-brand underline-offset-2 hover:underline">Manage</Link>
          </div>
          {adverts.length === 0 ? (
            <p className="mt-3 text-[14px] text-ink-soft">
              No adverts yet. <Link href="/service-provider/adverts/new" className="text-brand underline">Create one</Link> — it&apos;s checked by our team before providers see it.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {adverts.slice(0, 5).map((advert) => (
                <li key={advert.id} className="flex items-center justify-between gap-3 py-2.5">
                  <Link href={`/service-provider/adverts/${advert.id}`} className="min-w-0">
                    <span className="block truncate text-[14px] font-medium text-ink">{advert.title}</span>
                    <span className="block text-[13px] text-ink-faint">{categoryLabel(advert.category)} · {advert.views} views · {advert.enquiries} enquiries</span>
                  </Link>
                  <AdvertStatusPill status={advert.status} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="card mt-5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[18px]">Insights</h2>
          {plan?.enquiryReports && <a href="/api/service-provider/enquiries" className="btn-secondary min-h-9 px-3 py-1.5 text-[13px]">Download enquiry report (CSV)</a>}
        </div>
        {!advanced ? (
          <p className="mt-2 text-[14px] text-ink-soft">
            Marketplace Pro shows your most requested services, where demand is coming from, and how your boosts perform.{" "}
            <Link href="/service-provider/plan" className="text-brand underline">Compare plans</Link>
          </p>
        ) : (
          <div className="mt-4 grid gap-6 md:grid-cols-3">
            <div>
              <h3 className="text-[14px] font-semibold text-ink">Most requested</h3>
              {topTitles.length ? (
                <div className="mt-3 space-y-3">{topTitles.map((row) => <MetricBar key={row.title} label={row.title} value={row.count} total={topTitles[0].count} />)}</div>
              ) : (
                <p className="mt-2 text-[13px] text-ink-faint">No requests yet.</p>
              )}
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-ink">Where demand is coming from</h3>
              {demand.length ? (
                <div className="mt-3 space-y-3">{demand.map((row) => <MetricBar key={row.location} label={row.location} value={row._count} total={demand[0]._count} tone="bg-brand" />)}</div>
              ) : (
                <p className="mt-2 text-[13px] text-ink-faint">No requests in the last 30 days.</p>
              )}
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-ink">Boosts running</h3>
              {activeBoosts.length ? (
                <ul className="mt-3 space-y-2 text-[13px]">
                  {activeBoosts.map((boost) => (
                    <li key={boost.id}>
                      <Link href={`/service-provider/adverts/${boost.advert.id}`} className="font-medium text-ink hover:underline">{boost.advert.title}</Link>
                      <span className="block text-ink-faint">{boost.impressions} top-slot views · {boost.clicks} clicks · until {shortDate(boost.endsAt)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-[13px] text-ink-faint">No boosts running.</p>
              )}
            </div>
          </div>
        )}
      </section>
    </DashboardShell>
  );
}
