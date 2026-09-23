import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/rbac";
import { Thread } from "@/components/thread";
import { ConversationMenu } from "@/components/conversation-menu";
import { ConversationActions } from "@/components/conversation-actions";
import { clientPhotoSrc, parseClientCard } from "@/lib/client-card";

export const metadata = { title: "Conversation" };
export const dynamic = "force-dynamic";

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/messages/${id}`);

  const participant = await db.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId: id, userId: user.id } },
  });
  if (!participant) notFound();

  const conversation = await db.conversation.findUnique({
    where: { id },
    include: {
      listing: { select: { id: true, title: true } },
      lookingForAd: { select: { id: true, title: true } },
      participants: { include: { user: { select: { id: true, firstName: true, lastName: true, role: true } } } },
      messages: { orderBy: { createdAt: "asc" }, take: 200 },
    },
  });
  if (!conversation) notFound();

  await db.conversationParticipant.update({
    where: { conversationId_userId: { conversationId: id, userId: user.id } },
    data: { lastReadAt: new Date() },
  });
  await db.message.updateMany({
    where: { conversationId: id, senderId: { not: user.id }, readAt: null },
    data: { readAt: new Date() },
  });

  const others = conversation.participants.filter((p) => p.userId !== user.id);
  const providerCompanyId = conversation.companyId ?? others.find((p) => p.companyId)?.companyId ?? null;
  const viewerCompanyIds = new Set(user.staffOf.map((s) => s.companyId));
  const viewerIsProvider = Boolean(providerCompanyId && viewerCompanyIds.has(providerCompanyId));
  const otherReferrer = others.find((p) => p.user.role === "REFERRER");
  const providerCompany = providerCompanyId
    ? await db.company.findUnique({ where: { id: providerCompanyId }, select: { slug: true } })
    : null;
  const otherLookingForAd = others[0]?.user.role === "USER"
    ? await db.lookingForAd.findFirst({
        where: { userId: others[0].userId, status: "ACTIVE", user: { profile: { is: { discoverable: true } } } },
        orderBy: { updatedAt: "desc" },
        select: { id: true },
      })
    : null;
  const otherProfileUrl = otherReferrer
    ? `/agencies/${otherReferrer.userId}`
    : providerCompany?.slug
      ? `/companies/${providerCompany.slug}`
      : otherLookingForAd
        ? `/people/${otherLookingForAd.id}`
        : null;
  const shareProfileUrl = otherProfileUrl ?? (conversation.listing
    ? `/listings/${conversation.listing.id}`
    : conversation.lookingForAd
      ? `/people/${conversation.lookingForAd.id}`
      : null);

  const attachableClients =
    user.role === "REFERRER"
      ? (
          await db.client.findMany({
            where: { referrerId: user.id, deletedAt: null, status: { not: "ARCHIVED" } },
            orderBy: { updatedAt: "desc" },
            take: 200,
            select: { id: true, firstName: true, lastName: true, preferredLocation: true, photoUrl: true, updatedAt: true, status: true },
          })
        ).map((client) => ({
          id: client.id,
          name: `${client.firstName} ${client.lastName}`,
          photo: clientPhotoSrc(client),
          detail: [client.status === "PLACED" ? "Placed" : "Active", client.preferredLocation].filter(Boolean).join(" · "),
        }))
      : undefined;
  const alreadyBlocked = others[0]
    ? Boolean(
        await db.block.findUnique({
          where: { blockerId_blockedId: { blockerId: user.id, blockedId: others[0].userId } },
        }),
      )
    : false;

  return (
    <div className="flex h-full min-h-0 flex-col p-4 sm:p-6">
      <Link href="/messages" className="text-[14px] text-ink-soft hover:text-ink lg:hidden">← All messages</Link>

      <header className="mt-2 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4 lg:mt-0">
        <div>
          <h1 className="text-[22px]">
            {others[0] && otherProfileUrl ? (
              <Link href={otherProfileUrl} className="rounded-sm underline decoration-brand/40 underline-offset-4 hover:text-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand">
                {others[0].user.firstName} {others[0].user.lastName.charAt(0)}.
              </Link>
            ) : others.map((p) => `${p.user.firstName} ${p.user.lastName.charAt(0)}.`).join(", ") || "Conversation"}
          </h1>
          {conversation.listing && (
            <Link href={`/listings/${conversation.listing.id}`} className="text-[14px] text-pine-dark hover:underline">
              {conversation.listing.title}
            </Link>
          )}
          {viewerIsProvider && otherReferrer && (
            <Link href={`/agencies/${otherReferrer.userId}`} className="block text-[14px] text-pine-dark hover:underline">
              View their agency profile
            </Link>
          )}
          {conversation.lookingForAd && (
            <Link href={`/people/${conversation.lookingForAd.id}`} className="text-[14px] text-pine-dark hover:underline">
              {conversation.lookingForAd.title}
            </Link>
          )}
        </div>
        <div className="flex items-center gap-3">
          <ConversationActions conversationId={conversation.id} archived={participant.archived} variant="header" />
          {others[0] && (
            <ConversationMenu
              otherUserId={others[0].userId}
              otherName={others[0].user.firstName}
              initiallyBlocked={alreadyBlocked}
            />
          )}
        </div>
      </header>

      <Thread
        conversationId={conversation.id}
        currentUserId={user.id}
        attachableClients={attachableClients}
        viewerIsProvider={viewerIsProvider}
        withProvider={Boolean(providerCompanyId) && !viewerIsProvider}
        shareProfileUrl={shareProfileUrl}
        initialMessages={conversation.messages.map((m) => ({
          id: m.id,
          senderId: m.senderId,
          body: m.body,
          createdAt: m.createdAt.toISOString(),
          readAt: m.readAt?.toISOString() ?? null,
          clientId: m.clientId,
          clientCard: parseClientCard(m.clientCard),
          attachmentUrl: m.attachmentUrl ? `/api/conversations/${conversation.id}/messages/${m.id}/attachment` : null,
          attachmentName: m.attachmentName,
          attachmentType: m.attachmentType,
          isPinned: m.isPinned,
          isDeleted: m.isDeleted,
        }))}
      />
    </div>
  );
}
