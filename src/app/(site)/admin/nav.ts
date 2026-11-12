import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/rbac";
import { hasAdminPermission } from "@/lib/admin-permissions";
import type { NavItem } from "@/components/dashboard-shell";
import { FEEDBACK_MARKER } from "@/lib/feedback";

export async function adminNav(): Promise<NavItem[]> {
  const user = await requireAdmin(["MODERATION", "NEWS"]);
  if (!hasAdminPermission(user, "MODERATION")) return [{ href: "/admin/news", label: "News & charities" }];
  if (!hasAdminPermission(user)) return [
    { group: "To review", href: "/admin/listings", label: "Adverts" },
    { group: "To review", href: "/admin/reports", label: "Reports" },
    { group: "To review", href: "/admin/reviews", label: "Resident reviews" },
    { group: "Directory", href: "/admin/marketplace", label: "Services marketplace" },
    { group: "Directory", href: "/admin/support-services", label: "Support services" },
    { group: "Directory", href: "/admin/news", label: "News posts assigned to me" },
  ];
  // One query for every badge in the menu; this runs on every admin page.
  const [counts] = await db.$queryRaw<
    Array<Record<"pendingListings" | "pendingVerification" | "pendingAccreditations" | "openReports" | "newFeedback" | "marketplaceQueue" | "supportQueue" | "proEnquiries", bigint>>
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
      (SELECT count(*) FROM "SupportOrganisation" WHERE status::text = 'PENDING') AS "supportQueue",
      (SELECT count(*) FROM "ProServiceEnquiry" WHERE status = 'NEW') AS "proEnquiries"
  `;
  const n = (value: bigint | number | null | undefined) => Number(value ?? 0);
  const pendingListings = n(counts?.pendingListings);
  const pendingVerification = n(counts?.pendingVerification);
  const pendingAccreditations = n(counts?.pendingAccreditations);
  const openReports = n(counts?.openReports);
  const newFeedback = n(counts?.newFeedback);
  const marketplaceQueue = n(counts?.marketplaceQueue);
  const supportQueue = n(counts?.supportQueue);
  const proEnquiries = n(counts?.proEnquiries);

  // Five folding groups under Overview (grouping agreed with ChatGPT); the
  // group holding the current page opens and closed groups total their badges.
  const A = "Accommodation & referrals", M = "Moderation & verification", P = "Accounts & access", S = "Services & content", I = "Insights & audit";
  return [
    { href: "/admin", label: "Overview" },

    { group: A, href: "/admin/listings", label: "Adverts", badge: pendingListings || undefined },
    { group: A, href: "/admin/requests", label: "Requests" },
    { group: A, href: "/admin/referrals", label: "Referrals" },
    { group: A, href: "/admin/provider-referrals", label: "Provider referrals" },
    { group: A, href: "/admin/contact-activity", label: "Contact activity" },
    { group: A, href: "/admin/whatsapp-clicks", label: "WhatsApp enquiry log" },

    { group: M, href: "/admin/verification", label: "Verification", badge: pendingVerification || undefined },
    { group: M, href: "/admin/accreditations", label: "Accreditations", badge: pendingAccreditations || undefined },
    { group: M, href: "/admin/reports", label: "Reports", badge: openReports || undefined },
    { group: M, href: "/admin/safety-flags", label: "Safety flags" },
    { group: M, href: "/admin/stories", label: "Provider stories" },
    { group: M, href: "/admin/reviews", label: "Resident reviews" },
    { group: M, href: "/admin/feedback", label: "Site feedback", badge: newFeedback || undefined },

    { group: P, href: "/admin/users", label: "Users" },
    { group: P, href: "/admin/companies", label: "Providers" },
    { group: P, href: "/admin/memberships", label: "Memberships" },
    { group: P, href: "/admin/council-access", label: "Council access" },
    { group: P, href: "/admin/team", label: "Team & permissions" },

    { group: S, href: "/admin/pro-services", label: "Pro Services enquiries", badge: proEnquiries || undefined },
    { group: S, href: "/admin/marketplace", label: "Services marketplace", badge: marketplaceQueue || undefined },
    { group: S, href: "/admin/support-services", label: "Support services", badge: supportQueue || undefined },
    { group: S, href: "/admin/news", label: "News & charities" },
    { group: S, href: "/admin/spotlight", label: "Homepage spotlight" },
    { group: S, href: "/admin/categories", label: "Categories" },
    { group: S, href: "/admin/seeker-mailshot", label: "Email campaigns", also: ["/admin/provider-mailshot", "/admin/pre-launch-invite"] },

    { group: I, href: "/insights", label: "Area insights (public)" },
    { group: I, href: "/admin/acquisition-sources", label: "Acquisition sources" },
    { group: I, href: "/admin/top-providers", label: "Top providers" },
    { group: I, href: "/fastest-providers", label: "Fastest-replying league" },
    { group: I, href: "/admin/audit", label: "Audit log" },
  ];
}
