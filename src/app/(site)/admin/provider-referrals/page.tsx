import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/rbac";
import { DashboardShell, DataTable, StatCard } from "@/components/dashboard-shell";
import { adminNav } from "../nav";
import { REFERRALS_PER_REWARD } from "@/lib/referral-program";

export const metadata = { title: "Provider referral programme" };
export const dynamic = "force-dynamic";

export default async function AdminProviderReferralsPage() {
  await requireAdmin();
  const [nav, companies, totalSignups, totalQualified] = await Promise.all([
    adminNav(),
    db.company.findMany({
      where: { referralsMade: { some: {} } },
      orderBy: [{ referralRewardsClaimed: "desc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        referralCode: true,
        referralRewardsClaimed: true,
        referralsMade: { select: { status: true } },
      },
    }),
    db.providerReferral.count(),
    db.providerReferral.count({ where: { status: "QUALIFIED" } }),
  ]);

  return (
    <DashboardShell
      title="Provider referral programme"
      subtitle={`Providers who've invited other providers to join RoomsNow. Each qualified sign-up (registered and posted an advert) earns the inviter a free month of featured placement, and every ${REFERRALS_PER_REWARD} earns a free month of Professional and boosts. All automatic — no action needed from your side.`}
      nav={nav}
      active="/admin/provider-referrals"
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Providers referring others" value={companies.length} />
        <StatCard label="Total sign-ups" value={totalSignups} />
        <StatCard label="Qualified (posted an advert)" value={totalQualified} />
      </div>

      <section className="mt-8">
        <h2 className="text-[20px]">By referring provider</h2>
        <div className="mt-3">
          {companies.length === 0 ? (
            <p className="card p-5 text-[15px] text-ink-soft">No one has used their invite link yet.</p>
          ) : (
            <DataTable head={["Provider", "Invite code", "Signed up", "Qualified", "Progress", "Rewards granted"]}>
              {companies.map((company) => {
                const qualified = company.referralsMade.filter((r) => r.status === "QUALIFIED").length;
                return (
                  <tr key={company.id}>
                    <td className="px-4 py-3 font-medium">{company.name}</td>
                    <td className="px-4 py-3 font-mono text-ink-soft">{company.referralCode ?? "—"}</td>
                    <td className="px-4 py-3 text-ink-soft">{company.referralsMade.length}</td>
                    <td className="px-4 py-3 text-ink-soft">{qualified}</td>
                    <td className="px-4 py-3 text-ink-soft">{qualified % REFERRALS_PER_REWARD} / {REFERRALS_PER_REWARD}</td>
                    <td className="px-4 py-3 text-ink-soft">{company.referralRewardsClaimed}</td>
                  </tr>
                );
              })}
            </DataTable>
          )}
        </div>
      </section>
    </DashboardShell>
  );
}
