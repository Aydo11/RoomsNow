import "server-only";
import { db } from "./db";
import { notify, notifyCompany } from "./notify";
import { requestConversationIds, requestThreadKey } from "./request-conversation";
import { AWAITING_REPLY_STATUSES, CHASE_LOOKBACK_MS, chasesDue, PROVIDER_CHASE_AFTER_MS } from "./request-chase-rules";

/**
 * Hourly: chase accommodation requests nobody has answered.
 * A request counts as answered once the provider moves its status on, or
 * anyone other than the applicant replies in the advert's message thread.
 * - 48 hours unanswered: one reminder per provider, covering all their waiting requests.
 * - 5 days unanswered: the applicant hears there's no reply yet and gets a link to similar rooms.
 */
export async function runRequestChasers(now = new Date()) {
  const candidates = await db.accommodationRequest.findMany({
    where: {
      status: { in: [...AWAITING_REPLY_STATUSES] },
      archivedAt: null,
      createdAt: { gte: new Date(now.getTime() - CHASE_LOOKBACK_MS), lte: new Date(now.getTime() - PROVIDER_CHASE_AFTER_MS) },
      OR: [{ providerChaseSentAt: null }, { seekerFollowUpSentAt: null }],
    },
    select: {
      id: true, applicantId: true, listingId: true, createdAt: true, providerChaseSentAt: true, seekerFollowUpSentAt: true,
      listing: { select: { title: true, companyId: true, company: { select: { name: true } }, property: { select: { city: true } } } },
    },
    take: 500,
  });
  if (!candidates.length) return { providers: 0, seekers: 0 };

  // Drop requests the provider has already replied to in Messages.
  const threads = await requestConversationIds(candidates);
  const threadIds = [...new Set(threads.values())];
  const replies = threadIds.length
    ? await db.message.findMany({ where: { conversationId: { in: threadIds } }, select: { conversationId: true, senderId: true } })
    : [];
  const unanswered = candidates.filter((request) => {
    const thread = threads.get(requestThreadKey(request.listingId, request.applicantId));
    return !replies.some((m) => m.conversationId === thread && m.senderId !== request.applicantId);
  });

  const byCompany = new Map<string, typeof unanswered>();
  let seekers = 0;
  for (const request of unanswered) {
    const due = chasesDue(request, now);
    if (due.provider) byCompany.set(request.listing.companyId, [...(byCompany.get(request.listing.companyId) ?? []), request]);
    if (due.seeker) {
      try {
        const city = request.listing.property?.city;
        await notify({
          userId: request.applicantId,
          type: "REQUEST",
          title: `No reply yet from ${request.listing.company.name}`,
          body: `You asked about "${request.listing.title}" ${Math.round((now.getTime() - request.createdAt.getTime()) / 86_400_000)} days ago and haven't heard back. Don't wait: here are other rooms${city ? ` in ${city}` : ""} you can ask about today. If you've already found somewhere, let us know from My requests.`,
          href: city ? `/search?q=${encodeURIComponent(city)}` : "/search",
          email: true,
        });
        await db.accommodationRequest.update({ where: { id: request.id }, data: { seekerFollowUpSentAt: now } });
        seekers += 1;
      } catch (error) {
        console.error("[request-chasers] seeker follow-up failed", error);
      }
    }
  }

  for (const [companyId, requests] of byCompany) {
    try {
      const count = requests.length;
      await notifyCompany(companyId, {
        type: "REQUEST",
        title: count === 1 ? "1 person is waiting for your reply" : `${count} people are waiting for your reply`,
        body: `${count === 1 ? "A request has" : `${count} requests have`} had no reply for over 48 hours. People looking for a room often need an answer quickly, and after 5 days we suggest other rooms to them. Reply in Messages or update the request status.`,
        href: "/provider/requests?view=new",
        email: true,
      });
      await db.accommodationRequest.updateMany({ where: { id: { in: requests.map((r) => r.id) } }, data: { providerChaseSentAt: now } });
    } catch (error) {
      console.error("[request-chasers] provider reminder failed", error);
    }
  }
  return { providers: byCompany.size, seekers };
}

let scheduled = false;
/** Called once from instrumentation.ts when the server boots; then hourly. */
export function scheduleRequestChasers() {
  if (scheduled) return;
  scheduled = true;
  const run = () => runRequestChasers().catch((error) => console.error("[request-chasers] failed", error));
  setTimeout(run, 5 * 60_000);
  setInterval(run, 60 * 60_000);
}
