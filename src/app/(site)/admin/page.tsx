import Link from "next/link";
import { redirect } from "next/navigation";
import { hasAdminPermission } from "@/lib/admin-permissions";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/rbac";
import { clsx } from "@/lib/clsx";
import { DashboardShell, MetricBar } from "@/components/dashboard-shell";
import { LineChart } from "@/components/admin-charts";
import { adminNav } from "./nav";
import { money, timeAgo } from "@/lib/format";
import { FEEDBACK_MARKER } from "@/lib/feedback";
import { dailySeries, dashboardAlerts, delta, waited, type Delta } from "@/lib/admin-dashboard";
import { PRO_SERVICES } from "@/lib/pro-services";

export const metadata = { title: "Admin" };
export const dynamic = "force-dynamic";

const DAY = 86_400_000;
const ukShort = (d: Date) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "Europe/London" }).format(d);
const label = (s: string) => s.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

function Kpi({ href, title, value, hint, change, kind = "Last 30 days" }: { href: string; title: string; value: string | number; hint?: string; change?: Delta; kind?: string }) {
  return (
    <Link href={href} className="card group flex min-w-0 flex-col p-4 transition hover:-translate-y-0.5 hover:border-pine/40 hover:shadow-raise">
      <span className="flex items-center justify-between gap-2 text-[12px] font-semibold uppercase tracking-[0.06em] text-ink-faint">
        {title}
        <span className="rounded-pill bg-paper-sunk px-1.5 py-0.5 text-[10.5px] normal-case tracking-normal">{kind}</span>
      </span>
      <span className="mt-2 font-display text-[30px] leading-none tabular-nums text-ink">{value}</span>
      {change && (
        <span className={clsx("mt-2 inline-flex w-fit rounded-pill px-2 py-0.5 text-[12px] font-semibold", change.tone === "up" ? "bg-[#DDF2E8] text-[#1D6E49]" : change.tone === "down" ? "bg-clay/15 text-clay" : "bg-paper-sunk text-ink-soft")}>
          {change.tone === "up" ? "▲ " : change.tone === "down" ? "▼ " : ""}{change.text}
        </span>
      )}
      {hint && <span className="mt-2 text-[12.5px] leading-snug text-ink-soft">{hint}</span>}
    </Link>
  );
}

function Panel({ title, href, linkText = "Open", children, className }: { title: string; href?: string; linkText?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={clsx("card min-w-0 p-5", className)}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-[17px]">{title}</h2>
        {href && <Link href={href} className="text-[13px] font-semibold text-pine-dark hover:underline">{linkText} →</Link>}
      </div>
      {children}
    </section>
  );
}

type QueueItem = { id: string; title: string; meta: string; since: Date };

function Queue({ name, count, href, items, urgent = false }: { name: string; count: number; href: string; items: QueueItem[]; urgent?: boolean }) {
  return (
    <div className={clsx("rounded-card border p-3.5", count ? (urgent ? "border-clay/40 bg-clay/5" : "border-line bg-paper-card") : "border-line bg-paper-sunk/40")}>
      <div className="flex items-center justify-between gap-2">
        <Link href={href} className="text-[14.5px] font-semibold text-ink hover:underline">{name}</Link>
        <span className={clsx("rounded-pill px-2 py-0.5 text-[12px] font-bold tabular-nums", count ? (urgent ? "bg-clay text-white" : "bg-pine text-white") : "bg-paper-sunk text-ink-faint")}>{count}</span>
      </div>
      {items.length > 0 ? (
        <ul className="mt-2 space-y-1.5">
          {items.map((it) => (
            <li key={it.id} className="flex items-baseline justify-between gap-3 text-[13px]">
              <span className="min-w-0 truncate text-ink-soft"><span className="text-ink">{it.title}</span>{it.meta ? ` · ${it.meta}` : ""}</span>
              <span className="shrink-0 text-ink-faint">{waited(it.since)}</span>
            </li>
          ))}
        </ul>
      ) : count === 0 ? (
        <p className="mt-1 text-[12.5px] text-ink-faint">All clear</p>
      ) : null}
      {count > 0 && <Link href={href} className="mt-2 inline-block text-[12.5px] font-semibold text-pine-dark hover:underline">Review →</Link>}
    </div>
  );
}

export default async function AdminHome() {
  const admin = await requireAdmin(["MODERATION", "NEWS"]);
  if (!hasAdminPermission(admin, "MODERATION")) redirect("/admin/news");
  if (!hasAdminPermission(admin)) redirect("/admin/reports");
  const nav = await adminNav();

  const now = new Date();
  const d30 = new Date(now.getTime() - 30 * DAY);
  const d60 = new Date(now.getTime() - 60 * DAY);
  const feedbackLike = `${FEEDBACK_MARKER}%`;

  // One round trip for the headline numbers.
  const [[t], newUsersByRole, reqRecent, refRecent, reqStatuses, refStatuses, subs, roomStatuses, proStatuses, pendingAdverts, pendingVerif, pendingAccr, openReports, newPro, recent] = await Promise.all([
    db.$queryRaw<Array<Record<string, bigint | null>>>`
      SELECT
        (SELECT count(*) FROM "User" WHERE "deletedAt" IS NULL) AS "users",
        (SELECT count(*) FROM "User" WHERE "deletedAt" IS NULL AND "createdAt" >= ${d30}) AS "users30",
        (SELECT count(*) FROM "User" WHERE "deletedAt" IS NULL AND "createdAt" >= ${d60} AND "createdAt" < ${d30}) AS "usersPrev",
        (SELECT count(*) FROM "Company") AS "companies",
        (SELECT count(*) FROM "AccommodationRequest") AS "requests",
        (SELECT count(*) FROM "AccommodationRequest" WHERE "createdAt" >= ${d30}) AS "req30",
        (SELECT count(*) FROM "AccommodationRequest" WHERE "createdAt" >= ${d60} AND "createdAt" < ${d30}) AS "reqPrev",
        (SELECT count(*) FROM "Referral") AS "referrals",
        (SELECT count(*) FROM "Referral" WHERE "createdAt" >= ${d30}) AS "ref30",
        (SELECT count(*) FROM "Referral" WHERE "createdAt" >= ${d60} AND "createdAt" < ${d30}) AS "refPrev",
        (SELECT count(*) FROM "Listing" WHERE status::text = 'ACTIVE') AS "live",
        (SELECT count(*) FROM "Listing" WHERE status::text = 'PENDING_REVIEW') AS "pending",
        (SELECT count(*) FROM "Room" r JOIN "Listing" l ON l.id = r."listingId" WHERE l.status::text = 'ACTIVE') AS "liveRooms",
        (SELECT count(*) FROM "Room" r JOIN "Listing" l ON l.id = r."listingId" WHERE l.status::text = 'ACTIVE' AND r.status::text = 'AVAILABLE') AS "availableRooms",
        (SELECT count(*) FROM "Message" WHERE "createdAt" >= ${d30}) AS "msg30",
        (SELECT count(*) FROM "Message" WHERE "createdAt" >= ${d60} AND "createdAt" < ${d30}) AS "msgPrev",
        (SELECT count(*) FROM "Viewing" WHERE "createdAt" >= ${d30}) AS "view30",
        (SELECT count(*) FROM "Viewing" WHERE "createdAt" >= ${d60} AND "createdAt" < ${d30}) AS "viewPrev",
        (SELECT count(*) FROM "WhatsappClick" WHERE "createdAt" >= ${d30}) AS "wa30",
        (SELECT count(*) FROM "WhatsappClick" WHERE "createdAt" >= ${d60} AND "createdAt" < ${d30}) AS "waPrev",
        (SELECT coalesce(sum(amount), 0) FROM "Payment" WHERE status::text = 'PAID' AND "createdAt" >= ${d30}) AS "paid30",
        (SELECT coalesce(sum(amount), 0) FROM "Payment" WHERE status::text = 'PAID' AND "createdAt" >= ${d60} AND "createdAt" < ${d30}) AS "paidPrev",
        (SELECT count(*) FROM "Payment" WHERE status::text = 'PAID' AND "createdAt" >= ${d30}) AS "paidCount30",
        (SELECT count(*) FROM "Payment" WHERE status::text = 'FAILED' AND "createdAt" >= ${d30}) AS "failed30",
        (SELECT coalesce(sum(amount), 0) FROM "Payment" WHERE status::text = 'PAID') AS "paidAll",
        (SELECT count(*) FROM "Report" WHERE status::text IN ('OPEN', 'REVIEWING') AND "detail" LIKE ${feedbackLike}) AS "feedback",
        (SELECT count(*) FROM "Report" WHERE status::text IN ('OPEN', 'REVIEWING') AND "detail" NOT LIKE ${feedbackLike}) AS "reports",
        (SELECT count(*) FROM "VerificationRequest" WHERE status::text = 'PENDING') AS "verification",
        (SELECT count(*) FROM "ProviderAccreditation" WHERE status::text = 'UNDER_ASSESSMENT') AS "accreditations",
        (SELECT count(*) FROM "ProServiceEnquiry" WHERE status = 'NEW') AS "proNew",
        (
          (SELECT count(*) FROM "ServiceBusiness" WHERE status::text = 'PENDING_REVIEW')
          + (SELECT count(*) FROM "ServiceAdvert" WHERE status::text = 'PENDING_REVIEW')
        ) AS "marketplace",
        (SELECT count(*) FROM "SupportOrganisation" WHERE status::text = 'PENDING') AS "support",
        (SELECT coalesce(sum(views), 0) FROM "NewsPost" WHERE "publishedAt" IS NOT NULL) AS "newsViews",
        (SELECT count(DISTINCT "applicantId") FROM "AccommodationRequest" WHERE status::text = 'MOVED_IN') AS "housedRequests",
        (SELECT count(*) FROM "Referral" WHERE status::text = 'MOVED_IN') AS "housedReferrals"
    `,
    db.user.groupBy({ by: ["role"], where: { deletedAt: null, createdAt: { gte: d30 } }, _count: true }),
    db.accommodationRequest.findMany({ where: { createdAt: { gte: d30 } }, select: { createdAt: true } }),
    db.referral.findMany({ where: { createdAt: { gte: d30 } }, select: { createdAt: true } }),
    db.accommodationRequest.groupBy({ by: ["status"], _count: true }),
    db.referral.groupBy({ by: ["status"], _count: true }),
    db.subscription.findMany({ select: { status: true, membership: { select: { tier: true, priceMonthly: true } } } }),
    db.$queryRaw<Array<{ status: string; count: bigint }>>`SELECT r.status::text AS status, count(*) AS count FROM "Room" r JOIN "Listing" l ON l.id = r."listingId" WHERE l.status::text = 'ACTIVE' GROUP BY 1 ORDER BY 2 DESC`,
    db.proServiceEnquiry.groupBy({ by: ["status"], _count: true }),
    db.listing.findMany({ where: { status: "PENDING_REVIEW" }, orderBy: { updatedAt: "asc" }, take: 3, select: { id: true, title: true, updatedAt: true, company: { select: { name: true } } } }),
    db.verificationRequest.findMany({ where: { status: "PENDING" }, orderBy: { createdAt: "asc" }, take: 3, select: { id: true, type: true, createdAt: true, company: { select: { name: true } } } }),
    db.providerAccreditation.findMany({ where: { status: "UNDER_ASSESSMENT" }, orderBy: { createdAt: "asc" }, take: 3, select: { id: true, name: true, createdAt: true, company: { select: { name: true } } } }),
    db.report.findMany({ where: { status: { in: ["OPEN", "REVIEWING"] }, NOT: { detail: { startsWith: FEEDBACK_MARKER } } }, orderBy: { createdAt: "asc" }, take: 3, select: { id: true, reason: true, createdAt: true } }),
    db.proServiceEnquiry.findMany({ where: { status: "NEW" }, orderBy: { createdAt: "asc" }, take: 3, select: { id: true, companyName: true, service: true, createdAt: true } }),
    db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
  ]);
  const n = (v: bigint | number | null | undefined) => Number(v ?? 0);
  const actors = await db.user.findMany({ where: { id: { in: recent.map((r) => r.actorId).filter((id): id is string => Boolean(id)) } }, select: { id: true, firstName: true, lastName: true } });
  const actorName = new Map(actors.map((a) => [a.id, `${a.firstName} ${a.lastName}`.trim()]));

  const live = n(t.live);
  const availableRooms = n(t.availableRooms);
  const paying = subs.filter((s) => ["ACTIVE", "TRIALING", "PAST_DUE"].includes(s.status));
  const byTier = (tier: string) => paying.filter((s) => s.membership.tier === tier).length;
  const mrr = paying.reduce((sum, s) => sum + s.membership.priceMonthly, 0);
  const subStatusCounts = Object.entries(subs.reduce<Record<string, number>>((acc, s) => ({ ...acc, [s.status]: (acc[s.status] ?? 0) + 1 }), {}));
  const requests = n(t.requests);
  const referrals = n(t.referrals);
  const reqSeries = dailySeries(reqRecent.map((r) => r.createdAt), 30, now);
  const refSeries = dailySeries(refRecent.map((r) => r.createdAt), 30, now);
  const roleName: Record<string, string> = { USER: "seekers", PROVIDER: "providers", REFERRER: "referrers", SERVICE_PROVIDER: "trades", ADMIN: "admins" };
  const roleSplit = newUsersByRole.map((r) => `${r._count} ${roleName[r.role] ?? r.role.toLowerCase()}`).join(" · ");
  const roomTotal = roomStatuses.reduce((s, r) => s + n(r.count), 0);
  const proCount = (s: string) => proStatuses.find((p) => p.status === s)?._count ?? 0;
  const proTotal = proStatuses.reduce((s, p) => s + p._count, 0);

  const alerts = dashboardAlerts({
    availableRooms,
    liveAdverts: live,
    pendingAdverts: n(t.pending),
    pendingVerification: n(t.verification),
    pendingAccreditations: n(t.accreditations),
    newProEnquiries: n(t.proNew),
    requests: [n(t.req30), n(t.reqPrev)],
    referrals: [n(t.ref30), n(t.refPrev)],
  });

  return (
    <DashboardShell
      title="Control room"
      subtitle={`Last 30 days (${ukShort(d30)} to ${ukShort(now)}) compared with the 30 days before (${ukShort(d60)} to ${ukShort(d30)}). Every tile and queue links to its page.`}
      nav={nav}
      active="/admin"
      action={<Link href="/admin/audit" className="btn-secondary">Audit log</Link>}
    >
      {alerts.length > 0 && (
        <div className="mb-5 grid gap-2">
          {alerts.map((a) => (
            <Link key={a.text} href={a.href} className={clsx("flex items-center justify-between gap-3 rounded-card border px-4 py-3 text-[14.5px] font-semibold", a.level === "red" ? "border-clay/50 bg-clay/10 text-clay" : "border-[#F5B544]/60 bg-[#F5B544]/15 text-ink")}>
              <span>{a.level === "red" ? "⚠ " : "● "}{a.text}</span>
              <span className="shrink-0 text-[13px]">Review →</span>
            </Link>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 2xl:grid-cols-8">
        <Kpi href="/admin/users" title="Total users" kind="Now" value={n(t.users)} change={{ ...delta(n(t.users30), n(t.usersPrev)), text: `${n(t.users30)} new, ${delta(n(t.users30), n(t.usersPrev)).text}` }} hint={roleSplit ? `New: ${roleSplit}` : undefined} />
        <Kpi href="/admin/requests" title="New requests" value={n(t.req30)} change={delta(n(t.req30), n(t.reqPrev))} hint={`${requests} all time`} />
        <Kpi href="/admin/referrals" title="New referrals" value={n(t.ref30)} change={delta(n(t.ref30), n(t.refPrev))} hint={`${referrals} all time`} />
        <Kpi href="/admin/memberships" title="Revenue" value={money(n(t.paid30))} change={delta(n(t.paid30), n(t.paidPrev))} hint={`${n(t.paidCount30)} payments · ${n(t.failed30)} failed · ${money(n(t.paidAll))} all time`} />
        <Kpi href="/admin/listings" title="Live adverts" value={live} kind="Now" hint={`${n(t.pending)} waiting for review · ${n(t.companies)} providers`} />
        <Kpi href="/admin/listings" title="Available rooms" value={availableRooms} kind="Now" hint={`of ${n(t.liveRooms)} rooms on live adverts`} />
        <Kpi href="/admin/memberships" title="Paid members" value={paying.length} kind="Now" hint={`${byTier("PROFESSIONAL")} Professional · ${byTier("BUSINESS")} Business · ${money(mrr)}/month`} />
        <Kpi href="/admin/pro-services" title="Pro Services" value={n(t.proNew)} kind="Now" hint={`new enquiries waiting · ${proTotal} in total`} />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-12">
        <div className="grid min-w-0 gap-5 xl:col-span-8">
          <Panel title="Demand over time" href="/admin/requests" linkText="Requests">
            <p className="-mt-2 mb-3 text-[13px] text-ink-soft">
              Daily new requests and referrals. Last 30 days: <strong className="text-ink">{n(t.req30)}</strong> requests, <strong className="text-ink">{n(t.ref30)}</strong> referrals. Previous 30: {n(t.reqPrev)} and {n(t.refPrev)}.
            </p>
            <LineChart
              title="New requests and referrals per day, last 30 days"
              days={reqSeries.map((d) => d.day)}
              series={[
                { label: "Requests", points: reqSeries.map((d) => d.count), stroke: "stroke-pine", dot: "fill-pine", swatch: "bg-pine", fill: "fill-pine/10" },
                { label: "Referrals", points: refSeries.map((d) => d.count), stroke: "stroke-clay", dot: "fill-clay", swatch: "bg-clay" },
              ]}
            />
          </Panel>

          <div className="grid gap-5 md:grid-cols-2">
            <Panel title="Request pipeline" href="/admin/requests">
              <p className="-mt-2 mb-3 text-[12.5px] text-ink-faint">Current status of all {requests} requests</p>
              <div className="space-y-3">{[...reqStatuses].sort((a, b) => b._count - a._count).map((s) => <MetricBar key={s.status} label={label(s.status)} value={s._count} total={requests} />)}</div>
            </Panel>
            <Panel title="Referral pipeline" href="/admin/referrals">
              <p className="-mt-2 mb-3 text-[12.5px] text-ink-faint">Current status of all {referrals} referrals · {n(t.housedRequests) + n(t.housedReferrals)} people housed</p>
              <div className="space-y-3">{[...refStatuses].sort((a, b) => b._count - a._count).map((s) => <MetricBar key={s.status} label={label(s.status)} value={s._count} total={referrals} tone="bg-clay" />)}</div>
            </Panel>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <Panel title="Rooms on live adverts" href="/admin/listings">
              <div className="space-y-3">
                {roomStatuses.length ? roomStatuses.map((r) => <MetricBar key={r.status} label={label(r.status)} value={n(r.count)} total={roomTotal} tone={r.status === "AVAILABLE" ? "bg-[#2E9E6B]" : "bg-pine"} />) : <p className="text-[13px] text-ink-faint">No rooms on live adverts.</p>}
              </div>
            </Panel>
            <Panel title="Memberships" href="/admin/memberships">
              <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-[14px] tabular-nums">
                <dt className="text-ink-soft">Professional</dt><dd className="text-right font-semibold">{byTier("PROFESSIONAL")}</dd>
                <dt className="text-ink-soft">Business</dt><dd className="text-right font-semibold">{byTier("BUSINESS")}</dd>
                <dt className="text-ink-soft">Monthly value</dt><dd className="text-right font-semibold">{money(mrr)}</dd>
                <dt className="text-ink-soft">Free providers</dt><dd className="text-right font-semibold">{Math.max(0, n(t.companies) - paying.length)}</dd>
              </dl>
              {subStatusCounts.length > 0 && <p className="mt-3 text-[12px] text-ink-faint">Subscriptions: {subStatusCounts.map(([s, c]) => `${c} ${label(s).toLowerCase()}`).join(" · ")}</p>}
            </Panel>
            <Panel title="Contact activity" href="/admin/contact-activity">
              <dl className="space-y-2.5 text-[14px]">
                {([["Messages", n(t.msg30), n(t.msgPrev)], ["Viewings booked", n(t.view30), n(t.viewPrev)], ["WhatsApp clicks", n(t.wa30), n(t.waPrev)]] as const).map(([k, v, p]) => {
                  const ch = delta(v, p);
                  return (
                    <div key={k} className="flex items-baseline justify-between gap-2">
                      <dt className="text-ink-soft">{k}</dt>
                      <dd className="text-right"><span className="font-semibold tabular-nums">{v}</span> <span className={clsx("text-[11.5px]", ch.tone === "up" ? "text-[#1D6E49]" : ch.tone === "down" ? "text-clay" : "text-ink-faint")}>{ch.text.replace(" vs previous 30 days", "")}</span></dd>
                    </div>
                  );
                })}
              </dl>
              <p className="mt-3 text-[12px] text-ink-faint">News read {n(t.newsViews)} times in total</p>
            </Panel>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <Panel title="Pro Services pipeline" href="/admin/pro-services">
              <div className="grid grid-cols-4 gap-2 text-center">
                {(["NEW", "CONTACTED", "WON", "LOST"] as const).map((s) => (
                  <div key={s} className="rounded-[10px] bg-paper-sunk/60 p-2.5">
                    <p className="font-display text-[22px] tabular-nums">{proCount(s)}</p>
                    <p className="text-[11.5px] text-ink-soft">{label(s)}</p>
                  </div>
                ))}
              </div>
            </Panel>
            <Panel title="Recent admin activity" href="/admin/audit" linkText="Audit log">
              <ul className="divide-y divide-line">
                {recent.map((e) => (
                  <li key={e.id} className="flex items-baseline justify-between gap-3 py-2 text-[13px]">
                    <span className="min-w-0 truncate"><span className="font-semibold text-ink">{e.actorId ? (actorName.get(e.actorId) ?? "Someone") : "System"}</span> <span className="text-ink-soft">{e.action.replace(/[._]/g, " ")}{e.targetType ? ` · ${e.targetType}` : ""}</span></span>
                    <span className="shrink-0 text-ink-faint">{timeAgo(e.createdAt)}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        </div>

        <aside className="min-w-0 xl:col-span-4">
          <div className="card p-5 xl:sticky xl:top-24">
            <h2 className="text-[17px]">Needs action now</h2>
            <p className="mt-0.5 text-[12.5px] text-ink-faint">Oldest first</p>
            <div className="mt-4 grid gap-2.5">
              <Queue name="Reports" urgent count={n(t.reports)} href="/admin/reports" items={openReports.map((r) => ({ id: r.id, title: label(r.reason), meta: "", since: r.createdAt }))} />
              <Queue name="Adverts to review" count={n(t.pending)} href="/admin/listings?status=PENDING_REVIEW" items={pendingAdverts.map((l) => ({ id: l.id, title: l.title, meta: l.company.name, since: l.updatedAt }))} />
              <Queue name="Verification" count={n(t.verification)} href="/admin/verification" items={pendingVerif.map((v) => ({ id: v.id, title: v.company.name, meta: label(v.type), since: v.createdAt }))} />
              <Queue name="Accreditations" count={n(t.accreditations)} href="/admin/accreditations" items={pendingAccr.map((a) => ({ id: a.id, title: a.company.name, meta: a.name, since: a.createdAt }))} />
              <Queue name="Pro Services enquiries" count={n(t.proNew)} href="/admin/pro-services" items={newPro.map((p) => ({ id: p.id, title: p.companyName, meta: PRO_SERVICES[p.service as keyof typeof PRO_SERVICES]?.name ?? p.service, since: p.createdAt }))} />
              <Queue name="Site feedback" count={n(t.feedback)} href="/admin/feedback" items={[]} />
              <Queue name="Services marketplace" count={n(t.marketplace)} href="/admin/marketplace" items={[]} />
              <Queue name="Support services" count={n(t.support)} href="/admin/support-services" items={[]} />
            </div>
          </div>
        </aside>
      </div>
    </DashboardShell>
  );
}
