import Link from "next/link";
import { db } from "@/lib/db";
import { HEALTH_LABELS } from "@/lib/placement-checkins";
import { clsx } from "@/lib/clsx";

const TONE: Record<string, string> = {
  GOING_WELL: "bg-emerald-50 text-emerald-800",
  SOME_CONCERNS: "bg-amber-50 text-amber-800",
  AT_RISK: "bg-red-50 text-red-800",
  ENDED: "bg-paper-sunk text-ink",
};

/** Latest check-in answers for a placement, with a link to answer. Only for moved-in referrals. */
export async function CheckInCard({ referralId, status }: { referralId: string; status: string }) {
  const checkIns = await db.placementCheckIn.findMany({
    where: { referralId },
    orderBy: [{ week: "desc" }, { updatedAt: "desc" }],
    select: { week: true, side: true, health: true },
  });
  if (status !== "MOVED_IN" && checkIns.length === 0) return null;
  return (
    <section className="card mt-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[16px]">Placement check-ins</h2>
        <Link href={`/checkins/${referralId}`} className="text-[14px] font-semibold text-pine-dark hover:underline">
          {checkIns.length ? "View or answer" : "Answer a check-in"}
        </Link>
      </div>
      {checkIns.length === 0 ? (
        <p className="mt-2 text-[14px] text-ink-soft">You&apos;ll be asked how the placement is going at 4 and 12 weeks. You can answer early at any time.</p>
      ) : (
        <ul className="mt-3 flex flex-wrap gap-2 text-[13px]">
          {checkIns.map((checkIn) => (
            <li key={`${checkIn.week}-${checkIn.side}`} className={clsx("rounded-pill px-3 py-1 font-medium", TONE[checkIn.health])}>
              Week {checkIn.week}, {checkIn.side === "REFERRER" ? "referrer" : "provider"}: {HEALTH_LABELS[checkIn.health]}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
