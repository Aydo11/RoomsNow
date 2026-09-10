import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/rbac";
import { hasAdminPermission } from "@/lib/admin-permissions";
import type { NavItem } from "@/components/dashboard-shell";
import { FEEDBACK_MARKER } from "@/lib/feedback";

export async function adminNav(): Promise<NavItem[]> {
  const user = await requireAdmin("MODERATION");
  if (!hasAdminPermission(user)) return [
    { href: "/admin/listings", label: "Adverts" },
    { href: "/admin/reports", label: "Reports" },
  ];
  const [pendingListings, pendingVerification, openReports, newFeedback] = await Promise.all([
    db.listing.count({ where: { status: "PENDING_REVIEW" } }),
    db.verificationRequest.count({ where: { status: "PENDING" } }),
    db.report.count({ where: { status: { in: ["OPEN", "REVIEWING"] }, NOT: { detail: { startsWith: FEEDBACK_MARKER } } } }),
    db.report.count({ where: { status: { in: ["OPEN", "REVIEWING"] }, detail: { startsWith: FEEDBACK_MARKER } } }),
  ]);

  return [
    { href: "/admin", label: "Overview" },
    { href: "/admin/listings", label: "Adverts", badge: pendingListings || undefined },
    { href: "/admin/verification", label: "Verification", badge: pendingVerification || undefined },
    { href: "/admin/reports", label: "Reports", badge: openReports || undefined },
    { href: "/admin/feedback", label: "Site feedback", badge: newFeedback || undefined },
    { href: "/admin/users", label: "Users" },
    { href: "/admin/team", label: "Team & permissions" },
    { href: "/admin/companies", label: "Providers" },
    { href: "/admin/requests", label: "Requests" },
    { href: "/admin/referrals", label: "Referrals" },
    { href: "/admin/memberships", label: "Memberships" },
    { href: "/admin/pre-launch-invite", label: "Pre-launch invite" },
    { href: "/admin/categories", label: "Categories" },
    { href: "/admin/audit", label: "Audit log" },
  ];
}
