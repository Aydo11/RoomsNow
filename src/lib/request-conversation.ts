import { db } from "./db";
export { requestMessageBody, requestThreadKey, type RequestSummary } from "./request-message";
import { requestThreadKey } from "./request-message";

/**
 * An accommodation request also opens (or reuses) the message thread between
 * the applicant and the provider for that advert, so the two can talk it
 * through in Messages instead of the provider only seeing an alert.
 */

/**
 * Posts the request into the advert's thread. Returns the conversation id, or
 * null when there is no one to message (no staff) or the provider has blocked
 * the applicant. Never throws: a messaging problem must not lose the request.
 */
export async function openRequestConversation(input: {
  applicantId: string;
  listing: { id: string; companyId: string; title: string };
  body: string;
}): Promise<string | null> {
  try {
    const { applicantId, listing, body } = input;
    const staff = await db.companyStaff.findMany({ where: { companyId: listing.companyId }, select: { userId: true } });
    const recipientIds = staff.map((member) => member.userId).filter((id) => id !== applicantId);
    if (!recipientIds.length) return null;

    const blocked = await db.block.findFirst({ where: { blockerId: { in: recipientIds }, blockedId: applicantId } });
    if (blocked) return null;

    const existing = await db.conversation.findFirst({
      where: { listingId: listing.id, participants: { some: { userId: applicantId } } },
      select: { id: true },
    });
    const conversation =
      existing ??
      (await db.conversation.create({
        data: {
          subject: listing.title,
          listingId: listing.id,
          companyId: listing.companyId,
          participants: {
            create: [
              { userId: applicantId, companyId: null },
              ...recipientIds.map((userId) => ({ userId, companyId: listing.companyId })),
            ],
          },
        },
        select: { id: true },
      }));

    await db.message.create({ data: { conversationId: conversation.id, senderId: applicantId, body } });
    await db.conversation.update({ where: { id: conversation.id }, data: { lastMessageAt: new Date() } });
    // Bring the thread back if either side had archived it.
    await db.conversationParticipant.updateMany({ where: { conversationId: conversation.id }, data: { archived: false } });
    return conversation.id;
  } catch (error) {
    console.error("[request-conversation] could not open thread", error);
    return null;
  }
}

/** The advert thread for each request, keyed by requestThreadKey. */
export async function requestConversationIds(requests: Array<{ listingId: string; applicantId: string }>) {
  const map = new Map<string, string>();
  if (!requests.length) return map;
  const conversations = await db.conversation.findMany({
    where: {
      listingId: { in: [...new Set(requests.map((request) => request.listingId))] },
      participants: { some: { userId: { in: [...new Set(requests.map((request) => request.applicantId))] } } },
    },
    orderBy: { lastMessageAt: "desc" },
    select: { id: true, listingId: true, participants: { select: { userId: true } } },
  });
  for (const request of requests) {
    const match = conversations.find(
      (conversation) =>
        conversation.listingId === request.listingId &&
        conversation.participants.some((participant) => participant.userId === request.applicantId),
    );
    if (match) map.set(requestThreadKey(request.listingId, request.applicantId), match.id);
  }
  return map;
}
