import { AccountStatus, Prisma, VerificationStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/rbac";
import { mailshotRecipientEmails } from "@/lib/audit";
import { DashboardShell } from "@/components/dashboard-shell";
import { AdminFilters, AdminFilterField } from "@/components/admin-filters";
import { ProviderMailshotForm } from "@/components/provider-mailshot-form";
import { adminNav } from "../nav";

export const metadata = { title: "Provider mailshot" };
export const dynamic = "force-dynamic";

/**
 * The AIO mailshot to already-registered providers (promo codes, news and
 * updates) — separate from /admin/pre-launch-invite, which reaches people
 * who haven't signed up yet. Filters here (status/verification/source)
 * decide the recipient set; the count shown is always live against them.
 */
export default async function ProviderMailshotPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; verification?: string; source?: string }>;
}) {
  await requireAdmin();
  const query = await searchParams;
  const status = Object.values(AccountStatus).includes(query.status as AccountStatus) ? (query.status as AccountStatus) : "ACTIVE";
  const verification = Object.values(VerificationStatus).includes(query.verification as VerificationStatus)
    ? (query.verification as VerificationStatus)
    : undefined;
  const source = query.source === "MAILSHOT" || query.source === "ORGANIC" ? query.source : undefined;

  const where: Prisma.CompanyWhereInput = {
    status,
    ...(verification ? { verification } : {}),
  };
  if (source) {
    const mailshotEmails = await mailshotRecipientEmails();
    if (source === "MAILSHOT") where.email = { in: Array.from(mailshotEmails) };
    if (source === "ORGANIC") where.email = { notIn: Array.from(mailshotEmails) };
  }

  const [nav, recipientCount] = await Promise.all([adminNav(), db.company.count({ where })]);

  return (
    <DashboardShell
      title="Provider mailshot"
      subtitle="Send promotional codes, news or platform updates to your existing registered providers."
      nav={nav}
      active="/admin/provider-mailshot"
    >
      <div className="grid items-start gap-6 lg:grid-cols-[.85fr_1.15fr]">
        <div className="space-y-4">
          <AdminFilters>
            <AdminFilterField label="Account status">
              <select className="field" name="status" defaultValue={status}>
                {Object.values(AccountStatus).map((value) => (
                  <option key={value} value={value}>
                    {value.toLowerCase()}
                  </option>
                ))}
              </select>
            </AdminFilterField>
            <AdminFilterField label="Verification">
              <select className="field" name="verification" defaultValue={verification ?? ""}>
                <option value="">All verification</option>
                {Object.values(VerificationStatus).map((value) => (
                  <option key={value} value={value}>
                    {value.replace(/_/g, " ").toLowerCase()}
                  </option>
                ))}
              </select>
            </AdminFilterField>
            <AdminFilterField label="Source">
              <select className="field" name="source" defaultValue={source ?? ""}>
                <option value="">All sources</option>
                <option value="MAILSHOT">Mailshot</option>
                <option value="ORGANIC">Organic</option>
              </select>
            </AdminFilterField>
          </AdminFilters>
          <div className="card space-y-2 p-4 text-[13px] leading-relaxed text-ink-soft">
            <p className="font-medium text-ink">Who this reaches</p>
            <p>
              Every registered provider account matching the filters above — defaults to active
              accounts only. This is separate from the pre-launch mailshot, which reaches people
              who haven&apos;t registered yet, not existing accounts.
            </p>
            <p>Apply the filters, then the form on the right always sends to whatever it counts.</p>
          </div>
        </div>
        <ProviderMailshotForm filters={{ status, verification, source }} recipientCount={recipientCount} />
      </div>
    </DashboardShell>
  );
}
