import Link from "next/link";
import { db } from "@/lib/db";
import { requireReferrer } from "@/lib/rbac";
import { DashboardShell, StatCard } from "@/components/dashboard-shell";
import { EmptyState } from "@/components/ui";
import { referrerNav } from "./nav";
import { PIPELINE_LABELS, URGENCY_LABELS } from "@/lib/taxonomy";
import { shortDate, timeAgo } from "@/lib/format";

export const metadata = { title: "My referrals" };
export const dynamic = "force-dynamic";

export default async function ReferralsPage() {
  const user = await requireReferrer();
  const [nav, referrals] = await Promise.all([
    referrerNav(user.id),
    db.referral.findMany({
      where: { referrerId: user.id },
      orderBy: { updatedAt: "desc" },
      include: { listing: { select: { id: true, title: true, company: { select: { name: true } } } } },
    }),
  ]);

  const open = referrals.filter((r) => !["MOVED_IN", "DECLINED", "WITHDRAWN"].includes(r.status)).length;
  const placed = referrals.filter((r) => r.status === "MOVED_IN").length;

  return (
    <DashboardShell
      title="My referrals"
      subtitle="Referrals you've made on behalf of the people you support."
      nav={nav}
      active="/referrals"
      action={<Link href="/referrals/new" className="btn-primary">New referral</Link>}
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        <StatCard label="Open" value={open} />
        <StatCard label="People placed" value={placed} />
        <StatCard className="col-span-2 sm:col-span-1" label="Total made" value={referrals.length} />
      </div>

      <div className="mt-8">
        {referrals.length === 0 ? (
          <EmptyState
            title="No referrals yet"
            body="Find suitable accommodation and refer someone in a few minutes."
            actionHref="/search"
            actionLabel="Search accommodation"
          />
        ) : (
          <ul className="card divide-y divide-line">
            {referrals.map((referral) => (
              <li key={referral.id} className="flex flex-wrap items-center gap-4 px-4 py-4">
                <div className="min-w-0 flex-1">
                  <Link href={`/referrals/${referral.id}`} className="text-[16px] hover:text-pine-dark">
                    {referral.applicantFirstName} {referral.applicantLastName}
                  </Link>
                  <p className="mt-0.5 text-[13px] text-ink-faint">
                    {referral.reference} ·{" "}
                    {referral.listing
                      ? `${referral.listing.title}, ${referral.listing.company.name}`
                      : "General referral"}{" "}
                    · sent {shortDate(referral.createdAt)}
                  </p>
                </div>
                <span className="chip">{URGENCY_LABELS[referral.urgency]}</span>
                <div className="text-right">
                  <p className="text-[14px]">{PIPELINE_LABELS[referral.status]}</p>
                  <p className="text-[12px] text-ink-faint">updated {timeAgo(referral.updatedAt)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </DashboardShell>
  );
}
