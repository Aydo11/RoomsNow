import { db } from "@/lib/db";
import { requireCompany } from "@/lib/rbac";
import { DashboardShell, DataTable, MetricBar, StatCard } from "@/components/dashboard-shell";
import { ReferralShare } from "@/components/referral-share";
import { providerNav } from "../nav";
import { ensureReferralCode, REFERRALS_PER_REWARD, REWARD_BOOST_CREDITS } from "@/lib/referral-program";
import { absoluteUrl } from "@/lib/seo";
import { shortDate } from "@/lib/format";

export const metadata = { title: "Refer & earn" };
export const dynamic = "force-dynamic";

export default async function ProviderInvitePage() {
  const { companyId } = await requireCompany();
  const [nav, code, company, referrals] = await Promise.all([
    providerNav(companyId),
    ensureReferralCode(companyId),
    db.company.findUniqueOrThrow({ where: { id: companyId }, select: { referralRewardsClaimed: true } }),
    db.providerReferral.findMany({
      where: { referrerCompanyId: companyId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        createdAt: true,
        qualifiedAt: true,
        referredCompany: { select: { name: true } },
      },
    }),
  ]);

  const qualifiedCount = referrals.filter((r) => r.status === "QUALIFIED").length;
  const towardNext = qualifiedCount % REFERRALS_PER_REWARD;
  const inviteUrl = absoluteUrl(`/register?type=PROVIDER&ref=${code}`);

  return (
    <DashboardShell
      title="Refer & earn"
      subtitle="Invite other providers to RoomsNow. Once 5 of them sign up and post their first advert, you get a free month of Professional and 2 boosts — automatically, no need to ask us."
      nav={nav}
      active="/provider/invite"
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Providers referred" value={referrals.length} />
        <StatCard label="Posted an advert" value={qualifiedCount} />
        <StatCard className="col-span-2 sm:col-span-1" label="Rewards earned" value={company.referralRewardsClaimed} />
      </div>

      <section className="card mt-6 p-5">
        <h2 className="text-[18px]">Invite other providers</h2>
        <p className="mt-1 max-w-[60ch] text-[14px] text-ink-soft">
          Share your code or link with providers you know. When they register with it and post
          their first advert, it counts toward your next reward.
        </p>
        <div className="mt-4">
          <ReferralShare url={inviteUrl} code={code} />
        </div>
        <div className="mt-5 max-w-sm">
          <MetricBar
            label={qualifiedCount > 0 && towardNext === 0 ? "Reward unlocked — starting your next 5" : "Progress toward your next reward"}
            value={towardNext}
            total={REFERRALS_PER_REWARD}
            tone="bg-clay"
          />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-[20px]">Your referrals</h2>
        <div className="mt-3">
          {referrals.length === 0 ? (
            <p className="card p-5 text-[15px] text-ink-soft">Nobody has signed up with your invite link yet.</p>
          ) : (
            <DataTable head={["Provider", "Status", "Signed up", "Posted an advert"]}>
              {referrals.map((referral) => (
                <tr key={referral.id}>
                  <td className="px-4 py-3 font-medium">{referral.referredCompany.name}</td>
                  <td className="px-4 py-3 text-ink-soft">{referral.status === "QUALIFIED" ? "Qualified" : "Signed up"}</td>
                  <td className="px-4 py-3 text-ink-soft">{shortDate(referral.createdAt)}</td>
                  <td className="px-4 py-3 text-ink-soft">{referral.qualifiedAt ? shortDate(referral.qualifiedAt) : "—"}</td>
                </tr>
              ))}
            </DataTable>
          )}
        </div>
      </section>

      <p className="mt-6 text-[13px] text-ink-faint">
        Rewards give {REWARD_BOOST_CREDITS} boost credits every {REFERRALS_PER_REWARD} qualified
        referrals, plus a free month of Professional unless you&apos;re already on Business.
      </p>
    </DashboardShell>
  );
}
