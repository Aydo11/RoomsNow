import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import type { NavItem } from "@/components/dashboard-shell";

export async function userNav(userId: string): Promise<NavItem[]> {
  // Seeker pages aren't for service businesses; they have their own area.
  const account = await db.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (account?.role === "SERVICE_PROVIDER") redirect("/service-provider");
  const [requests, unread] = await Promise.all([
    db.accommodationRequest.count({ where: { applicantId: userId, status: { notIn: ["DECLINED", "WITHDRAWN"] } } }),
    db.notification.count({ where: { userId, readAt: null } }),
  ]);

  return [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/dashboard/profile", label: "My profile" },
    { href: "/dashboard/advert", label: "My advert" },
    { href: "/search", label: "Search accommodation" },
    { href: "/dashboard/saved", label: "Saved properties" },
    { href: "/dashboard/alerts", label: "Saved alerts" },
    { href: "/messages", label: "Messages" },
    { href: "/dashboard/requests", label: "Requests", badge: requests || undefined },
    { href: "/dashboard/notifications", label: "Notifications", badge: unread || undefined },
    { href: "/dashboard/settings", label: "Settings" },
  ];
}
