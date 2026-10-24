import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/rbac";
import { shortDate } from "@/lib/format";
import { formatPounds } from "@/lib/spotlight";
import { DashboardShell } from "@/components/dashboard-shell";
import { AddSpotlightForm } from "@/components/spotlight-forms";
import { updateSpotlightAction } from "@/server/actions/spotlight";
import { adminNav } from "../nav";

export const metadata = { title: "Homepage spotlight" };
export const dynamic = "force-dynamic";

function stateOf(row: { status: string; startsAt: Date; endsAt: Date }, now: Date) {
  if (row.endsAt <= now) return { label: "Ended", tone: "text-ink-faint" };
  if (row.status === "PAUSED") return { label: "Paused", tone: "text-clay" };
  if (row.startsAt > now) return { label: "Queued", tone: "text-ink-soft" };
  return { label: "Live", tone: "text-pine-dark font-semibold" };
}

export default async function AdminSpotlightPage() {
  await requireAdmin();
  const now = new Date();
  const [nav, rows, companies, businesses] = await Promise.all([
    adminNav(),
    db.homepageSpotlight.findMany({ orderBy: [{ endsAt: "desc" }], take: 100 }),
    db.company.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.serviceBusiness.findMany({ where: { status: "APPROVED" }, orderBy: { name: "asc" }, select: { id: true, name: true, tradingName: true } }),
  ]);
  const orgs = [
    ...businesses.map((b) => ({ value: `SERVICE:${b.id}`, label: b.tradingName || b.name, group: "Service businesses" })),
    ...companies.map((c) => ({ value: `COMPANY:${c.id}`, label: c.name, group: "Housing providers" })),
  ];
  const live = rows.filter((row) => stateOf(row, now).label === "Live").length;

  return (
    <DashboardShell
      title="Homepage spotlight"
      subtitle={`Sponsored services, shown under the homepage search. Paid spotlights go live automatically; several live at once take turns. ${live} live now.`}
      nav={nav}
      active="/admin/spotlight"
    >
      <AddSpotlightForm orgs={orgs} />

      <h2 className="mt-8 text-lg">All spotlights</h2>
      {rows.length === 0 ? (
        <p className="mt-2 text-[15px] text-ink-soft">No spotlights yet. Service businesses and providers can buy one at <Link href="/advertise/homepage" className="text-pine-dark hover:underline">/advertise/homepage</Link>.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {rows.map((row) => {
            const state = stateOf(row, now);
            const ended = state.label === "Ended";
            return (
              <li key={row.id} className="card flex flex-wrap items-start justify-between gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <p className="text-[13px]">
                    <span className={state.tone}>{state.label}</span>
                    <span className="text-ink-faint"> · {shortDate(row.startsAt)} to {shortDate(row.endsAt)} · {row.amount ? `paid ${formatPounds(row.amount)}` : "added by admin"}</span>
                  </p>
                  <p className="mt-1 font-semibold"><Link href={row.href} className="hover:underline">{row.orgName}</Link></p>
                  <p className="mt-0.5 text-[15px]">{row.headline}</p>
                  <p className="mt-0.5 text-[14px] text-ink-soft">{row.body}</p>
                </div>
                {!ended && (
                  <form action={updateSpotlightAction} className="flex flex-wrap gap-2">
                    <input type="hidden" name="id" value={row.id} />
                    {row.status === "PAUSED"
                      ? <button name="action" value="resume" className="btn-secondary">Resume</button>
                      : <button name="action" value="pause" className="btn-secondary">Pause</button>}
                    <button name="action" value="end" className="btn-secondary text-clay">End now</button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </DashboardShell>
  );
}
