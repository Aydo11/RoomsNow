import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/rbac";
import { hasAdminPermission } from "@/lib/admin-permissions";
import { DashboardShell, DataTable, MetricBar, StatCard } from "@/components/dashboard-shell";
import { councilStats, type CouncilRange } from "@/server/council";
import { PrintButton } from "@/components/shortlist-controls";
import { referrerNav } from "../referrals/nav";
import { clsx } from "@/lib/clsx";

export const metadata = { title: "Council view", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const RANGES: { value: CouncilRange; label: string }[] = [
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
  { value: "365", label: "12 months" },
];

const days = (value: number | null) => (value === null ? "—" : value < 1 ? "Under a day" : `${Math.round(value)} day${Math.round(value) === 1 ? "" : "s"}`);
const pct = (part: number, whole: number) => (whole ? `${Math.round((part / whole) * 100)}%` : "—");

/**
 * Council view: live supply, demand and outcomes across every provider and
 * agency using RoomsNow in the council's areas. Counts only; no one can be
 * identified from it.
 */
export default async function CouncilPage({ searchParams }: { searchParams: Promise<{ range?: string; id?: string }> }) {
  const [query, user] = await Promise.all([searchParams, requireUser("/council")]);
  const admin = hasAdminPermission(user);
  const access = admin && query.id
    ? await db.councilAccess.findUnique({ where: { id: query.id } })
    : await db.councilAccess.findUnique({ where: { userId: user.id } });
  if (!access) notFound();

  const range: CouncilRange = (["30", "90", "365"] as const).includes(query.range as CouncilRange) ? (query.range as CouncilRange) : "90";
  const [stats, nav] = await Promise.all([
    councilStats(access.areas, range),
    user.role === "REFERRER" || user.role === "ADMIN" ? referrerNav(user.id) : Promise.resolve([{ href: "/council", label: "Council view" }]),
  ]);
  const rangeLabel = RANGES.find((r) => r.value === range)!.label;
  const outcome = stats.week12.answered ? stats.week12 : stats.week4;
  const outcomeWeek = stats.week12.answered ? 12 : 4;
  const sustained = outcome.goingWell + outcome.concerns;
  const maxRooms = Math.max(1, ...stats.areas.map((a) => a.rooms));

  return (
    <DashboardShell
      title={`${access.councilName}: council view`}
      subtitle={`Supported accommodation across ${access.areas.join(", ")}. Referral and outcome figures cover the last ${rangeLabel}.`}
      nav={nav}
      active="/council"
      action={<PrintButton label="Save as PDF" />}
    >
      <div className="mb-5 flex flex-wrap items-center gap-2 print:hidden">
        {RANGES.map((option) => (
          <Link
            key={option.value}
            href={`/council?range=${option.value}${admin && query.id ? `&id=${query.id}` : ""}`}
            aria-current={option.value === range ? "page" : undefined}
            className={clsx("chip px-3.5 py-1.5 text-[14px]", option.value === range && "chip-active")}
          >
            {option.label}
          </Link>
        ))}
      </div>

      <h2 className="text-[18px] font-bold">Supply right now</h2>
      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Rooms free now" value={stats.roomsFree} />
        <StatCard label="Live adverts" value={stats.adverts} />
        <StatCard label="Providers advertising" value={stats.providers} />
        <StatCard label="Accept Housing Benefit" value={pct(stats.housingBenefitAdverts, stats.adverts)} hint="of live adverts" />
      </div>

      <h2 className="mt-8 text-[18px] font-bold">Placements, last {rangeLabel}</h2>
      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Referrals made" value={stats.referralsMade} hint={`by ${stats.agencies} referrer${stats.agencies === 1 ? "" : "s"}`} />
        <StatCard label="People moved in" value={stats.placed} hint={stats.placementRate !== null ? `${stats.placementRate}% of referrals made` : undefined} />
        <StatCard label="Typical time to move in" value={days(stats.medianDaysToPlace)} hint="median, referral to move-in" />
        <StatCard label="Typical first reply" value={days(stats.medianDaysToReply)} hint="median, provider's first update" />
      </div>

      <h2 className="mt-8 text-[18px] font-bold">How placements are going</h2>
      <p className="mt-1 text-[13px] text-ink-faint">
        From the {outcomeWeek}-week check-ins answered by referrers and providers. Where the two sides disagree, the more worrying answer counts.
      </p>
      <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_1.2fr]">
        <div className="grid grid-cols-2 gap-3">
          <StatCard label={`Still in place at ${outcomeWeek} weeks`} value={pct(sustained, outcome.answered)} hint={`${outcome.answered} placement${outcome.answered === 1 ? "" : "s"} checked`} />
          <StatCard label="Flagged at risk now" value={stats.currentlyAtRisk} hint="moved in, latest answer at risk" />
        </div>
        <div className="card space-y-3 p-5">
          <MetricBar label="Going well" value={outcome.goingWell} total={outcome.answered} tone="bg-emerald-600" />
          <MetricBar label="Some concerns" value={outcome.concerns} total={outcome.answered} tone="bg-amber-500" />
          <MetricBar label="At risk" value={outcome.atRisk} total={outcome.answered} tone="bg-red-600" />
          <MetricBar label="Ended" value={outcome.ended} total={outcome.answered} tone="bg-ink" />
        </div>
      </div>

      <h2 className="mt-8 text-[18px] font-bold">Need and supply by support type</h2>
      <p className="mt-1 text-[13px] text-ink-faint">Referrals made in the last {rangeLabel} against rooms free now. Big gaps show where more provision is needed.</p>
      <div className="mt-3">
        <DataTable head={["Support type", "Referrals", "Rooms free now", "Rooms per referral"]} compact>
          {stats.support.map((row) => (
            <tr key={row.label} className="border-t border-line">
              <td className="px-4 py-2.5">{row.label}</td>
              <td className="px-4 py-2.5 tabular-nums">{row.referrals}</td>
              <td className="px-4 py-2.5 tabular-nums">{row.rooms}</td>
              <td className={clsx("px-4 py-2.5 tabular-nums", row.referrals > 0 && row.rooms / row.referrals < 0.5 && "font-semibold text-red-700")}>
                {row.referrals ? (row.rooms / row.referrals).toFixed(1) : "—"}
              </td>
            </tr>
          ))}
        </DataTable>
      </div>

      <h2 className="mt-8 text-[18px] font-bold">Rooms free by area</h2>
      {stats.areas.length === 0 ? (
        <p className="mt-2 text-[14px] text-ink-soft">No live adverts in these areas yet.</p>
      ) : (
        <div className="card mt-3 space-y-3 p-5">
          {stats.areas.slice(0, 25).map((area) => (
            <div key={area.name} className="grid grid-cols-[minmax(0,160px)_1fr_auto] items-center gap-3 text-[13px]">
              <span className="truncate text-ink">{area.name}</span>
              <div className="h-2.5 overflow-hidden rounded-full bg-paper-sunk" aria-hidden="true">
                <div className="h-full rounded-full bg-pine" style={{ width: `${Math.max(2, (area.rooms / maxRooms) * 100)}%` }} />
              </div>
              <span className="tabular-nums text-ink-soft">
                {area.rooms} room{area.rooms === 1 ? "" : "s"} · {area.adverts} advert{area.adverts === 1 ? "" : "s"}
              </span>
            </div>
          ))}
        </div>
      )}

      <p className="mt-8 max-w-[85ch] text-[12.5px] leading-relaxed text-ink-faint">
        Figures cover adverts and referrals on RoomsNow only, for properties in the listed areas. Counts are live; referral figures use the date the referral
        was made and the date the person moved in. No personal details are shown.
      </p>
    </DashboardShell>
  );
}
