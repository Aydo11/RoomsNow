import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * Feeds the notification bell in the header. Polled every half a minute or so
 * while the tab is visible, so it stays small: the unread count, unread
 * message threads and the latest few notifications.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const [unread, unreadMessages, items] = await Promise.all([
    db.notification.count({ where: { userId: user.id, readAt: null } }),
    db.conversationParticipant.count({
      where: {
        userId: user.id,
        archived: false,
        conversation: { messages: { some: { senderId: { not: user.id }, readAt: null, isDeleted: false } } },
      },
    }),
    db.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, type: true, title: true, body: true, href: true, readAt: true, createdAt: true },
    }),
  ]);

  return NextResponse.json(
    { unread, unreadMessages, items },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/** Mark one notification (`{ id }`) or all of them (`{ all: true }`) as read. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  // Only our own pages may do this.
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (origin && host && new URL(origin).host !== host) {
    return NextResponse.json({ error: "Bad origin" }, { status: 403 });
  }

  const payload = (await request.json().catch(() => ({}))) as { id?: unknown; all?: unknown };
  const now = new Date();
  if (payload.all === true) {
    await db.notification.updateMany({ where: { userId: user.id, readAt: null }, data: { readAt: now } });
  } else if (typeof payload.id === "string" && payload.id) {
    await db.notification.updateMany({ where: { id: payload.id, userId: user.id, readAt: null }, data: { readAt: now } });
  } else {
    return NextResponse.json({ error: "Nothing to mark" }, { status: 400 });
  }
  const unread = await db.notification.count({ where: { userId: user.id, readAt: null } });
  return NextResponse.json({ ok: true, unread });
}
