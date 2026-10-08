import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/rbac";
import { timeAgo } from "@/lib/format";
import { whatsappLogRows, whatsappLogWhere, type WhatsappLogFilters } from "@/lib/whatsapp-clicks";
import { AdminFilters, AdminFilterField } from "@/components/admin-filters";
import { AdminPagination, ADMIN_PAGE_SIZE, pageNumber } from "@/components/admin-pagination";
import { DashboardShell, DataTable, StatCard } from "@/components/dashboard-shell";
import { adminNav } from "../nav";

export const metadata = { title: "WhatsApp enquiry log" };
export const dynamic = "force-dynamic";

const DAY = 24 * 60 * 60 * 1000;

function exactDate(date: Date) {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/London" }).format(date);
}

/** A permanent log of every use of the WhatsApp button on adverts, with filters and a CSV download. */
export default async function AdminWhatsappClicksPage({ searchParams }: { searchParams: Promise<WhatsappLogFilters & { page?: string }> }) {
  await requireAdmin();
  const query = await searchParams;
  const page = pageNumber(query.page);
  const filters: WhatsappLogFilters = { provider: query.provider, from: query.from, to: query.to, who: query.who };
  const where = await whatsappLogWhere(filters);
  const now = Date.now();
  const since = (days: number) => ({ createdAt: { gte: new Date(now - days * DAY) } });

  const [nav, today, week, month, allTime, total, clicks, topProviders] = await Promise.all([
    adminNav(),
    db.whatsappClick.count({ where: since(1) }),
    db.whatsappClick.count({ where: since(7) }),
    db.whatsappClick.count({ where: since(30) }),
    db.whatsappClick.count(),
    db.whatsappClick.count({ where }),
    db.whatsappClick.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (page - 1) * ADMIN_PAGE_SIZE, take: ADMIN_PAGE_SIZE }),
    db.whatsappClick.groupBy({ by: ["companyId"], where: since(30), _count: { _all: true }, orderBy: { _count: { companyId: "desc" } }, take: 10 }),
  ]);
  const [rows, topNames] = await Promise.all([
    whatsappLogRows(clicks),
    db.company.findMany({ where: { id: { in: topProviders.map((row) => row.companyId) } }, select: { id: true, name: true } }),
  ]);
  const topName = new Map(topNames.map((company) => [company.id, company.name]));
  const exportParams = new URLSearchParams(Object.entries(filters).filter((entry): entry is [string, string] => Boolean(entry[1])));
  const exportHref = `/api/admin/whatsapp-clicks/export${exportParams.size ? `?${exportParams}` : ""}`;

  return (
    <DashboardShell
      title="WhatsApp enquiry log"
      subtitle="Every time someone presses the WhatsApp button on an advert. You also get a notification for each one. Signed-out visitors are sent to sign up first, so they are logged too. Repeat presses by the same person within 10 minutes count once."
      nav={nav}
      active="/admin/whatsapp-clicks"
      action={<a href={exportHref} className="btn-secondary">Download log (CSV)</a>}
    >
      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Last 24 hours" value={today} />
        <StatCard label="Last 7 days" value={week} />
        <StatCard label="Last 30 days" value={month} />
        <StatCard label="All time" value={allTime} />
      </div>

      {topProviders.length > 0 && (
        <section className="mt-8">
          <h2 className="text-[20px]">Providers with the most WhatsApp enquiries · last 30 days</h2>
          <div className="mt-3">
            <DataTable head={["Provider", "Enquiries"]}>
              {topProviders.map((row) => (
                <tr key={row.companyId}>
                  <td className="px-4 py-3 font-medium">{topName.get(row.companyId) ?? "Removed provider"}</td>
                  <td className="px-4 py-3 tabular-nums">{row._count._all}</td>
                </tr>
              ))}
            </DataTable>
          </div>
        </section>
      )}

      <section className="mt-8">
        <h2 className="text-[20px]">Log</h2>
        <div className="mt-3">
          <AdminFilters>
            <AdminFilterField label="Provider"><input className="field" name="provider" defaultValue={query.provider} placeholder="Company name" /></AdminFilterField>
            <AdminFilterField label="From"><input className="field" type="date" name="from" defaultValue={query.from} /></AdminFilterField>
            <AdminFilterField label="To"><input className="field" type="date" name="to" defaultValue={query.to} /></AdminFilterField>
            <AdminFilterField label="Who">
              <select className="field" name="who" defaultValue={query.who ?? ""}>
                <option value="">Everyone</option>
                <option value="signed-in">Signed in</option>
                <option value="signed-out">Not signed in</option>
              </select>
            </AdminFilterField>
          </AdminFilters>
        </div>
        {rows.length === 0 ? (
          <p className="mt-4 text-[15px] text-ink-soft">{allTime === 0 ? "No one has used a WhatsApp button yet." : "No WhatsApp enquiries match these filters."}</p>
        ) : (
          <div className="mt-4">
            <DataTable head={["When", "Advert", "Provider", "Person", "Contact"]}>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className="block">{exactDate(row.createdAt)}</span>
                    <span className="block text-[12px] text-ink-faint">{timeAgo(row.createdAt)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/listings/${row.listingId}`} className="text-pine-dark hover:underline">{row.advert}</Link>
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{row.provider}</td>
                  <td className="px-4 py-3">
                    {row.personName ?? <span className="text-ink-soft">{row.signedIn ? "Deleted account" : "Not signed in · sent to sign up"}</span>}
                  </td>
                  <td className="px-4 py-3 text-[13px] text-ink-soft">
                    {row.personEmail && <a className="block hover:underline" href={`mailto:${row.personEmail}`}>{row.personEmail}</a>}
                    {row.personPhone && <span className="block">{row.personPhone}</span>}
                    {!row.personEmail && !row.personPhone && "—"}
                  </td>
                </tr>
              ))}
            </DataTable>
            <AdminPagination page={page} total={total} query={{ provider: query.provider, from: query.from, to: query.to, who: query.who }} />
          </div>
        )}
      </section>
    </DashboardShell>
  );
}
