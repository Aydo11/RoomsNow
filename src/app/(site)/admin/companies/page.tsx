import Link from "next/link";
import { AccountStatus, Prisma, VerificationStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/rbac";
import { mailshotRecipientEmails } from "@/lib/audit";
import { DashboardShell, DataTable } from "@/components/dashboard-shell";
import { AccountToggle } from "@/components/admin-controls";
import { AdminFilters, AdminFilterField } from "@/components/admin-filters";
import { adminNav } from "../nav";
import { shortDate } from "@/lib/format";
import { AdminPagination, ADMIN_PAGE_SIZE, pageNumber } from "@/components/admin-pagination";
import { highestProviderMembership } from "@/lib/membership-access";

export const metadata = { title: "Providers" };
export const dynamic = "force-dynamic";

export default async function AdminCompaniesPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; verification?: string; source?: string; page?: string }> }) {
  await requireAdmin();
  const query = await searchParams;
  const q = query.q?.trim();
  const status = Object.values(AccountStatus).includes(query.status as AccountStatus) ? query.status as AccountStatus : undefined;
  const verification = Object.values(VerificationStatus).includes(query.verification as VerificationStatus) ? query.verification as VerificationStatus : undefined;
  const source = query.source === "MAILSHOT" || query.source === "ORGANIC" ? query.source : undefined;
  const page = pageNumber(query.page);
  const now = new Date();
  const where: Prisma.CompanyWhereInput = {
    ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }, { city: { contains: q, mode: "insensitive" } }] } : {}),
    ...(status ? { status } : {}),
    ...(verification ? { verification } : {}),
  };

  // Company/User emails are always stored lowercase (see the shared `email` schema in
  // lib/validation.ts), and mailshotRecipientEmails() returns lowercase addresses too,
  // so a plain in/notIn match is reliable here without needing case-insensitive mode.
  const mailshotEmails = await mailshotRecipientEmails();
  if (source === "MAILSHOT") where.email = { in: Array.from(mailshotEmails) };
  if (source === "ORGANIC") where.email = { notIn: Array.from(mailshotEmails) };

  const [nav, companies, total] = await Promise.all([
    adminNav(),
    db.company.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE,
      include: {
        subscription: { include: { membership: { select: { id: true, name: true, tier: true } } } },
        membershipGrants: {
          where: {
            revokedAt: null,
            startsAt: { lte: now },
            membership: { audience: "PROVIDER", tier: { in: ["PROFESSIONAL", "BUSINESS"] } },
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
          },
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { membership: { select: { id: true, name: true, tier: true } } },
        },
        _count: { select: { listings: true, properties: true } },
      },
    }),
    db.company.count({ where }),
  ]);

  const exportQuery = new URLSearchParams();
  if (q) exportQuery.set("q", q);
  if (status) exportQuery.set("status", status);
  if (verification) exportQuery.set("verification", verification);
  if (source) exportQuery.set("source", source);
  const exportQs = exportQuery.toString() ? `?${exportQuery.toString()}` : "";

  return (
    <DashboardShell
      title="Providers"
      subtitle="Search and filter provider accounts before taking action."
      nav={nav}
      active="/admin/companies"
      action={
        <div className="flex gap-2">
          <Link href={`/api/admin/companies/export${exportQs}`} className="btn-secondary" prefetch={false}>
            Export CSV
          </Link>
          <Link href={`/admin/companies/print${exportQs}`} className="btn-secondary" prefetch={false}>
            Export PDF
          </Link>
        </div>
      }
    >
      <AdminFilters>
        <AdminFilterField label="Search" wide><input className="field" name="q" defaultValue={q} placeholder="Name, email or city" /></AdminFilterField>
        <AdminFilterField label="Account status"><select className="field" name="status" defaultValue={status ?? ""}><option value="">All statuses</option>{Object.values(AccountStatus).map((value) => <option key={value} value={value}>{value.toLowerCase()}</option>)}</select></AdminFilterField>
        <AdminFilterField label="Verification"><select className="field" name="verification" defaultValue={verification ?? ""}><option value="">All verification</option>{Object.values(VerificationStatus).map((value) => <option key={value} value={value}>{value.replace(/_/g, " ").toLowerCase()}</option>)}</select></AdminFilterField>
        <AdminFilterField label="Source">
          <select className="field" name="source" defaultValue={source ?? ""}>
            <option value="">All sources</option>
            <option value="MAILSHOT">Mailshot</option>
            <option value="ORGANIC">Organic</option>
          </select>
        </AdminFilterField>
      </AdminFilters>
      <div className="mt-4">
        <DataTable compact head={["Provider", "Source", "Plan", "Adverts", "Verification", "Status", "Joined", ""]}>
          {companies.map((company) => {
            const paid = company.subscription && ["ACTIVE", "TRIALING", "PAST_DUE"].includes(company.subscription.status)
              ? company.subscription.membership
              : null;
            const granted = company.membershipGrants[0]?.membership ?? null;
            const effective = highestProviderMembership(paid, granted, null);
            const fromMailshot = mailshotEmails.has(company.email.toLowerCase());
            return <tr key={company.id}>
              <td className="px-4 py-3">
                <Link href={`/companies/${company.slug}`} className="hover:text-pine-dark">
                  {company.name}
                </Link>
              </td>
              <td className="px-4 py-3">
                {fromMailshot ? (
                  <span className="inline-block rounded-full bg-pine-light px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-pine-dark">
                    Mailshot
                  </span>
                ) : (
                  <span className="text-[12px] text-ink-faint">Organic</span>
                )}
              </td>
              <td className="px-4 py-3 text-ink-soft">
                {effective?.name ?? "Free"}{granted?.id === effective?.id ? " (admin access)" : ""}
              </td>
              <td className="px-4 py-3">{company._count.listings}</td>
              <td className="px-4 py-3 capitalize text-ink-soft">
                {company.verification.replace(/_/g, " ").toLowerCase()}
              </td>
              <td className="px-4 py-3 capitalize text-ink-soft">{company.status.toLowerCase()}</td>
              <td className="px-4 py-3 text-ink-soft">{shortDate(company.createdAt)}</td>
              <td className="px-4 py-3 text-right">
                <AccountToggle kind="company" id={company.id} status={company.status} />
              </td>
            </tr>;
          })}
        </DataTable>
        <AdminPagination page={page} total={total} query={{ q, status, verification, source }} />
      </div>
    </DashboardShell>
  );
}
