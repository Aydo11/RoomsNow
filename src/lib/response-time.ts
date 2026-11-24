import { db } from "./db";
import { firstReplyMinutes, median } from "./response-label";
import { NO_REPLIES_PAUSE, conversationWaiting, replyTier } from "./reply-health";

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

/** First-reply minutes per company, for conversations started since `since`. */
export async function companyReplySamples(since: Date, now = new Date()) {
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
  return samples;
}

export async function refreshResponseTimes(now = new Date()) {
  const samples = await companyReplySamples(new Date(now.getTime() - WINDOW_DAYS * 24 * 60 * 60_000), now);

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
  const health = await refreshReplyHealth(now);
  return { companies: samples.size, ...health };
}

const team = async (companyIds: string[]) => {
  const staff = await db.companyStaff.findMany({ where: { companyId: { in: companyIds } }, select: { companyId: true, userId: true } });
  const teams = new Map<string, Set<string>>();
  for (const member of staff) {
    const set = teams.get(member.companyId) ?? new Set<string>();
    set.add(member.userId);
    teams.set(member.companyId, set);
  }
  return teams;
};

/** Conversations with recent activity, newest messages last (only the latest 30 are read). */
async function recentConversations(where: { companyId: string | { in: string[] } | { not: null } }, since: Date) {
  const rows = await db.conversation.findMany({
    where: { ...where, lastMessageAt: { gte: since } },
    select: { companyId: true, messages: { where: { isDeleted: false }, orderBy: { createdAt: "desc" }, take: 30, select: { senderId: true, createdAt: true } } },
    take: 10000,
  });
  return rows.map((row) => ({ companyId: row.companyId!, messages: row.messages.reverse() }));
}

/** People currently waiting for a reply from this company: one count per person. */
export async function peopleWaitingFor(companyId: string, now = new Date()) {
  const [conversations, teams] = await Promise.all([
    recentConversations({ companyId }, new Date(now.getTime() - 60 * 24 * 60 * 60_000)),
    team([companyId]),
  ]);
  const members = teams.get(companyId) ?? new Set<string>();
  const waiting = new Set<string>();
  for (const conversation of conversations) {
    const { waitingFrom } = conversationWaiting(conversation.messages, members);
    if (waitingFrom) waiting.add(waitingFrom);
  }
  return waiting.size;
}

/**
 * Works out each provider's reply tier (see lib/reply-health.ts) for search
 * ranking and the "may be slow to reply" label.
 */
export async function refreshReplyHealth(now = new Date()) {
  const conversations = await recentConversations({ companyId: { not: null } }, new Date(now.getTime() - 120 * 24 * 60 * 60_000));
  const companyIds = [...new Set(conversations.map((c) => c.companyId))];
  const teams = await team(companyIds);
  const state = new Map<string, { waitingSince: Date | null; lastTeamReplyAt: Date | null }>();
  for (const conversation of conversations) {
    const members = teams.get(conversation.companyId);
    if (!members) continue;
    const { waitingSince, lastTeamAt } = conversationWaiting(conversation.messages, members);
    const current = state.get(conversation.companyId) ?? { waitingSince: null, lastTeamReplyAt: null };
    if (waitingSince && (!current.waitingSince || waitingSince < current.waitingSince)) current.waitingSince = waitingSince;
    if (lastTeamAt && (!current.lastTeamReplyAt || lastTeamAt > current.lastTeamReplyAt)) current.lastTeamReplyAt = lastTeamAt;
    state.set(conversation.companyId, current);
  }

  const companies = await db.company.findMany({
    select: { id: true, replyTier: true, responseMinutes: true, responseSampleSize: true, lastTeamReplyAt: true },
  });
  let resumed = 0;
  for (const company of companies) {
    const found = state.get(company.id) ?? { waitingSince: null, lastTeamReplyAt: null };
    // Keep a reply recorded straight from the message action if it's newer.
    const lastTeamReplyAt = [found.lastTeamReplyAt, company.lastTeamReplyAt].filter(Boolean).sort((a, b) => b!.getTime() - a!.getTime())[0] ?? null;
    const tier = replyTier({ waitingSince: found.waitingSince, lastTeamReplyAt, responseMinutes: company.responseMinutes, responseSampleSize: company.responseSampleSize }, now.getTime());
    await db.company.update({ where: { id: company.id }, data: { replyTier: tier, waitingSince: found.waitingSince, lastTeamReplyAt } });

    // Adverts are no longer paused for not replying; bring back any that were.
    resumed += await resumeNoReplyListings(company.id);
  }
  return { resumed };
}

/** Brings back adverts paused for not replying. Returns how many came back. */
export async function resumeNoReplyListings(companyId: string) {
  const { count } = await db.listing.updateMany({
    where: { companyId, status: "PAUSED", pausedReason: NO_REPLIES_PAUSE },
    data: { status: "ACTIVE", pausedReason: null },
  });
  return count;
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
