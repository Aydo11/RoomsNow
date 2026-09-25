import { db } from "./db";
import { firstReplyMinutes, median } from "./response-label";

/**
 * "Usually replies within…" badges. Once an hour, work out each provider's
 * median time to first reply over the last 90 days and store it on the
 * company, so search results can show the badge without extra queries.
 *
 * A conversation counts when someone outside the company sends the first
 * message. The clock stops at the first reply from anyone on the company's
 * team. Conversations still unanswered after a week count as a week, so
 * ignoring messages lowers the score instead of hiding from it.
 */
const WINDOW_DAYS = 90;

export async function refreshResponseTimes(now = new Date()) {
  const since = new Date(now.getTime() - WINDOW_DAYS * 24 * 60 * 60_000);
  const conversations = await db.conversation.findMany({
    where: { companyId: { not: null }, createdAt: { gte: since } },
    select: {
      companyId: true,
      messages: { orderBy: { createdAt: "asc" }, take: 30, select: { senderId: true, createdAt: true } },
    },
    take: 5000,
  });
  const companyIds = [...new Set(conversations.map((c) => c.companyId!))];
  const staff = await db.companyStaff.findMany({ where: { companyId: { in: companyIds } }, select: { companyId: true, userId: true } });
  const teams = new Map<string, Set<string>>();
  for (const member of staff) {
    const team = teams.get(member.companyId) ?? new Set<string>();
    team.add(member.userId);
    teams.set(member.companyId, team);
  }

  const samples = new Map<string, number[]>();
  for (const conversation of conversations) {
    const team = teams.get(conversation.companyId!);
    if (!team) continue;
    const minutes = firstReplyMinutes(conversation.messages, team, now);
    if (minutes == null) continue;
    const list = samples.get(conversation.companyId!) ?? [];
    list.push(minutes);
    samples.set(conversation.companyId!, list);
  }

  for (const [companyId, values] of samples) {
    await db.company.update({
      where: { id: companyId },
      data: { responseMinutes: median(values), responseSampleSize: values.length },
    });
  }
  // Companies with no qualifying conversations in the window lose their badge.
  await db.company.updateMany({
    where: { responseSampleSize: { gt: 0 }, id: { notIn: [...samples.keys()] } },
    data: { responseMinutes: null, responseSampleSize: 0 },
  });
  return { companies: samples.size };
}

let scheduled = false;

/** Called once from instrumentation.ts when the server boots; then hourly. */
export function scheduleResponseTimeRefresh() {
  if (scheduled) return;
  scheduled = true;
  const run = () => {
    refreshResponseTimes().catch((error) => console.error("[response-time] failed", error));
  };
  setTimeout(run, 90_000);
  setInterval(run, 60 * 60 * 1000);
}
