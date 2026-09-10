import { AccountStatus, Prisma, VerificationStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/rbac";
import { mailshotRecipientEmails } from "@/lib/audit";
import { shortDate } from "@/lib/format";
import { PrintButton } from "@/components/print-button";

export const metadata = { title: "Providers — printable report" };
export const dynamic = "force-dynamic";

/**
 * A bare, chrome-free report of the full (unpaginated) filtered Providers
 * list, meant to be exported to PDF via the browser's own Print → Save as
 * PDF. Mirrors the /admin/companies filters exactly, including the paid
 * plan and any admin-granted membership so it's a complete access record.
 */
export default async function AdminCompaniesPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; verification?: string; source?: string }>;
}) {
  await requireAdmin();
  const query = await searchParams;
  const q = query.q?.trim();
  const status = Object.values(AccountStatus).includes(query.status as AccountStatus) ? (query.status as AccountStatus) : undefined;
  const verification = Object.values(VerificationStatus).includes(query.verification as VerificationStatus)
    ? (query.verification as VerificationStatus)
    : undefined;
  const source = query.source === "MAILSHOT" || query.source === "ORGANIC" ? query.source : undefined;
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
    },
  });

  const filters = [
    q && `Search: "${q}"`,
    query.status && `Status: ${query.status.toLowerCase()}`,
    query.verification && `Verification: ${query.verification.replace(/_/g, " ").toLowerCase()}`,
    source && `Source: ${source.toLowerCase()}`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="mx-auto max-w-5xl px-6 py-8 print:max-w-none print:px-0 print:py-0">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-[22px]">Providers — printable report</h1>
          <p className="mt-1 text-[14px] text-ink-soft">
            Use your browser&apos;s Print dialog and choose &ldquo;Save as PDF&rdquo; to export this as a PDF.
          </p>
        </div>
        <PrintButton />
      </div>
      <h1 className="mb-1 hidden text-[16px] font-semibold print:block">RoomsNow — Providers export</h1>
      <p className="mb-4 text-[12px] text-ink-faint">
        {companies.length} record{companies.length === 1 ? "" : "s"} · Generated {shortDate(new Date())}
        {filters ? ` · ${filters}` : ""}
      </p>
      <table className="w-full border-collapse text-[11px]">
        <thead>
          <tr className="border-b border-ink text-left">
            <th className="py-2 pr-2 font-semibold">Name</th>
            <th className="py-2 pr-2 font-semibold">Email</th>
            <th className="py-2 pr-2 font-semibold">Phone</th>
            <th className="py-2 pr-2 font-semibold">City</th>
            <th className="py-2 pr-2 font-semibold">Source</th>
            <th className="py-2 pr-2 font-semibold">Paid plan</th>
            <th className="py-2 pr-2 font-semibold">Admin grant</th>
            <th className="py-2 font-semibold">Joined</th>
          </tr>
        </thead>
        <tbody>
          {companies.map((company) => {
            const paid = company.subscription && ["ACTIVE", "TRIALING", "PAST_DUE"].includes(company.subscription.status)
              ? company.subscription.membership.name
              : "Free";
            const grant = company.membershipGrants[0] ?? null;
            const fromMailshot = mailshotEmails.has(company.email.toLowerCase());
            return (
              <tr key={company.id} className="break-inside-avoid border-b border-line">
                <td className="py-1.5 pr-2">{company.name}</td>
                <td className="py-1.5 pr-2">{company.email}</td>
                <td className="py-1.5 pr-2">{company.phone ?? "—"}</td>
                <td className="py-1.5 pr-2">{company.city ?? "—"}</td>
                <td className="py-1.5 pr-2">{fromMailshot ? "Mailshot" : "Organic"}</td>
                <td className="py-1.5 pr-2">{paid}</td>
                <td className="py-1.5 pr-2">
                  {grant ? `${grant.membership.name}${grant.expiresAt ? ` · ends ${shortDate(grant.expiresAt)}` : " · no expiry"}` : "—"}
                </td>
                <td className="py-1.5">{shortDate(company.createdAt)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {companies.length === 0 && <p className="py-6 text-[13px] text-ink-faint">No providers matched this filter.</p>}
    </div>
  );
}
