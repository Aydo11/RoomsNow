import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { storage } from "@/lib/storage";

/** Message media is private to conversation participants. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string; messageId: string }> }) {
  const { id, messageId } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const participant = await db.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId: id, userId: user.id } },
    select: { id: true },
  });
  if (!participant) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const message = await db.message.findFirst({
    where: { id: messageId, conversationId: id },
    select: { attachmentUrl: true, attachmentName: true, attachmentType: true },
  });
  if (!message?.attachmentUrl?.startsWith("private:") || !message.attachmentType) {
    return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
  }

  try {
    const content = await storage.read(message.attachmentUrl);
    const filename = (message.attachmentName || "message-attachment").replace(/[\r\n"\\]/g, "_");
    return new Response(new Uint8Array(content), {
      headers: {
        "Content-Type": message.attachmentType,
        "Content-Length": String(content.byteLength),
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
        // PDFs and images render inline but can never run script in our origin.
        "Content-Security-Policy": "default-src 'none'; img-src 'self'; media-src 'self'; style-src 'unsafe-inline'; sandbox",
      },
    });
  } catch {
    return NextResponse.json({ error: "Attachment unavailable" }, { status: 404 });
  }
}
