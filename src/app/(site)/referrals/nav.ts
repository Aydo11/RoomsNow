import { db } from "@/lib/db";
import type { NavItem } from "@/components/dashboard-shell";

export async function referrerNav(userId: string): Promise<NavItem[]> {
  const [open, activeClients] = await Promise.all([
    db.referral.count({
      where: { referrerId: userId, status: { notIn: ["MOVED_IN", "DECLINED", "WITHDRAWN"] } },
    }),
    db.client.count({ where: { referrerId: userId, status: { not: "ARCHIVED" }, deletedAt: null } }),
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
    { href: "/referrals/profile", label: "Agency profile" },
    { href: "/dashboard/notifications", label: "Notifications" },
    { href: "/dashboard/settings", label: "Settings" },
  ];
}
