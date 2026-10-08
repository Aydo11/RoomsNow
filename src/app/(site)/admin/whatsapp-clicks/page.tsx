import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/rbac";
import { timeAgo } from "@/lib/format";
import { DashboardShell, DataTable, StatCard } from "@/components/dashboard-shell";
import { adminNav } from "../nav";

export const metadata = { title: "WhatsApp clicks" };
export const dynamic = "force-dynamic";

const DAY = 24 * 60 * 60 * 1000;

function exactDate(date: Date) {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/London" }).format(date);
}

/** Who has pressed the WhatsApp button on an advert, and which providers get the most. */
export default async function AdminWhatsappClicksPage() {
  await requireAdmin();
  const now = Date.now();
  const since = (days: number) => ({ createdAt: { gte: new Date(now - days * DAY) } });

  const [nav, today, week, month, allTime, signedOutMonth, recent, topProviders] = await Promise.all([
    adminNav(),
    db.whatsappClick.count({ where: since(1) }),
    db.whatsappClick.count({ where: since(7) }),
    db.whatsappClick.count({ where: since(30) }),
    db.whatsappClick.count(),
    db.whatsappClick.count({ where: { ...since(30), signedIn: false } }),
    db.whatsappClick.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
    db.whatsappClick.groupBy({ by: ["companyId"], where: since(30), _count: { _all: true }, orderBy: { _count: { companyId: "desc" } }, take: 10 }),
  ]);

  const listingIds = [...new Set(recent.map((click) => click.listingId))];
  const companyIds = [...new Set([...recent.map((click) => click.companyId), ...topProviders.map((row) => row.companyId)])];
  const userIds = [...new Set(recent.flatMap((click) => (click.userId ? [click.userId] : [])))];
  const [listings, companies, users] = await Promise.all([
    db.listing.findMany({ where: { id: { in: listingIds } }, select: { id: true, title: true } }),
    db.company.findMany({ where: { id: { in: companyIds } }, select: { id: true, name: true } }),
    db.user.findMany({ where: { id: { in: userIds } }, select: { id: true, firstName: true, lastName: true, email: true } }),
  ]);
  const listingTitle = new Map(listings.map((listing) => [listing.id, listing.title]));
  const companyName = new Map(companies.map((company) => [company.id, company.name]));
  const person = new Map(users.map((user) => [user.id, user]));

  return (
    <DashboardShell
      title="WhatsApp clicks"
      subtitle="Every press of the WhatsApp button on an advert. Signed-out visitors are sent to sign up first, so they are counted too. Repeat presses by the same person within 10 minutes count once."
      nav={nav}
      active="/admin/whatsapp-clicks"
    >
      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Last 24 hours" value={today} />
        <StatCard label="Last 7 days" value={week} />
        <StatCard label="Last 30 days" value={month} hint={`${signedOutMonth} sent to sign up first`} />
        <StatCard label="All time" value={allTime} />
      </div>

      {topProviders.length > 0 && (
        <section className="mt-8">
          <h2 className="text-[20px]">Providers with the most clicks · last 30 days</h2>
          <div className="mt-3">
            <DataTable head={["Provider", "Clicks"]}>
              {topProviders.map((row) => (
                <tr key={row.companyId}>
                  <td className="px-4 py-3 font-medium">{companyName.get(row.companyId) ?? "Removed provider"}</td>
                  <td className="px-4 py-3 tabular-nums">{row._count._all}</td>
                </tr>
              ))}
            </DataTable>
          </div>
        </section>
      )}

      <section className="mt-8">
        <h2 className="text-[20px]">Latest clicks</h2>
        {recent.length === 0 ? (
          <p className="mt-3 text-[15px] text-ink-soft">No one has pressed a WhatsApp button yet.</p>
        ) : (
          <div className="mt-3">
            <DataTable head={["When", "Advert", "Provider", "Who"]}>
              {recent.map((click) => {
                const who = click.userId ? person.get(click.userId) : null;
                return (
                  <tr key={click.id}>
                    <td className="px-4 py-3 whitespace-nowrap" title={exactDate(click.createdAt)}>{timeAgo(click.createdAt)}</td>
                    <td className="px-4 py-3">
                      <Link href={`/listings/${click.listingId}`} className="text-pine-dark hover:underline">
                        {listingTitle.get(click.listingId) ?? "Removed advert"}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{companyName.get(click.companyId) ?? "Removed provider"}</td>
                    <td className="px-4 py-3">
                      {who ? (
                        <>
                          <span className="block">{who.firstName} {who.lastName}</span>
                          <span className="block text-[12px] text-ink-faint">{who.email}</span>
                        </>
                      ) : click.signedIn ? (
                        <span className="text-ink-soft">Deleted account</span>
                      ) : (
                        <span className="text-ink-soft">Not signed in · sent to sign up</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </DataTable>
          </div>
        )}
      </section>
    </DashboardShell>
  );
}
