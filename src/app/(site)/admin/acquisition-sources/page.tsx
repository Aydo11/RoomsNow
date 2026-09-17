import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/rbac";
import { DashboardShell, DataTable, StatCard, MetricBar } from "@/components/dashboard-shell";
import { adminNav } from "../nav";

export const metadata = { title: "Acquisition sources" };
export const dynamic = "force-dynamic";

const SOURCE_LABELS: Record<string, string> = {
  SOCIAL_MEDIA: "Social media",
  EMAIL: "Email",
  SEARCH_ENGINE: "Search engine",
  REFERRAL: "Referral / invite code",
  WORD_OF_MOUTH: "Word of mouth",
  PRESS: "Press / news",
  OTHER: "Other",
};
const SOURCE_ORDER = Object.keys(SOURCE_LABELS);

export default async function AdminAcquisitionSourcesPage() {
  await requireAdmin();
  const [nav, bySource, providers] = await Promise.all([
    adminNav(),
    db.user.groupBy({ by: ["acquisitionSource"], _count: { _all: true } }),
    db.user.findMany({
      where: { role: "PROVIDER" },
      select: {
        acquisitionSource: true,
        staffOf: {
          take: 1,
          select: {
            company: {
              select: { listings: { where: { NOT: { status: "DRAFT" } }, take: 1, select: { id: true } } },
            },
          },
        },
      },
    }),
  ]);

  type SourceCount = { acquisitionSource: string | null; _count: { _all: number } };
  const totalUsers = (bySource as SourceCount[]).reduce((sum: number, row: SourceCount) => sum + row._count._all, 0);
  const untrackedCount = (bySource as SourceCount[]).find((row: SourceCount) => row.acquisitionSource === null)?._count._all ?? 0;
  const sourceRows = SOURCE_ORDER.map((key) => ({
    key,
    label: SOURCE_LABELS[key],
    count: (bySource as SourceCount[]).find((row: SourceCount) => row.acquisitionSource === key)?._count._all ?? 0,
  }))
    .filter((row) => row.count > 0)
    .sort((a, b) => b.count - a.count);
  const topSource = sourceRows[0];

  const providerStats = new Map<string, { total: number; converted: number }>();
  for (const provider of providers) {
    const key = provider.acquisitionSource ?? "UNRECORDED";
    const entry = providerStats.get(key) ?? { total: 0, converted: 0 };
    entry.total += 1;
    if (provider.staffOf[0]?.company.listings.length) entry.converted += 1;
    providerStats.set(key, entry);
  }
  const providerRows = [...SOURCE_ORDER, "UNRECORDED"]
    .map((key) => {
      const entry = providerStats.get(key) ?? { total: 0, converted: 0 };
      return {
        key,
        label: key === "UNRECORDED" ? "Not recorded" : SOURCE_LABELS[key],
        total: entry.total,
        converted: entry.converted,
        rate: entry.total > 0 ? Math.round((entry.converted / entry.total) * 100) : null,
      };
    })
    .filter((row) => row.total > 0)
    .sort((a, b) => (b.rate ?? -1) - (a.rate ?? -1));

  return (
    <DashboardShell
      title="Acquisition sources"
      subtitle="Where sign-ups say they heard about RoomsNow — captured at registration or tagged on a campaign link with ?src=— and which channels actually turn providers into live adverts, not just accounts."
      nav={nav}
      active="/admin/acquisition-sources"
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total sign-ups" value={totalUsers} />
        <StatCard label="Source recorded" value={totalUsers - untrackedCount} hint={`${untrackedCount} not recorded`} />
        <StatCard label="Top channel" value={topSource ? topSource.label : "—"} hint={topSource ? `${topSource.count} sign-ups` : undefined} />
      </div>

      <section className="mt-8">
        <h2 className="text-[20px]">Sign-ups by channel</h2>
        <p className="mt-1 max-w-3xl text-[14px] text-ink-soft">
          Every account type — people looking for accommodation, providers and referrers. Anyone who registers
          with an invite code but no <code>?src=</code> tag is counted as Referral automatically.
        </p>
        <div className="mt-3 space-y-3">
          {sourceRows.length === 0 ? (
            <p className="card p-5 text-[15px] text-ink-soft">No sign-ups have a recorded source yet.</p>
          ) : (
            sourceRows.map((row) => <MetricBar key={row.key} label={row.label} value={row.count} total={totalUsers} />)
          )}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-[20px]">Which channels bring providers who actually list</h2>
        <p className="mt-1 max-w-3xl text-[14px] text-ink-soft">
          &ldquo;Converted&rdquo; means the provider&apos;s company has submitted at least one advert for
          review — the same bar the provider referral programme uses to call a sign-up qualified.
        </p>
        <div className="mt-3">
          {providerRows.length === 0 ? (
            <p className="card p-5 text-[15px] text-ink-soft">No provider sign-ups yet.</p>
          ) : (
            <DataTable head={["Channel", "Providers signed up", "Converted (posted an advert)", "Conversion rate"]}>
              {providerRows.map((row) => (
                <tr key={row.key}>
                  <td className="px-4 py-3 font-medium">{row.label}</td>
                  <td className="px-4 py-3 text-ink-soft">{row.total}</td>
                  <td className="px-4 py-3 text-ink-soft">{row.converted}</td>
                  <td className="px-4 py-3 text-ink-soft">{row.rate !== null ? `${row.rate}%` : "—"}</td>
                </tr>
              ))}
            </DataTable>
          )}
        </div>
      </section>
    </DashboardShell>
  );
}
