import { db } from "@/lib/db";
import type { NavItem } from "@/components/dashboard-shell";
import { teamMemberIds } from "@/lib/referral-team";

export async function referrerNav(userId: string): Promise<NavItem[]> {
  const teamIds = await teamMemberIds(userId);
  const [open, activeClients, unread] = await Promise.all([
    db.referral.count({
      where: { referrerId: { in: teamIds }, status: { notIn: ["MOVED_IN", "DECLINED", "WITHDRAWN"] } },
    }),
    db.client.count({ where: { referrerId: { in: teamIds }, status: { not: "ARCHIVED" }, deletedAt: null } }),
    db.notification.count({ where: { userId, readAt: null } }),
  ]);

  return [
    { href: "/referrals", label: "My referrals", badge: open || undefined },
    { href: "/referrals/new", label: "New referral" },
    { href: "/referrals/clients", label: "My clients", badge: activeClients || undefined },
    { href: "/referrals/analytics", label: "Analytics" },
    { href: "/search", label: "Search accommodation" },
    { href: "/referrals/vetted", label: "Vetted providers" },
    { href: "/dashboard/alerts", label: "Saved alerts" },
    { href: "/messages", label: "Messages" },
    { href: "/referrals/membership", label: "Membership" },
    { href: "/referrals/team", label: "Team" },
    { href: "/referrals/profile", label: "Agency profile" },
    { href: "/dashboard/notifications", label: "Notifications", badge: unread || undefined },
    { href: "/dashboard/settings", label: "Settings" },
  ];
}
