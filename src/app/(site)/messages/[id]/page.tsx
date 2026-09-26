import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/rbac";
import { Thread } from "@/components/thread";
import { ConversationMenu } from "@/components/conversation-menu";
import { ConversationActions } from "@/components/conversation-actions";
import { clientPhotoSrc, parseClientCard } from "@/lib/client-card";
import { teamMemberIds } from "@/lib/referral-team";

export const metadata = { title: "Conversation" };
export const dynamic = "force-dynamic";

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/messages/${id}`);
  const teamIds = await teamMemberIds(user.id);

  const participant = await db.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId: id, userId: user.id } },
  });
  if (!participant) notFound();

  const conversation = await db.conversation.findUnique({
    where: { id },
    include: {
      listing: { select: { id: true, title: true } },
      lookingForAd: { select: { id: true, title: true } },
      serviceBusiness: { select: { id: true, name: true, tradingName: true, slug: true, logoUrl: true, ownerId: true } },
      serviceAdvert: { select: { id: true, title: true } },
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
  const quickReplies = viewerIsProvider && providerCompanyId
    ? await db.quickReply.findMany({ where: { companyId: providerCompanyId }, orderBy: { createdAt: "asc" }, select: { id: true, body: true } })
    : undefined;
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
  // Services threads (External Services Marketplace) have their own header and
  // never offer to share accommodation profiles across.
  const service = conversation.serviceBusiness;
  const viewerIsServiceBusiness = Boolean(service && service.ownerId === user.id);
  const serviceRequesterCompany = service && viewerIsServiceBusiness
    ? (await db.companyStaff.findFirst({ where: { userId: others[0]?.userId ?? "" }, select: { company: { select: { name: true } } } }))?.company.name ?? null
    : null;
  const serviceTitle = service ? (viewerIsServiceBusiness ? serviceRequesterCompany ?? others[0]?.user.firstName ?? "Provider" : service.tradingName || service.name) : null;
  const serviceTitleHref = service && !viewerIsServiceBusiness ? `/services/business/${service.slug}` : null;
  const serviceAdvertHref = conversation.serviceAdvert ? (viewerIsServiceBusiness ? `/service-provider/adverts/${conversation.serviceAdvert.id}` : `/services/ad/${conversation.serviceAdvert.id}`) : null;
  const shareProfileUrl = service ? null : otherProfileUrl ?? (conversation.listing
    ? `/listings/${conversation.listing.id}`
    : conversation.lookingForAd
      ? `/people/${conversation.lookingForAd.id}`
      : null);

  const attachableClients =
    user.role === "REFERRER"
      ? (
          await db.client.findMany({
            where: { referrerId: { in: teamIds }, deletedAt: null, status: { not: "ARCHIVED" } },
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
    <div className="flex h-full min-h-0 flex-col px-3 pt-2 sm:p-6">
      <header className="flex flex-wrap items-center gap-2 border-b border-line pb-2 sm:gap-3 sm:pb-4">
        <Link
          href="/messages"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink-soft hover:bg-paper-sunk hover:text-ink lg:hidden"
          aria-label="All messages"
        >
          <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path d="M12.5 4.5 7 10l5.5 5.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[17px] leading-tight sm:text-[22px]">
            {serviceTitle ? (
              serviceTitleHref ? (
                <Link href={serviceTitleHref} className="rounded-sm underline decoration-brand/40 underline-offset-4 hover:text-brand">{serviceTitle}</Link>
              ) : (
                serviceTitle
              )
            ) : others[0] && otherProfileUrl ? (
              <Link href={otherProfileUrl} className="rounded-sm underline decoration-brand/40 underline-offset-4 hover:text-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand">
                {others[0].user.firstName} {others[0].user.lastName.charAt(0)}.
              </Link>
            ) : others.map((p) => `${p.user.firstName} ${p.user.lastName.charAt(0)}.`).join(", ") || "Conversation"}
          </h1>
          {service && (
            <span className="flex min-w-0 items-center gap-1.5 text-[12.5px] sm:text-[14px]">
              <span className="shrink-0 rounded-pill bg-brand/10 px-1.5 py-px text-[11px] font-semibold text-brand">Services</span>
              {conversation.serviceAdvert && serviceAdvertHref ? (
                <Link href={serviceAdvertHref} className="truncate text-pine-dark hover:underline">{conversation.serviceAdvert.title}</Link>
              ) : (
                <span className="truncate text-ink-soft">{conversation.subject}</span>
              )}
              <Link href={viewerIsServiceBusiness ? "/service-provider/quotes" : "/services/quotes"} className="hidden shrink-0 text-ink-soft underline-offset-2 hover:underline sm:inline">Quotes</Link>
            </span>
          )}
          {conversation.listing && (
            <Link href={`/listings/${conversation.listing.id}`} className="block truncate text-[12.5px] text-pine-dark hover:underline sm:text-[14px]">
              {conversation.listing.title}
            </Link>
          )}
          {viewerIsProvider && otherReferrer && (
            <Link href={`/agencies/${otherReferrer.userId}`} className="block truncate text-[12.5px] text-pine-dark hover:underline sm:text-[14px]">
              View their agency profile
            </Link>
          )}
          {conversation.lookingForAd && (
            <Link href={`/people/${conversation.lookingForAd.id}`} className="block truncate text-[12.5px] text-pine-dark hover:underline sm:text-[14px]">
              {conversation.lookingForAd.title}
            </Link>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1 sm:gap-3">
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
        quickReplies={quickReplies}
        replyViewer={service ? (viewerIsServiceBusiness ? "service-business" : "service-buyer") : viewerIsProvider ? "provider" : user.role === "REFERRER" ? "referrer" : "seeker"}
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
