import Link from "next/link";
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
    db.company.findUniqueOrThrow({ where: { id: companyId }, select: { referralRewardsClaimed: true, freeSponsorMonths: true } }),
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

  const liveAdverts = company.freeSponsorMonths > 0
    ? await db.listing.findMany({ where: { companyId, status: "ACTIVE" }, orderBy: { updatedAt: "desc" }, take: 12, select: { id: true, title: true } })
    : [];
  const qualifiedCount = referrals.filter((r) => r.status === "QUALIFIED").length;
  const towardNext = qualifiedCount % REFERRALS_PER_REWARD;
  const inviteUrl = absoluteUrl(`/register?type=PROVIDER&ref=${code}`);

  return (
    <DashboardShell
      title="Refer & earn"
      subtitle="Invite other providers to RoomsNow. Every provider who signs up with your link and posts their first advert earns you a free month of featured (sponsored) placement for one of your adverts. Every 5 also unlock a free month of Professional and 2 boosts. It all happens automatically."
      nav={nav}
      active="/provider/invite"
    >
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Providers referred" value={referrals.length} />
        <StatCard label="Posted an advert" value={qualifiedCount} />
        <StatCard label="Free featured months to use" value={company.freeSponsorMonths} />
        <StatCard label="Professional months earned" value={company.referralRewardsClaimed} />
      </div>

      {company.freeSponsorMonths > 0 && (
        <section className="card mt-5 border-pine/30 bg-pine-light/40 p-5">
          <h2 className="text-[18px]">
            You have {company.freeSponsorMonths} free month{company.freeSponsorMonths === 1 ? "" : "s"} of featured placement
          </h2>
          <p className="mt-1 text-[14px] text-ink-soft">Pick a live advert to put it in the sponsored spots at the top of search for 30 days.</p>
          {liveAdverts.length === 0 ? (
            <p className="mt-3 text-[14px] text-ink-soft">You don&apos;t have a live advert yet. Your free months will wait for you.</p>
          ) : (
            <ul className="mt-3 flex flex-wrap gap-2">
              {liveAdverts.map((advert) => (
                <li key={advert.id}>
                  <Link href={`/provider/adverts/${advert.id}#sponsored`} className="btn-secondary">
                    {advert.title}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

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
        Each qualified referral gives one free 30-day featured placement. Every {REFERRALS_PER_REWARD} qualified referrals also give{" "}
        {REWARD_BOOST_CREDITS} boost credits, plus a free month of Professional unless you&apos;re already on Business.
      </p>
    </DashboardShell>
  );
}
