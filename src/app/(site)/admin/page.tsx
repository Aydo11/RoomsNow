import Link from "next/link";
import { redirect } from "next/navigation";
import { hasAdminPermission } from "@/lib/admin-permissions";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/rbac";
import { DashboardShell, MetricBar, StatCard } from "@/components/dashboard-shell";
import { adminNav } from "./nav";
import { timeAgo } from "@/lib/format";
import { FEEDBACK_MARKER } from "@/lib/feedback";

export const metadata = { title: "Admin" };
export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const admin = await requireAdmin("MODERATION");
  if (!hasAdminPermission(admin)) redirect("/admin/reports");
  const nav = await adminNav();

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60_000);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60_000);
  // One round trip for all the headline numbers instead of fifteen separate
  // count queries (which queued behind each other on the connection pool and
  // made this page slow to open, especially with several tabs).
  const [[totals], requestStatuses, referralStatuses, recent] = await Promise.all([
    db.$queryRaw<
      Array<Record<"users" | "newUsers7d" | "newUsers30d" | "companies" | "live" | "pending" | "rooms" | "available" | "requests" | "newRequests30d" | "referrals" | "newReferrals30d" | "reports" | "feedback" | "verification", bigint>>
    >`
      SELECT
        (SELECT count(*) FROM "User" WHERE "deletedAt" IS NULL) AS "users",
        (SELECT count(*) FROM "User" WHERE "deletedAt" IS NULL AND "createdAt" >= ${sevenDaysAgo}) AS "newUsers7d",
        (SELECT count(*) FROM "User" WHERE "deletedAt" IS NULL AND "createdAt" >= ${thirtyDaysAgo}) AS "newUsers30d",
        (SELECT count(*) FROM "Company") AS "companies",
        (SELECT count(*) FROM "Listing" WHERE status::text = 'ACTIVE') AS "live",
        (SELECT count(*) FROM "Listing" WHERE status::text = 'PENDING_REVIEW') AS "pending",
        (SELECT count(*) FROM "Room") AS "rooms",
        (SELECT count(*) FROM "Room" WHERE status::text = 'AVAILABLE') AS "available",
        (SELECT count(*) FROM "AccommodationRequest") AS "requests",
        (SELECT count(*) FROM "AccommodationRequest" WHERE "createdAt" >= ${thirtyDaysAgo}) AS "newRequests30d",
        (SELECT count(*) FROM "Referral") AS "referrals",
        (SELECT count(*) FROM "Referral" WHERE "createdAt" >= ${thirtyDaysAgo}) AS "newReferrals30d",
        (SELECT count(*) FROM "Report" WHERE status::text IN ('OPEN', 'REVIEWING') AND "detail" NOT LIKE ${`${FEEDBACK_MARKER}%`}) AS "reports",
        (SELECT count(*) FROM "Report" WHERE status::text IN ('OPEN', 'REVIEWING') AND "detail" LIKE ${`${FEEDBACK_MARKER}%`}) AS "feedback",
        (SELECT count(*) FROM "VerificationRequest" WHERE status::text = 'PENDING') AS "verification"
    `,
    db.accommodationRequest.groupBy({ by: ["status"], _count: true }),
    db.referral.groupBy({ by: ["status"], _count: true }),
    db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 12 }),
  ]);
  const n = (value: bigint | number | null | undefined) => Number(value ?? 0);
  const users = n(totals.users);
  const newUsers7d = n(totals.newUsers7d);
  const newUsers30d = n(totals.newUsers30d);
  const companies = n(totals.companies);
  const live = n(totals.live);
  const pending = n(totals.pending);
  const rooms = n(totals.rooms);
  const available = n(totals.available);
  const requests = n(totals.requests);
  const newRequests30d = n(totals.newRequests30d);
  const referrals = n(totals.referrals);
  const newReferrals30d = n(totals.newReferrals30d);
  const reports = n(totals.reports);
  const feedback = n(totals.feedback);
  const verification = n(totals.verification);

  return (
    <DashboardShell
      title="Admin"
      subtitle="Moderation, verification and platform health."
      nav={nav}
      active="/admin"
    >
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard compact label="Live adverts" value={live} hint={`${pending} awaiting review`} />
        <StatCard compact label="Rooms available" value={available} hint={`of ${rooms} rooms`} />
        <StatCard compact label="Users" value={users} hint={`+${newUsers7d} in 7 days · +${newUsers30d} in 30`} />
        <StatCard compact label="Requests" value={requests} hint={`+${newRequests30d} in 30 days`} />
        <StatCard compact label="Referrals" value={referrals} hint={`+${newReferrals30d} in 30 days`} />
        <StatCard compact label="Review queue" value={reports + feedback + verification} hint={`${reports} reports · ${feedback} feedback · ${verification} checks`} />
      </div>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="text-[18px]">Request pipeline</h2>
          <div className="mt-4 space-y-3">
            {requestStatuses.map((item) => <MetricBar key={item.status} label={item.status.replace(/_/g, " ").toLowerCase()} value={item._count} total={requests} />)}
          </div>
        </div>
        <div className="card p-5">
          <h2 className="text-[18px]">Referral pipeline</h2>
          <div className="mt-4 space-y-3">
            {referralStatuses.map((item) => <MetricBar key={item.status} label={item.status.replace(/_/g, " ").toLowerCase()} value={item._count} total={referrals} tone="bg-clay" />)}
          </div>
        </div>
      </section>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Link href="/admin/team" className="card p-4 transition hover:-translate-y-0.5 hover:border-pine/40 hover:shadow-raise sm:p-5">
          <p className="text-[13px] font-semibold uppercase tracking-wide text-pine-dark">Access control</p>
          <h2 className="mt-1 text-[19px]">Team & permissions</h2>
          <p className="mt-1 text-[14px] text-ink-soft">Add another administrator or moderator and control what they can manage.</p>
        </Link>
        <Link href="/admin/audit" className="card p-4 transition hover:-translate-y-0.5 hover:border-pine/40 hover:shadow-raise sm:p-5">
          <p className="text-[13px] font-semibold uppercase tracking-wide text-pine-dark">Accountability</p>
          <h2 className="mt-1 text-[19px]">Detailed audit log</h2>
          <p className="mt-1 text-[14px] text-ink-soft">Review sign-ins, moderation, document access and team changes.</p>
        </Link>
      </div>

      {pending > 0 && (
        <div className="card mt-6 flex flex-wrap items-center justify-between gap-4 p-5">
          <p className="text-[15px]">
            {pending} advert{pending === 1 ? "" : "s"} waiting for review.
          </p>
          <Link href="/admin/listings?status=PENDING_REVIEW" className="btn-primary">Review now</Link>
        </div>
      )}

      <section className="mt-8">
        <h2 className="text-[20px]">Recent activity</h2>
        <ul className="card mt-3 divide-y divide-line">
          {recent.map((entry) => (
            <li key={entry.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
              <span className="text-[14px]">{entry.action.replace(/[._]/g, " ")}</span>
              <span className="text-[13px] text-ink-faint">
                {entry.targetType} · {timeAgo(entry.createdAt)}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </DashboardShell>
  );
}
