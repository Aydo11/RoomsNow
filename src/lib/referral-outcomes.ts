const DAY_MS = 24 * 60 * 60 * 1000;

export type ReferralOutcomeInput = {
  status: string;
  createdAt: Date;
  events: { status: string; createdAt: Date }[];
};

export type ReferralOutcomeStats = {
  totalResolved: number;
  movedIn: number;
  declined: number;
  withdrawn: number;
  /** movedIn / totalResolved, or null when nothing has resolved yet. */
  conversionRate: number | null;
  /** Average days from submission to the first status change away from SUBMITTED. */
  avgDaysToFirstResponse: number | null;
  /** Average days from submission to the MOVED_IN event, for referrals that got there. */
  avgDaysToMoveIn: number | null;
};

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/**
 * Turns raw referral + event history into the outcome metrics shown on the
 * provider dashboard — conversion rate and typical time-to-decision /
 * time-to-move-in. Pure so it's easy to reason about and test independently
 * of the Prisma query that feeds it (mirrors buildReferralTimeline).
 */
export function computeReferralOutcomes(referrals: ReferralOutcomeInput[]): ReferralOutcomeStats {
  const resolved = referrals.filter((r) => r.status === "MOVED_IN" || r.status === "DECLINED" || r.status === "WITHDRAWN");
  const movedIn = resolved.filter((r) => r.status === "MOVED_IN");
  const declined = resolved.filter((r) => r.status === "DECLINED");
  const withdrawn = resolved.filter((r) => r.status === "WITHDRAWN");

  const firstResponseDays = resolved
    .map((r) => {
      const sorted = [...r.events].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      const submitted = sorted[0];
      if (!submitted) return null;
      const nextEvent = sorted.find((event) => event.createdAt.getTime() > submitted.createdAt.getTime());
      return nextEvent ? (nextEvent.createdAt.getTime() - r.createdAt.getTime()) / DAY_MS : null;
    })
    .filter((value): value is number => value !== null);

  const moveInDays = movedIn
    .map((r) => {
      const moveEvent = [...r.events].reverse().find((event) => event.status === "MOVED_IN");
      return moveEvent ? (moveEvent.createdAt.getTime() - r.createdAt.getTime()) / DAY_MS : null;
    })
    .filter((value): value is number => value !== null);

  return {
    totalResolved: resolved.length,
    movedIn: movedIn.length,
    declined: declined.length,
    withdrawn: withdrawn.length,
    conversionRate: resolved.length > 0 ? movedIn.length / resolved.length : null,
    avgDaysToFirstResponse: average(firstResponseDays),
    avgDaysToMoveIn: average(moveInDays),
  };
}
