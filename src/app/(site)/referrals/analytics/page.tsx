import Link from "next/link";
import { db } from "@/lib/db";
import { requireReferrer } from "@/lib/rbac";
import { DashboardShell, DataTable, MetricBar, StatCard } from "@/components/dashboard-shell";
import { ReferralTrendChart, type TrendPoint } from "@/components/referral-trend-chart";
import { PIPELINE, PIPELINE_LABELS, supportLabel } from "@/lib/taxonomy";
import { shortDate } from "@/lib/format";
import { clsx } from "@/lib/clsx";
import { referrerNav } from "../nav";
import { teamMemberIds } from "@/lib/referral-team";

export const metadata = { title: "Analytics" };
export const dynamic = "force-dynamic";

const RANGES = {
  "30d": { label: "30 days", days: 30, bucket: "week" },
  "90d": { label: "90 days", days: 90, bucket: "week" },
  "12m": { label: "12 months", days: 365, bucket: "month" },
  all: { label: "All time", days: null, bucket: "month" },
} as const;
type RangeKey = keyof typeof RANGES;

const DAY = 24 * 60 * 60 * 1000;
const CLOSED = new Set(["MOVED_IN", "DECLINED", "WITHDRAWN"]);

function median(values: number[]) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function formatDuration(ms: number | null) {
  if (ms === null) return "—";
  const hours = ms / (60 * 60 * 1000);
  if (hours < 1) return "under an hour";
  if (hours < 48) return `${Math.round(hours)} hr${Math.round(hours) === 1 ? "" : "s"}`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"}`;
}

const pct = (part: number, whole: number) => (whole > 0 ? `${Math.round((part / whole) * 100)}%` : "—");

export default async function ReferrerAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireReferrer();
  const teamIds = await teamMemberIds(user.id);
  const params = await searchParams;
  const rangeParam = (Array.isArray(params.range) ? params.range[0] : params.range) ?? "12m";
  const rangeKey: RangeKey = rangeParam in RANGES ? (rangeParam as RangeKey) : "12m";
  const range = RANGES[rangeKey];
  const now = new Date();
  const since = range.days ? new Date(now.getTime() - range.days * DAY) : null;

  const [nav, referrals, clientStatus, deletedClients, activeClientNeeds, clientsAdded, shares, profileMessages] = await Promise.all([
    referrerNav(user.id),
    db.referral.findMany({
      where: { referrerId: { in: teamIds }, ...(since ? { createdAt: { gte: since } } : {}) },
      select: {
        id: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        listing: { select: { company: { select: { id: true, name: true } } } },
        events: { select: { status: true, createdAt: true }, orderBy: { createdAt: "asc" } },
      },
    }),
    db.client.groupBy({ by: ["status"], where: { referrerId: { in: teamIds }, deletedAt: null }, _count: { _all: true } }),
    db.client.count({ where: { referrerId: { in: teamIds }, deletedAt: { not: null } } }),
    db.client.findMany({
      where: { referrerId: { in: teamIds }, deletedAt: null, status: { not: "ARCHIVED" } },
      select: { supportTypes: true, preferredLocation: true },
    }),
    db.client.count({ where: { referrerId: { in: teamIds }, ...(since ? { createdAt: { gte: since } } : {}) } }),
    db.clientShare.findMany({
      where: { sharedById: user.id, ...(since ? { createdAt: { gte: since } } : {}) },
      select: { companyId: true },
    }),
    db.message.count({ where: { senderId: user.id, clientId: { not: null }, ...(since ? { createdAt: { gte: since } } : {}) } }),
  ]);

  // ---------------------------------------------------------------- headline numbers
  const placedAt = (r: (typeof referrals)[number]) =>
    r.events.find((e) => e.status === "MOVED_IN")?.createdAt ?? (r.status === "MOVED_IN" ? r.updatedAt : null);
  const placed = referrals.filter((r) => r.status === "MOVED_IN");
  const declined = referrals.filter((r) => r.status === "DECLINED");
  const withdrawn = referrals.filter((r) => r.status === "WITHDRAWN");
  const open = referrals.filter((r) => !CLOSED.has(r.status));
  const closedCount = placed.length + declined.length + withdrawn.length;

  const timeToPlacement = median(
    placed.map((r) => (placedAt(r)?.getTime() ?? r.updatedAt.getTime()) - r.createdAt.getTime()).filter((ms) => ms >= 0),
  );
  const firstResponse = median(
    referrals
      .map((r) => r.events.find((e) => e.status !== "SUBMITTED")?.createdAt)
      .map((at, i) => (at ? at.getTime() - referrals[i].createdAt.getTime() : null))
      .filter((ms): ms is number => ms !== null && ms >= 0),
  );
  const awaitingResponse = referrals.filter((r) => r.status === "SUBMITTED").length;

  // ---------------------------------------------------------------- funnel
  const stageIndex = (status: string) => PIPELINE.indexOf(status as (typeof PIPELINE)[number]);
  const furthest = referrals.map((r) =>
    Math.max(stageIndex(r.status), ...r.events.map((e) => stageIndex(e.status)), 0),
  );
  const funnel = PIPELINE.map((stage, i) => ({
    stage,
    label: PIPELINE_LABELS[stage],
    count: furthest.filter((f) => f >= i).length,
  }));

  // ---------------------------------------------------------------- trend
  const points: TrendPoint[] = [];
  if (range.bucket === "week") {
    const weeks = Math.ceil((range.days ?? 90) / 7);
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7) - (weeks - 1) * 7);
    for (let i = 0; i < weeks; i += 1) {
      const from = new Date(start.getTime() + i * 7 * DAY);
      const to = new Date(from.getTime() + 7 * DAY);
      const label = from.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
      points.push({
        label,
        long: `Week of ${label}`,
        made: referrals.filter((r) => r.createdAt >= from && r.createdAt < to).length,
        placed: placed.filter((r) => {
          const at = placedAt(r);
          return at !== null && at >= from && at < to;
        }).length,
      });
    }
  } else {
    const earliest = referrals.reduce((min, r) => (r.createdAt < min ? r.createdAt : min), now);
    const monthsBack = range.days
      ? 11
      : Math.min(23, Math.max(5, (now.getFullYear() - earliest.getFullYear()) * 12 + now.getMonth() - earliest.getMonth()));
    for (let i = monthsBack; i >= 0; i -= 1) {
      const from = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const to = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      points.push({
        label: from.toLocaleDateString("en-GB", { month: "short" }),
        long: from.toLocaleDateString("en-GB", { month: "long", year: "numeric" }),
        made: referrals.filter((r) => r.createdAt >= from && r.createdAt < to).length,
        placed: placed.filter((r) => {
          const at = placedAt(r);
          return at !== null && at >= from && at < to;
        }).length,
      });
    }
  }

  // ---------------------------------------------------------------- providers
  type ProviderRow = { id: string; name: string; total: number; placed: number; declined: number; open: number; last: Date };
  const providers = new Map<string, ProviderRow>();
  for (const r of referrals) {
    const company = r.listing?.company;
    if (!company) continue;
    const row = providers.get(company.id) ?? { id: company.id, name: company.name, total: 0, placed: 0, declined: 0, open: 0, last: r.updatedAt };
    row.total += 1;
    if (r.status === "MOVED_IN") row.placed += 1;
    else if (r.status === "DECLINED") row.declined += 1;
    else if (!CLOSED.has(r.status)) row.open += 1;
    if (r.updatedAt > row.last) row.last = r.updatedAt;
    providers.set(company.id, row);
  }
  const providerRows = Array.from(providers.values()).sort((a, b) => b.total - a.total || b.placed - a.placed).slice(0, 10);

  // ---------------------------------------------------------------- caseload
  const statusCount = (status: string) => clientStatus.find((row) => row.status === status)?._count._all ?? 0;
  const caseloadTotal = statusCount("ACTIVE") + statusCount("PLACED") + statusCount("ARCHIVED");

  const needs = new Map<string, number>();
  const areas = new Map<string, { label: string; count: number }>();
  for (const client of activeClientNeeds) {
    for (const slug of client.supportTypes) needs.set(slug, (needs.get(slug) ?? 0) + 1);
    const area = client.preferredLocation?.split(/[,;]/)[0]?.trim();
    if (area) {
      const key = area.toLowerCase();
      const entry = areas.get(key) ?? { label: area, count: 0 };
      entry.count += 1;
      areas.set(key, entry);
    }
  }
  const topNeeds = Array.from(needs.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const topAreas = Array.from(areas.values()).sort((a, b) => b.count - a.count).slice(0, 6);
  const providersContacted = new Set(shares.map((s) => s.companyId)).size;

  const empty = referrals.length === 0 && caseloadTotal === 0;

  return (
    <DashboardShell
      title="Analytics"
      subtitle="How your referrals and caseload are moving — where people get placed, how quickly providers respond, and who you're supporting."
      nav={nav}
      active="/referrals/analytics"
    >
      <nav aria-label="Date range" className="mb-5 flex flex-wrap gap-1.5">
        {(Object.keys(RANGES) as RangeKey[]).map((key) => (
          <Link
            key={key}
            href={key === "12m" ? "/referrals/analytics" : `/referrals/analytics?range=${key}`}
            aria-current={key === rangeKey ? "page" : undefined}
            className={clsx(
              "flex min-h-10 items-center rounded-pill border px-3.5 text-[14px] transition-colors",
              key === rangeKey ? "border-ink bg-ink text-white" : "border-line bg-white text-ink-soft hover:border-pine/40 hover:text-ink",
            )}
          >
            {RANGES[key].label}
          </Link>
        ))}
      </nav>

      {empty ? (
        <div className="card px-6 py-10 text-center">
          <h2 className="text-[20px]">Nothing to measure yet</h2>
          <p className="mx-auto mt-2 max-w-[52ch] text-[15px] text-ink-soft">
            Add your clients and make your first referral — this page then shows placement rates, provider response
            times and where your caseload needs accommodation.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Link href="/referrals/clients/import" className="btn-primary">Upload your caseload</Link>
            <Link href="/search" className="btn-secondary">Search accommodation</Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
            <StatCard label="Referrals made" value={referrals.length} hint={`${open.length} still open`} />
            <StatCard label="People placed" value={placed.length} hint={`${pct(placed.length, closedCount)} of closed referrals`} />
            <StatCard label="Time to placement" value={formatDuration(timeToPlacement)} hint="median, referral to move-in" />
            <StatCard label="Provider first response" value={formatDuration(firstResponse)} hint={`${awaitingResponse} awaiting a first reply`} />
          </div>

          <section className="card p-5 sm:p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-[18px]">Referrals over time</h2>
              <p className="text-[13px] text-ink-faint">{range.bucket === "week" ? "Per week" : "Per month"}</p>
            </div>
            <div className="mt-3">
              <ReferralTrendChart points={points} />
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="card p-5 sm:p-6">
              <h2 className="text-[18px]">How far referrals get</h2>
              <p className="mt-1 text-[13px] text-ink-faint">Referrals that reached each stage, out of {referrals.length}.</p>
              <div className="mt-4 space-y-3">
                {funnel.map((row) => (
                  <MetricBar key={row.stage} label={row.label} value={row.count} total={referrals.length} />
                ))}
              </div>
            </section>

            <section className="card p-5 sm:p-6">
              <h2 className="text-[18px]">Outcomes</h2>
              <p className="mt-1 text-[13px] text-ink-faint">Where every referral in this period stands now.</p>
              <div className="mt-4 space-y-3">
                <MetricBar label="Moved in" value={placed.length} total={referrals.length} tone="bg-[#1BAF7A]" />
                <MetricBar label="Still open" value={open.length} total={referrals.length} />
                <MetricBar label="Declined by provider" value={declined.length} total={referrals.length} tone="bg-clay" />
                <MetricBar label="Withdrawn" value={withdrawn.length} total={referrals.length} tone="bg-ink-faint" />
              </div>
              <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-line pt-4 text-[13px]">
                <div>
                  <dt className="text-ink-faint">Profiles shared</dt>
                  <dd className="mt-0.5 font-display text-[20px] tabular-nums text-ink">{shares.length}</dd>
                </div>
                <div>
                  <dt className="text-ink-faint">Providers contacted</dt>
                  <dd className="mt-0.5 font-display text-[20px] tabular-nums text-ink">{providersContacted}</dd>
                </div>
                <div>
                  <dt className="text-ink-faint">Profiles messaged</dt>
                  <dd className="mt-0.5 font-display text-[20px] tabular-nums text-ink">{profileMessages}</dd>
                </div>
              </dl>
            </section>
          </div>

          <section>
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-[18px]">Providers you refer to</h2>
              <p className="text-[13px] text-ink-faint">Referrals against a provider&apos;s advert, busiest first</p>
            </div>
            {providerRows.length === 0 ? (
              <p className="card px-5 py-6 text-[14px] text-ink-soft">No referrals to a specific advert in this period yet.</p>
            ) : (
              <DataTable head={["Provider", "Referrals", "Placed", "Declined", "Open", "Placement rate", "Last activity"]}>
                {providerRows.map((row) => (
                  <tr key={row.id} className="tabular-nums">
                    <td className="px-4 py-3 font-medium text-ink">{row.name}</td>
                    <td className="px-4 py-3">{row.total}</td>
                    <td className="px-4 py-3">{row.placed}</td>
                    <td className="px-4 py-3">{row.declined}</td>
                    <td className="px-4 py-3">{row.open}</td>
                    <td className="px-4 py-3">{pct(row.placed, row.placed + row.declined)}</td>
                    <td className="px-4 py-3 text-ink-soft">{shortDate(row.last)}</td>
                  </tr>
                ))}
              </DataTable>
            )}
          </section>

          <div className="grid gap-6 lg:grid-cols-3">
            <section className="card p-5 sm:p-6">
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="text-[18px]">Caseload</h2>
                <Link href="/referrals/clients" className="text-[13px] text-pine-dark hover:underline">Manage</Link>
              </div>
              <p className="mt-1 text-[13px] text-ink-faint">
                {clientsAdded} added {range.days ? `in the last ${range.label}` : "in total"}
              </p>
              <div className="mt-4 space-y-3">
                <MetricBar label="Active" value={statusCount("ACTIVE")} total={caseloadTotal} />
                <MetricBar label="Placed" value={statusCount("PLACED")} total={caseloadTotal} tone="bg-[#1BAF7A]" />
                <MetricBar label="Archived" value={statusCount("ARCHIVED")} total={caseloadTotal} tone="bg-ink-faint" />
              </div>
              {deletedClients > 0 && (
                <p className="mt-4 text-[13px] text-ink-faint">
                  <Link href="/referrals/clients?status=DELETED" className="hover:underline">
                    {deletedClients} in Deleted
                  </Link>
                </p>
              )}
            </section>

            <section className="card p-5 sm:p-6">
              <h2 className="text-[18px]">Support needs</h2>
              <p className="mt-1 text-[13px] text-ink-faint">Across your {activeClientNeeds.length} active and placed clients</p>
              {topNeeds.length === 0 ? (
                <p className="mt-4 text-[14px] text-ink-soft">Add support categories to your clients to see this.</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {topNeeds.map(([slug, count]) => (
                    <MetricBar key={slug} label={supportLabel(slug)} value={count} total={activeClientNeeds.length} />
                  ))}
                </div>
              )}
            </section>

            <section className="card p-5 sm:p-6">
              <h2 className="text-[18px]">Areas needed</h2>
              <p className="mt-1 text-[13px] text-ink-faint">Clients&apos; preferred areas</p>
              {topAreas.length === 0 ? (
                <p className="mt-4 text-[14px] text-ink-soft">Add a preferred area to your clients to see this.</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {topAreas.map((area) => (
                    <MetricBar key={area.label} label={area.label} value={area.count} total={activeClientNeeds.length} />
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
