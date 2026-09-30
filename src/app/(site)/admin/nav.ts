import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/rbac";
import { hasAdminPermission } from "@/lib/admin-permissions";
import type { NavItem } from "@/components/dashboard-shell";
import { FEEDBACK_MARKER } from "@/lib/feedback";

export async function adminNav(): Promise<NavItem[]> {
  const user = await requireAdmin("MODERATION");
  if (!hasAdminPermission(user)) return [
    { group: "To review", href: "/admin/listings", label: "Adverts" },
    { group: "To review", href: "/admin/reports", label: "Reports" },
    { group: "To review", href: "/admin/reviews", label: "Resident reviews" },
    { group: "Directory", href: "/admin/marketplace", label: "Services marketplace" },
    { group: "Directory", href: "/admin/support-services", label: "Support services" },
  ];
  const [pendingListings, pendingVerification, pendingAccreditations, openReports, newFeedback, marketplaceQueue, supportQueue] = await Promise.all([
    db.listing.count({ where: { status: "PENDING_REVIEW" } }),
    db.verificationRequest.count({ where: { status: "PENDING" } }),
    db.providerAccreditation.count({ where: { status: "UNDER_ASSESSMENT" } }),
    db.report.count({ where: { status: { in: ["OPEN", "REVIEWING"] }, NOT: { detail: { startsWith: FEEDBACK_MARKER } } } }),
    db.report.count({ where: { status: { in: ["OPEN", "REVIEWING"] }, detail: { startsWith: FEEDBACK_MARKER } } }),
    Promise.all([
      db.serviceBusiness.count({ where: { status: "PENDING_REVIEW" } }),
      db.serviceAdvert.count({ where: { status: "PENDING_REVIEW" } }),
      db.serviceEvidence.count({ where: { status: "PENDING", business: { status: { in: ["PENDING_REVIEW", "APPROVED"] } } } }),
    ]).then((counts) => counts.reduce((sum, n) => sum + n, 0)),
    db.supportOrganisation.count({ where: { status: "PENDING" } }),
  ]);

  // Grouped so the menu reads as a few clear areas rather than one long list.
  return [
    { href: "/admin", label: "Overview" },

    { group: "To review", href: "/admin/listings", label: "Adverts", badge: pendingListings || undefined },
    { group: "To review", href: "/admin/verification", label: "Verification", badge: pendingVerification || undefined },
    { group: "To review", href: "/admin/accreditations", label: "Accreditations", badge: pendingAccreditations || undefined },
    { group: "To review", href: "/admin/reports", label: "Reports", badge: openReports || undefined },
    { group: "To review", href: "/admin/reviews", label: "Resident reviews" },
    { group: "To review", href: "/admin/feedback", label: "Site feedback", badge: newFeedback || undefined },

    { group: "Accounts", href: "/admin/users", label: "Users" },
    { group: "Accounts", href: "/admin/companies", label: "Providers" },
    { group: "Accounts", href: "/admin/memberships", label: "Memberships" },
    { group: "Accounts", href: "/admin/council-access", label: "Council access" },
    { group: "Accounts", href: "/admin/team", label: "Team & permissions" },

    { group: "Placements", href: "/admin/requests", label: "Requests" },
    { group: "Placements", href: "/admin/referrals", label: "Referrals" },

    { group: "Directory", href: "/admin/marketplace", label: "Services marketplace", badge: marketplaceQueue || undefined },
    { group: "Directory", href: "/admin/support-services", label: "Support services", badge: supportQueue || undefined },
    { group: "Directory", href: "/admin/categories", label: "Categories" },

    {
      group: "Growth",
      href: "/admin/seeker-mailshot",
      label: "Email campaigns",
      also: ["/admin/provider-mailshot", "/admin/pre-launch-invite"],
    },
    { group: "Growth", href: "/admin/provider-referrals", label: "Provider referrals" },
    { group: "Growth", href: "/admin/acquisition-sources", label: "Acquisition sources" },

    { group: "System", href: "/admin/audit", label: "Audit log" },
  ];
}
