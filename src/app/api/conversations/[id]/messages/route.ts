import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

/** Poll endpoint for the chat thread. Participants only — never admins. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const participant = await db.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId: id, userId: user.id } },
  });
  if (!participant) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const messages = await db.message.findMany({
    where: { conversationId: id },
    orderBy: { createdAt: "asc" },
    take: 200,
    select: { id: true, senderId: true, body: true, createdAt: true, readAt: true, clientId: true, clientCard: true, attachmentUrl: true, attachmentName: true, attachmentType: true, isPinned: true },
  });

  await db.message.updateMany({
    where: { conversationId: id, senderId: { not: user.id }, readAt: null },
    data: { readAt: new Date() },
  });

  return NextResponse.json({ messages: messages.map((message) => ({
    ...message,
    attachmentUrl: message.attachmentUrl ? `/api/conversations/${id}/messages/${message.id}/attachment` : null,
  })) }, { headers: { "Cache-Control": "no-store" } });
}
