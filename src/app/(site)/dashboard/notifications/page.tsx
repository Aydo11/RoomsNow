import Link from "next/link";
import type { NotificationType, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/rbac";
import { serviceProviderNav } from "../../service-provider/nav";
import { DashboardShell } from "@/components/dashboard-shell";
import { EmptyState } from "@/components/ui";
import { TypeIcon } from "@/components/notification-bell";
import { markNotificationsReadAction } from "@/server/actions/engagement";
import { userNav } from "../nav";
import { referrerNav } from "../../referrals/nav";
import { timeAgo } from "@/lib/format";
import { clsx } from "@/lib/clsx";

export const metadata = { title: "Notifications" };
export const dynamic = "force-dynamic";

const FILTERS: { key: string; label: string; where: Prisma.NotificationWhereInput }[] = [
  { key: "all", label: "All", where: {} },
  { key: "unread", label: "Unread", where: { readAt: null } },
  { key: "messages", label: "Messages", where: { type: "MESSAGE" } },
  { key: "requests", label: "Requests & referrals", where: { type: { in: ["REQUEST", "REFERRAL"] as NotificationType[] } } },
  { key: "rooms", label: "Rooms & saved", where: { type: { in: ["LISTING", "SAVED_LISTING"] as NotificationType[] } } },
  { key: "account", label: "Account", where: { type: { in: ["MEMBERSHIP", "VERIFICATION", "REVIEW", "SYSTEM"] as NotificationType[] } } },
];

export default async function NotificationsPage({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const { show } = await searchParams;
  const user = await requireUser("/dashboard/notifications");
  const nav = user.role === "SERVICE_PROVIDER" ? await serviceProviderNav(user.id) : user.role === "REFERRER" || user.role === "ADMIN" ? await referrerNav(user.id) : await userNav(user.id);
  const filter = FILTERS.find((f) => f.key === show) ?? FILTERS[0];
  const [notifications, unread] = await Promise.all([
    db.notification.findMany({
      where: { userId: user.id, ...filter.where },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    db.notification.count({ where: { userId: user.id, readAt: null } }),
  ]);

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const weekAgo = new Date(startOfToday.getTime() - 6 * 24 * 60 * 60 * 1000);
  const groups = [
    { key: "today", label: "Today", items: notifications.filter((n) => n.createdAt >= startOfToday) },
    { key: "week", label: "This week", items: notifications.filter((n) => n.createdAt < startOfToday && n.createdAt >= weekAgo) },
    { key: "earlier", label: "Earlier", items: notifications.filter((n) => n.createdAt < weekAgo) },
  ].filter((group) => group.items.length > 0);

  return (
    <DashboardShell
      title="Notifications"
      nav={nav}
      active="/dashboard/notifications"
      action={
        unread > 0 ? (
          <form action={markNotificationsReadAction}>
            <button className="btn-secondary">Mark all as read</button>
          </form>
        ) : undefined
      }
    >
      <nav aria-label="Filter notifications" className="-mx-1 mb-4 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key === "all" ? "/dashboard/notifications" : `/dashboard/notifications?show=${f.key}`}
            aria-current={f.key === filter.key ? "page" : undefined}
            className={clsx("chip shrink-0", f.key === filter.key && "chip-active")}
          >
            {f.label}
            {f.key === "unread" && unread > 0 && <span className="ml-1 rounded-pill bg-clay px-1.5 text-[11px] font-semibold text-white">{unread}</span>}
          </Link>
        ))}
      </nav>

      {notifications.length === 0 ? (
        <EmptyState
          title={filter.key === "all" ? "Nothing to catch up on" : "Nothing here"}
          body={filter.key === "all" ? "Messages, request updates and availability changes land here." : "Try another filter, or check back later."}
        />
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <section key={group.key} aria-labelledby={`group-${group.key}`}>
              <h2 id={`group-${group.key}`} className="mb-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-faint">{group.label}</h2>
              <ul className="card divide-y divide-line overflow-hidden">
                {group.items.map((notification) => (
                  <li key={notification.id}>
                    {/* Goes via a tiny route that marks it read first. */}
                    <a
                      href={`/api/notifications/${notification.id}/open`}
                      className={clsx("flex gap-3 px-4 py-4 transition-colors hover:bg-paper-sunk/60", !notification.readAt && "bg-pine-light/30")}
                    >
                      <TypeIcon type={notification.type} />
                      <span className="min-w-0 flex-1">
                        <span className={clsx("block text-[15px] text-ink", !notification.readAt && "font-semibold")}>{notification.title}</span>
                        {notification.body && <span className="mt-0.5 block text-[14px] text-ink-soft">{notification.body}</span>}
                        <span className="mt-1 block text-[12px] text-ink-faint">{timeAgo(notification.createdAt)}</span>
                      </span>
                      {!notification.readAt && <span aria-label="Unread" className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand" />}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
