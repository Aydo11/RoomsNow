type CheckIn = { week: number; health: string };

export function latestPlacementAtRisk(status: string, checkIns: CheckIn[]) {
  if (status !== "MOVED_IN" || !checkIns.length) return false;
  const latestWeek = Math.max(...checkIns.map((checkIn) => checkIn.week));
  const latest = checkIns.filter((checkIn) => checkIn.week === latestWeek);
  return !latest.some((checkIn) => checkIn.health === "ENDED") && latest.some((checkIn) => checkIn.health === "AT_RISK");
}

export function firstProviderResponseDays(
  submittedAt: Date,
  events: { status: string; createdAt: Date; actorId: string | null }[],
  staff: { userId: string; createdAt: Date }[],
) {
  const reply = events.filter((event) =>
    event.status !== "SUBMITTED" && event.status !== "WITHDRAWN" &&
    event.createdAt >= submittedAt && staff.some((member) => member.userId === event.actorId && member.createdAt <= event.createdAt),
  ).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0];
  return reply ? (reply.createdAt.getTime() - submittedAt.getTime()) / 86_400_000 : null;
}
