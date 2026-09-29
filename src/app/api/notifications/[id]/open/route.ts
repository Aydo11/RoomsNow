import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

// Relative redirects, so it works the same behind Render's proxy.
const go = (location: string) => new Response(null, { status: 303, headers: { Location: location, "Cache-Control": "no-store" } });

/** Opening a notification from the full list marks it read, then goes where it points. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return go(`/login?next=${encodeURIComponent("/dashboard/notifications")}`);

  const notification = await db.notification.findFirst({ where: { id, userId: user.id }, select: { id: true, href: true, readAt: true } });
  if (!notification) return go("/dashboard/notifications");
  if (!notification.readAt) await db.notification.update({ where: { id: notification.id }, data: { readAt: new Date() } });

  // Only ever follow links inside the site.
  const href = notification.href && notification.href.startsWith("/") && !notification.href.startsWith("//") ? notification.href : "/dashboard/notifications";
  return go(href);
}
