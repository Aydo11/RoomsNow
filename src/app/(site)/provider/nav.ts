import { db } from "@/lib/db";
import type { NavItem } from "@/components/dashboard-shell";

export async function providerNav(companyId: string): Promise<NavItem[]> {
  const [requests, referrals, sharedClients, viewingsToConfirm, reviewsToAnswer] = await Promise.all([
    db.accommodationRequest.count({
      where: { listing: { companyId }, status: { in: ["SUBMITTED", "RECEIVED"] } },
    }),
    db.referral.count({
      where: { listing: { companyId }, status: { in: ["SUBMITTED", "RECEIVED"] } },
    }),
    db.clientShare.count({ where: { companyId, revokedAt: null } }),
    db.viewing.count({ where: { listing: { companyId }, status: "PROPOSED" } }),
    db.residentReview.count({ where: { companyId, hiddenAt: null, providerReply: null } }),
  ]);

  return [
    { href: "/provider", label: "Dashboard" },
    { href: "/provider/adverts", label: "My adverts" },
    { href: "/provider/rooms", label: "Rooms" },
    { href: "/provider/requests", label: "Requests", badge: requests || undefined },
    { href: "/provider/referrals", label: "Referrals", badge: referrals || undefined },
    { href: "/provider/viewings", label: "Viewings", badge: viewingsToConfirm || undefined },
    { href: "/provider/clients", label: "Shared profiles", badge: sharedClients || undefined },
    { href: "/provider/reviews", label: "Reviews", badge: reviewsToAnswer || undefined },
    { href: "/messages", label: "Messages" },
    { href: "/people", label: "Find people" },
    { href: "/services", label: "Provider Services" },
    { href: "/provider/membership", label: "Membership" },
    { href: "/provider/accreditations", label: "Accreditations" },
    { href: "/provider/invite", label: "Refer & earn" },
    { href: "/provider/settings", label: "Company profile" },
  ];
}
