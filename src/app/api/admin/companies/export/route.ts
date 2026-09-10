import { AccountStatus, Prisma, VerificationStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/rbac";
import { audit, mailshotRecipientEmails } from "@/lib/audit";
import { csvResponse } from "@/lib/csv";

export const dynamic = "force-dynamic";

/**
 * CSV export of the Providers list, respecting whatever search/status/
 * verification/source filter is active on /admin/companies — mirrors that
 * page's query exactly, minus pagination, and includes both the paid plan
 * and any admin-granted membership so this is a complete access record,
 * not just a contact list.
 */
export async function GET(request: Request) {
  const admin = await requireAdmin();
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() || undefined;
  const statusParam = searchParams.get("status");
  const status = statusParam && Object.values(AccountStatus).includes(statusParam as AccountStatus) ? (statusParam as AccountStatus) : undefined;
  const verificationParam = searchParams.get("verification");
  const verification =
    verificationParam && Object.values(VerificationStatus).includes(verificationParam as VerificationStatus)
      ? (verificationParam as VerificationStatus)
      : undefined;
  const sourceParam = searchParams.get("source");
  const source = sourceParam === "MAILSHOT" || sourceParam === "ORGANIC" ? sourceParam : undefined;
  const now = new Date();

  const where: Prisma.CompanyWhereInput = {
    ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }, { city: { contains: q, mode: "insensitive" } }] } : {}),
    ...(status ? { status } : {}),
    ...(verification ? { verification } : {}),
  };

  const mailshotEmails = await mailshotRecipientEmails();
  if (source === "MAILSHOT") where.email = { in: Array.from(mailshotEmails) };
  if (source === "ORGANIC") where.email = { notIn: Array.from(mailshotEmails) };

  const companies = await db.company.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 20000,
    include: {
      subscription: { include: { membership: { select: { name: true } } } },
      membershipGrants: {
        where: {
          revokedAt: null,
          startsAt: { lte: now },
          membership: { audience: "PROVIDER", tier: { in: ["PROFESSIONAL", "BUSINESS"] } },
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { membership: { select: { name: true } } },
      },
      _count: { select: { listings: true, properties: true } },
    },
  });

  await audit({
    actorId: admin.id,
    action: "admin.providers_exported",
    metadata: { count: companies.length, q, status, verification, source },
  });

  const columns = [
    "Name",
    "Trading name",
    "Email",
    "Phone",
    "City",
    "Status",
    "Verification",
    "Source",
    "Paid plan",
    "Admin grant",
    "Grant expires",
    "Boost credits",
    "Adverts",
    "Properties",
    "Joined",
  ];
  const rows = companies.map((company) => {
    const paid = company.subscription && ["ACTIVE", "TRIALING", "PAST_DUE"].includes(company.subscription.status)
      ? company.subscription.membership.name
      : "Free";
    const grant = company.membershipGrants[0] ?? null;
    const fromMailshot = mailshotEmails.has(company.email.toLowerCase());
    return [
      company.name,
      company.tradingName ?? "",
      company.email,
      company.phone ?? "",
      company.city ?? "",
      company.status,
      company.verification,
      fromMailshot ? "Mailshot" : "Organic",
      paid,
      grant?.membership.name ?? "",
      grant ? (grant.expiresAt ? grant.expiresAt.toISOString().slice(0, 10) : "No expiry") : "",
      company.boostCredits,
      company._count.listings,
      company._count.properties,
      company.createdAt.toISOString().slice(0, 10),
    ];
  });

  return csvResponse(`roomsnow-providers-${new Date().toISOString().slice(0, 10)}.csv`, columns, rows);
}
