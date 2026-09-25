import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/rbac";
import { inTeam } from "@/lib/referral-team";
import { hasAdminPermission } from "@/lib/admin-permissions";
import { CheckInForm } from "@/components/checkin-form";
import { CHECKIN_WEEKS, HEALTH_LABELS, movedInAt } from "@/lib/placement-checkins";
import { shortDate } from "@/lib/format";
import { clsx } from "@/lib/clsx";

export const metadata = { title: "Placement check-in", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const TONE: Record<string, string> = {
  GOING_WELL: "bg-emerald-50 text-emerald-800",
  SOME_CONCERNS: "bg-amber-50 text-amber-800",
  AT_RISK: "bg-red-50 text-red-800",
  ENDED: "bg-paper-sunk text-ink",
};

/** The 4- and 12-week "is the placement going well?" check-in for one placement. */
export default async function CheckInPage({
  params,
  searchParams,
}: {
  params: Promise<{ referralId: string }>;
  searchParams: Promise<{ week?: string }>;
}) {
  const [{ referralId }, query] = await Promise.all([params, searchParams]);
  const user = await requireUser(`/checkins/${referralId}`);
  const referral = await db.referral.findUnique({
    where: { id: referralId },
    select: {
      id: true,
      reference: true,
      status: true,
      referrerId: true,
      applicantFirstName: true,
      applicantLastName: true,
      listing: { select: { title: true, companyId: true, company: { select: { name: true } } } },
      checkIns: { orderBy: { createdAt: "asc" }, select: { week: true, side: true, health: true, note: true, updatedAt: true } },
    },
  });
  if (!referral) notFound();
  const isReferrer = await inTeam(user.id, referral.referrerId);
  const isProvider = referral.listing ? user.staffOf.some((staff) => staff.companyId === referral.listing!.companyId) : false;
  if (!isReferrer && !isProvider && !hasAdminPermission(user)) notFound();

  const side = isReferrer ? "REFERRER" : isProvider ? "PROVIDER" : null;
  const moved = await movedInAt(referral.id);
  const weeksSince = moved ? Math.floor((Date.now() - moved.getTime()) / (7 * 24 * 60 * 60 * 1000)) : 0;
  const requested = Number(query.week);
  const week: 4 | 12 = requested === 12 || (requested !== 4 && weeksSince >= 12) ? 12 : 4;
  const mine = referral.checkIns.find((c) => c.week === week && c.side === side);
  const backHref = isReferrer ? `/referrals/${referral.id}` : `/provider/referrals/${referral.id}`;

  return (
    <div className="shell py-8 sm:py-12">
      <div className="mx-auto max-w-[640px]">
        <Link href={backHref} className="text-[14px] text-pine-dark hover:underline">
          ← Back to referral {referral.reference}
        </Link>
        <h1 className="mt-3 text-[28px] font-bold leading-tight">
          {referral.applicantFirstName} {referral.applicantLastName.charAt(0)}. — placement check-in
        </h1>
        <p className="mt-1 text-[15px] text-ink-soft">
          {referral.listing ? `${referral.listing.title}, ${referral.listing.company.name}` : "Placement"}
          {moved ? ` · moved in ${shortDate(moved)} (${weeksSince} week${weeksSince === 1 ? "" : "s"} ago)` : ""}
        </p>

        <div className="mt-6 flex gap-2" role="tablist" aria-label="Check-in">
          {CHECKIN_WEEKS.map((w) => (
            <Link
              key={w}
              href={`/checkins/${referral.id}?week=${w}`}
              role="tab"
              aria-selected={w === week}
              className={clsx("chip px-4 py-1.5 text-[14px]", w === week && "chip-active")}
            >
              {w}-week check-in
            </Link>
          ))}
        </div>

        <section className="card mt-4 p-6">
          {referral.status !== "MOVED_IN" && !mine ? (
            <p className="text-[15px] text-ink-soft">Check-ins open once the referral is marked as moved in.</p>
          ) : side ? (
            <CheckInForm referralId={referral.id} week={week} initialHealth={mine?.health} initialNote={mine?.note} />
          ) : (
            <p className="text-[15px] text-ink-soft">Only the referrer and the provider answer check-ins. Admins can see the answers below.</p>
          )}
        </section>

        <section className="mt-6">
          <h2 className="text-[18px] font-bold">Answers so far</h2>
          {referral.checkIns.length === 0 ? (
            <p className="mt-2 text-[14px] text-ink-soft">No answers yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {referral.checkIns.map((checkIn) => (
                <li key={`${checkIn.week}-${checkIn.side}`} className="card p-4">
                  <div className="flex flex-wrap items-center gap-2 text-[13px]">
                    <span className="font-semibold text-ink">
                      Week {checkIn.week} · {checkIn.side === "REFERRER" ? "Referrer" : "Provider"}
                    </span>
                    <span className={clsx("rounded-pill px-2.5 py-0.5 font-semibold", TONE[checkIn.health])}>{HEALTH_LABELS[checkIn.health]}</span>
                    <span className="text-ink-faint">{shortDate(checkIn.updatedAt)}</span>
                  </div>
                  {checkIn.note && <p className="mt-2 whitespace-pre-line text-[14px] text-ink-soft">{checkIn.note}</p>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
