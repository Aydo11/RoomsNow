import { db } from "@/lib/db";
import { requireUser } from "@/lib/rbac";
import { ConversationList, type ConversationRow } from "@/components/conversation-list";
import { MessagesShell } from "@/components/messages-shell";
import { privateSectionMetadata } from "@/components/private-section-layout";

export const metadata = privateSectionMetadata;
export const dynamic = "force-dynamic";

export default async function MessagesLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("/messages");

  const conversations = await db.conversation.findMany({
    where: { participants: { some: { userId: user.id } } },
    orderBy: { lastMessageAt: "desc" },
    include: {
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
      participants: {
        include: { user: { select: { id: true, firstName: true, lastName: true, role: true, staffOf: { select: { company: { select: { name: true } } }, take: 1 } } } },
      },
      serviceBusiness: { select: { name: true, tradingName: true, ownerId: true } },
    },
  });

  const rows: ConversationRow[] = conversations.map((conversation) => {
    const mine = conversation.participants.find((p) => p.userId === user.id);
    const others = conversation.participants.filter((p) => p.userId !== user.id);
    const last = conversation.messages[0];
    const unread = Boolean(
      last && last.senderId !== user.id && (!mine?.lastReadAt || mine.lastReadAt < last.createdAt),
    );

    // Services threads are labelled with the business (for providers) or the
    // provider organisation (for the business), so the list reads like an inbox of companies.
    const service = conversation.serviceBusiness;
    const serviceName = service
      ? service.ownerId === user.id
        ? others[0]?.user.staffOf[0]?.company.name ?? others[0]?.user.firstName ?? "Provider"
        : service.tradingName || service.name
      : null;
    const kind: ConversationRow["kind"] = service
      ? "services"
      : user.role === "REFERRER" || others.some((p) => p.user.role === "REFERRER")
        ? "referrals"
        : "accommodation";

    return {
      id: conversation.id,
      kind,
      otherFirstName: serviceName ?? others[0]?.user.firstName ?? "",
      otherLastName: serviceName ? serviceName.split(/\s+/)[1] ?? "" : others[0]?.user.lastName ?? "",
      otherName: serviceName ?? (others.map((p) => p.user.firstName).join(", ") || "Conversation"),
      subject: conversation.subject,
      lastMessage: last ? `${last.senderId === user.id ? "You: " : ""}${last.body}` : null,
      lastMessageAt: conversation.lastMessageAt.toISOString(),
      unread,
      archived: mine?.archived ?? false,
    };
  });

  return <MessagesShell list={<ConversationList conversations={rows} />}>{children}</MessagesShell>;
}
