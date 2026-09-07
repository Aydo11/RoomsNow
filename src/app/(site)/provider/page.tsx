import Link from "next/link";
import { db } from "@/lib/db";
import { requireCompany } from "@/lib/rbac";
import { planLimits } from "@/lib/billing";
import { DashboardShell, MetricBar, StatCard } from "@/components/dashboard-shell";
import { RoomStrip, StatusPill } from "@/components/badges";
import { providerNav } from "./nav";
import { LISTING_STATUSES } from "@/lib/taxonomy";
import { timeAgo } from "@/lib/format";

export const metadata = { title: "Provider dashboard" };
export const dynamic = "force-dynamic";

export default async function ProviderDashboard() {
  const { companyId, user } = await requireCompany();
  const nav = await providerNav(companyId);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60_000);

  const [company, limits, listings, rooms, requests, referrals, views, requests30d, referrals30d, requestStatuses, referralStatuses, unreadThreads, topListings] = await Promise.all([
    db.company.findUniqueOrThrow({ where: { id: companyId } }),
    planLimits(companyId),
    db.listing.findMany({
      where: { companyId },
      orderBy: { updatedAt: "desc" },
      take: 6,
      include: { rooms: { select: { status: true } } },
    }),
    db.room.groupBy({ by: ["status"], where: { property: { companyId } }, _count: true }),
    db.accommodationRequest.count({ where: { listing: { companyId }, status: { in: ["SUBMITTED", "RECEIVED"] } } }),
    db.referral.count({ where: { listing: { companyId }, status: { in: ["SUBMITTED", "RECEIVED"] } } }),
    db.listing.aggregate({ where: { companyId }, _sum: { views: true, enquiries: true } }),
    db.accommodationRequest.count({ where: { listing: { companyId }, createdAt: { gte: thirtyDaysAgo } } }),
    db.referral.count({ where: { listing: { companyId }, createdAt: { gte: thirtyDaysAgo } } }),
    db.accommodationRequest.groupBy({ by: ["status"], where: { listing: { companyId } }, _count: true }),
    db.referral.groupBy({ by: ["status"], where: { listing: { companyId } }, _count: true }),
    db.conversationParticipant.count({ where: { userId: user.id, archived: false, conversation: { messages: { some: { senderId: { not: user.id }, readAt: null } } } } }),
    db.listing.findMany({ where: { companyId }, orderBy: { views: "desc" }, take: 5, select: { id: true, title: true, reference: true, views: true, enquiries: true } }),
  ]);

  const available = rooms.find((r) => r.status === "AVAILABLE")?._count ?? 0;
  const totalRooms = rooms.reduce((sum, r) => sum + r._count, 0);

  return (
    <DashboardShell
      title={company.name}
      subtitle={`${limits.membership.name} membership · ${limits.used.listings} of ${
        limits.membership.maxListings === -1 ? "unlimited" : limits.membership.maxListings
      } adverts used`}
      nav={nav}
      active="/provider"
      action={
        <Link href="/provider/adverts/new" className="btn-primary">
          Post an advert
        </Link>
      }
    >
      {company.verification !== "APPROVED" && (
        <div className="card mb-6 flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <h2 className="text-[18px]">Get verified</h2>
            <p className="mt-1 max-w-[60ch] text-[14px] text-ink-soft">
              Verified providers get a badge and appear in the &ldquo;verified only&rdquo; filter.
              Our team checks your documents manually.
            </p>
          </div>
          <Link href="/provider/settings" className="btn-secondary">Start verification</Link>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Rooms available" value={available} hint={`of ${totalRooms} rooms`} />
        <StatCard label="New requests" value={requests} hint={`${requests30d} received in 30 days`} />
        <StatCard label="New referrals" value={referrals} hint={`${referrals30d} received in 30 days`} />
        <StatCard
          label="Advert views"
          value={views._sum.views ?? 0}
          hint={`${views._sum.enquiries ?? 0} enquiries`}
        />
      </div>

      {unreadThreads > 0 && (
        <Link href="/messages" className="card mt-5 flex items-center justify-between gap-4 border-pine/30 bg-pine-light/40 p-4 transition hover:border-pine">
          <span><strong>{unreadThreads} conversation{unreadThreads === 1 ? "" : "s"}</strong><span className="ml-2 text-[14px] text-ink-soft">waiting for your reply</span></span>
          <span className="text-[14px] font-semibold text-pine-dark">Open messages →</span>
        </Link>
      )}

      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-[20px]">Your adverts</h2>
          <Link href="/provider/adverts" className="text-[14px] text-pine-dark hover:underline">See all</Link>
        </div>

        {listings.length === 0 ? (
          <div className="card mt-3 p-6">
            <p className="text-[15px] text-ink-soft">No adverts yet. Your first one takes about five minutes.</p>
            <Link href="/provider/adverts/new" className="btn-primary mt-4">Post an advert</Link>
          </div>
        ) : (
          <ul className="card mt-3 divide-y divide-line">
            {listings.map((listing) => (
              <li key={listing.id} className="flex flex-wrap items-center gap-4 px-4 py-4">
                <div className="min-w-0 flex-1">
                  <Link href={`/provider/adverts/${listing.id}`} className="text-[16px] hover:text-pine-dark">
                    {listing.title}
                  </Link>
                  <p className="mt-1 text-[13px] text-ink-faint">
                    {listing.reference} · updated {timeAgo(listing.updatedAt)} · {listing.views} views
                  </p>
                </div>
                <RoomStrip rooms={listing.rooms} showLabels />
                <StatusPill
                  status={LISTING_STATUSES[listing.status]}
                  tone={listing.status === "ACTIVE" ? "good" : listing.status === "PENDING_REVIEW" ? "warn" : "muted"}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      {limits.membership.analytics ? (
        <section className="mt-8">
          <h2 className="text-[20px]">Analytics</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            <StatCard label="Views per advert" value={Math.round((views._sum.views ?? 0) / Math.max(1, limits.used.listings))} />
            <StatCard
              label="Enquiry rate"
              value={`${Math.round(((views._sum.enquiries ?? 0) / Math.max(1, views._sum.views ?? 1)) * 100)}%`}
              hint="Enquiries per view"
            />
            <StatCard label="Occupancy" value={`${Math.round(((totalRooms - available) / Math.max(1, totalRooms)) * 100)}%`} />
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="card p-5">
              <h3 className="text-[17px]">Requests by stage</h3>
              <div className="mt-4 space-y-3">
                {requestStatuses.map((item) => <MetricBar key={item.status} label={item.status.replace(/_/g, " ").toLowerCase()} value={item._count} total={requestStatuses.reduce((sum, row) => sum + row._count, 0)} />)}
              </div>
            </div>
            <div className="card p-5">
              <h3 className="text-[17px]">Referrals by stage</h3>
              <div className="mt-4 space-y-3">
                {referralStatuses.map((item) => <MetricBar key={item.status} label={item.status.replace(/_/g, " ").toLowerCase()} value={item._count} total={referralStatuses.reduce((sum, row) => sum + row._count, 0)} tone="bg-clay" />)}
              </div>
            </div>
          </div>
          <div className="card mt-4 overflow-hidden">
            <div className="border-b border-line px-5 py-4"><h3 className="text-[17px]">Best-performing adverts</h3><p className="mt-1 text-[13px] text-ink-soft">Use enquiry rate alongside views to see which adverts turn attention into contact.</p></div>
            <ul className="divide-y divide-line">
              {topListings.map((listing) => (
                <li key={listing.id} className="grid gap-2 px-5 py-3.5 sm:grid-cols-[1fr_auto_auto] sm:items-center sm:gap-6">
                  <Link href={`/provider/adverts/${listing.id}`} className="min-w-0 truncate text-[14px] font-medium hover:text-pine-dark">{listing.title}</Link>
                  <span className="text-[13px] text-ink-soft">{listing.views} views</span>
                  <span className="text-[13px] font-semibold text-ink">{listing.enquiries} enquiries · {Math.round((listing.enquiries / Math.max(1, listing.views)) * 100)}%</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : (
        <div className="card mt-8 flex flex-wrap items-center justify-between gap-4 p-5">
          <p className="text-[15px] text-ink-soft">Analytics are part of the Professional plan and above.</p>
          <Link href="/provider/membership" className="btn-secondary">See plans</Link>
        </div>
      )}
    </DashboardShell>
  );
}
