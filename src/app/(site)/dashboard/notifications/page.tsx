import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/rbac";
import { DashboardShell } from "@/components/dashboard-shell";
import { EmptyState } from "@/components/ui";
import { markNotificationsReadAction } from "@/server/actions/engagement";
import { userNav } from "../nav";
import { referrerNav } from "../../referrals/nav";
import { timeAgo } from "@/lib/format";

export const metadata = { title: "Notifications" };
export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const user = await requireUser("/dashboard/notifications");
  const nav = user.role === "REFERRER" ? await referrerNav(user.id) : await userNav(user.id);
  const notifications = await db.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <DashboardShell
      title="Notifications"
      nav={nav}
      active="/dashboard/notifications"
      action={
        <form action={markNotificationsReadAction}>
          <button className="btn-secondary">Mark all as read</button>
        </form>
      }
    >
      {notifications.length === 0 ? (
        <EmptyState title="Nothing to catch up on" body="Messages, request updates and availability changes land here." />
      ) : (
        <ul className="card divide-y divide-line">
          {notifications.map((notification) => (
            <li key={notification.id} className={notification.readAt ? "px-4 py-4" : "bg-pine-light/30 px-4 py-4"}>
              <Link href={notification.href ?? "#"} className="block">
                <p className="text-[15px]">{notification.title}</p>
                {notification.body && <p className="mt-0.5 text-[14px] text-ink-soft">{notification.body}</p>}
                <p className="mt-1 text-[12px] text-ink-faint">{timeAgo(notification.createdAt)}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </DashboardShell>
  );
}
