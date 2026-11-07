import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/rbac";
import { DashboardShell, DataTable } from "@/components/dashboard-shell";
import { shortDate } from "@/lib/format";
import { adminNav } from "../nav";

export const metadata = { title: "Top providers" };
export const dynamic = "force-dynamic";

const PERIODS = [
  { value: "7", label: "Last 7 days", days: 7 },
  { value: "30", label: "Last 30 days", days: 30 },
  { value: "90", label: "Last 90 days", days: 90 },
  { value: "all", label: "All time", days: null },
] as const;

type Row = { id: string; name: string; slug: string; requests: bigint; waiting: bigint; movedIn: bigint; referrals: bigint; lastRequest: Date };

/** Providers ranked by accommodation requests received, so the team can see where demand is going. */
export default async function AdminTopProvidersPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  await requireAdmin();
  const query = await searchParams;
  const period = PERIODS.find((p) => p.value === query.period) ?? PERIODS[1];
  const since = period.days ? new Date(Date.now() - period.days * 24 * 60 * 60 * 1000) : new Date(0);

  const [nav, rows] = await Promise.all([
    adminNav(),
    db.$queryRaw<Row[]>`
      SELECT c.id, c.name, c.slug,
        count(r.id) AS requests,
        count(r.id) FILTER (WHERE r.status::text IN ('SUBMITTED', 'RECEIVED')) AS waiting,
        count(r.id) FILTER (WHERE r.status::text = 'MOVED_IN') AS "movedIn",
        (SELECT count(*) FROM "Referral" f JOIN "Listing" fl ON fl.id = f."listingId"
          WHERE fl."companyId" = c.id AND f."createdAt" >= ${since}) AS referrals,
        max(r."createdAt") AS "lastRequest"
      FROM "Company" c
      JOIN "Listing" l ON l."companyId" = c.id
      JOIN "AccommodationRequest" r ON r."listingId" = l.id AND r."createdAt" >= ${since}
      GROUP BY c.id
      ORDER BY requests DESC, c.name ASC
      LIMIT 100
    `,
  ]);
  const n = Number;
  const top = rows.length ? n(rows[0].requests) : 0;
  const total = rows.reduce((sum, row) => sum + n(row.requests), 0);

  return (
    <DashboardShell
      title="Top providers"
      subtitle="Providers ranked by the accommodation requests they've received, most first. Use it to spot who's in demand and who has requests waiting."
      nav={nav}
      active="/admin/top-providers"
    >
      <nav aria-label="Time period" className="flex flex-wrap gap-2">
        {PERIODS.map((p) => (
          <Link key={p.value} href={`?period=${p.value}`} className={p.value === period.value ? "chip chip-active" : "chip"} aria-current={p.value === period.value ? "page" : undefined}>
            {p.label}
          </Link>
        ))}
      </nav>
      <p className="mt-3 text-[14px] text-ink-soft">
        {total} request{total === 1 ? "" : "s"} across {rows.length} provider{rows.length === 1 ? "" : "s"} · {period.label.toLowerCase()}
      </p>

      {rows.length === 0 ? (
        <p className="mt-6 text-[15px] text-ink-soft">No requests in this period.</p>
      ) : (
        <div className="mt-4">
          <DataTable compact head={["#", "Provider", "Requests", "Waiting for reply", "Moved in", "Referrals", "Latest request"]}>
            {rows.map((row, index) => (
              <tr key={row.id}>
                <td className="px-4 py-3 font-semibold text-ink-faint tabular-nums">{index + 1}</td>
                <td className="px-4 py-3">
                  <Link href={`/companies/${row.slug}`} className="font-semibold hover:text-pine-dark">{row.name}</Link>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="w-8 font-semibold tabular-nums">{n(row.requests)}</span>
                    <span aria-hidden="true" className="h-2 w-24 overflow-hidden rounded-full bg-paper-sunk">
                      <span className="block h-full rounded-full bg-pine" style={{ width: `${top ? Math.max(4, Math.round((n(row.requests) / top) * 100)) : 0}%` }} />
                    </span>
                  </div>
                </td>
                <td className={`px-4 py-3 tabular-nums ${n(row.waiting) > 0 ? "font-semibold text-clay" : "text-ink-soft"}`}>{n(row.waiting)}</td>
                <td className="px-4 py-3 tabular-nums">{n(row.movedIn)}</td>
                <td className="px-4 py-3 tabular-nums text-ink-soft">{n(row.referrals)}</td>
                <td className="px-4 py-3 text-ink-soft">{shortDate(row.lastRequest)}</td>
              </tr>
            ))}
          </DataTable>
        </div>
      )}
    </DashboardShell>
  );
}
