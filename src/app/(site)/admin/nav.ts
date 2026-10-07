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
  // One query for every badge in the menu; this runs on every admin page.
  const [counts] = await db.$queryRaw<
    Array<Record<"pendingListings" | "pendingVerification" | "pendingAccreditations" | "openReports" | "newFeedback" | "marketplaceQueue" | "supportQueue", bigint>>
  >`
    SELECT
      (SELECT count(*) FROM "Listing" WHERE status::text = 'PENDING_REVIEW') AS "pendingListings",
      (SELECT count(*) FROM "VerificationRequest" WHERE status::text = 'PENDING') AS "pendingVerification",
      (SELECT count(*) FROM "ProviderAccreditation" WHERE status::text = 'UNDER_ASSESSMENT') AS "pendingAccreditations",
      (SELECT count(*) FROM "Report" WHERE status::text IN ('OPEN', 'REVIEWING') AND "detail" NOT LIKE ${`${FEEDBACK_MARKER}%`}) AS "openReports",
      (SELECT count(*) FROM "Report" WHERE status::text IN ('OPEN', 'REVIEWING') AND "detail" LIKE ${`${FEEDBACK_MARKER}%`}) AS "newFeedback",
      (
        (SELECT count(*) FROM "ServiceBusiness" WHERE status::text = 'PENDING_REVIEW')
        + (SELECT count(*) FROM "ServiceAdvert" WHERE status::text = 'PENDING_REVIEW')
        + (SELECT count(*) FROM "ServiceEvidence" e JOIN "ServiceBusiness" b ON b.id = e."businessId"
           WHERE e.status::text = 'PENDING' AND b.status::text IN ('PENDING_REVIEW', 'APPROVED'))
      ) AS "marketplaceQueue",
      (SELECT count(*) FROM "SupportOrganisation" WHERE status::text = 'PENDING') AS "supportQueue"
  `;
  const n = (value: bigint | number | null | undefined) => Number(value ?? 0);
  const pendingListings = n(counts?.pendingListings);
  const pendingVerification = n(counts?.pendingVerification);
  const pendingAccreditations = n(counts?.pendingAccreditations);
  const openReports = n(counts?.openReports);
  const newFeedback = n(counts?.newFeedback);
  const marketplaceQueue = n(counts?.marketplaceQueue);
  const supportQueue = n(counts?.supportQueue);

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
    { group: "Placements", href: "/admin/contact-activity", label: "Contact activity" },

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
