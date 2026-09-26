import { db } from "@/lib/db";
import type { NavItem } from "@/components/dashboard-shell";

/** Navigation for service business accounts (External Services Marketplace). */
export async function serviceProviderNav(userId: string): Promise<NavItem[]> {
  const business = await db.serviceBusiness.findUnique({ where: { ownerId: userId }, select: { id: true } });
  const [newQuotes, unansweredReviews, unread] = await Promise.all([
    business ? db.serviceQuoteRequest.count({ where: { businessId: business.id, status: "NEW" } }) : 0,
    business ? db.serviceReview.count({ where: { businessId: business.id, hiddenAt: null, reply: null } }) : 0,
    db.notification.count({ where: { userId, readAt: null } }),
  ]);
  return [
    { href: "/service-provider", label: "Dashboard" },
    { href: "/service-provider/profile", label: "Business profile" },
    { href: "/service-provider/verification", label: "Verification" },
    { href: "/service-provider/adverts", label: "My adverts" },
    { href: "/service-provider/quotes", label: "Quote requests", badge: newQuotes || undefined },
    { href: "/messages", label: "Messages" },
    { href: "/service-provider/reviews", label: "Reviews", badge: unansweredReviews || undefined },
    { href: "/service-provider/plan", label: "Plan and boosts" },
    { href: "/dashboard/notifications", label: "Notifications", badge: unread || undefined },
    { href: "/dashboard/settings", label: "Account settings" },
  ];
}
