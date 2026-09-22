import { requireReferrer } from "@/lib/rbac";
import { referrerPlanLimits } from "@/lib/billing";
import { DashboardShell } from "@/components/dashboard-shell";
import { ImportClientsForm } from "@/components/import-clients-form";
import { SUPPORT_TYPES } from "@/lib/taxonomy";
import { referrerNav } from "../../nav";

export const metadata = { title: "Upload clients" };
export const dynamic = "force-dynamic";

const COLUMNS: { name: string; note: string; required?: boolean }[] = [
  { name: "First name", note: "or a single “Name” column", required: true },
  { name: "Last name", note: "“Surname” works too", required: true },
  { name: "Date of birth", note: "DD/MM/YYYY" },
  { name: "Phone", note: "" },
  { name: "Email", note: "" },
  { name: "Preferred area", note: "town, city or area" },
  { name: "Support types", note: "separate several with ;" },
  { name: "Accommodation needs", note: "" },
  { name: "Support needs", note: "" },
  { name: "Status", note: "Active, Placed or Archived" },
  { name: "Private notes", note: "never shared" },
];

export default async function ImportClientsPage() {
  const user = await requireReferrer();
  const [nav, limits] = await Promise.all([referrerNav(user.id), referrerPlanLimits(user.id)]);
  const room = limits.membership.maxClients === -1 ? null : Math.max(0, limits.membership.maxClients - limits.used.clients);

  return (
    <DashboardShell
      title="Upload your caseload"
      subtitle="Add many clients at once from Excel, Google Sheets or your case-management system. Nothing is shared with anyone until you choose to."
      nav={nav}
      active="/referrals/clients"
      action={
        <a href="/api/referrals/clients/template" className="btn-secondary">Download template</a>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <ImportClientsForm />

        <aside className="space-y-4">
          {room !== null && (
            <div className="card p-5">
              <p className="text-[13px] text-ink-faint">Room on your {limits.membership.name} plan</p>
              <p className="mt-1 font-display text-[28px] leading-none tabular-nums">{room}</p>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
                active client{room === 1 ? "" : "s"}. Anyone over that is added as Archived, so nothing in your file is lost.
              </p>
            </div>
          )}

          <div className="card p-5">
            <h2 className="text-[16px]">Columns we read</h2>
            <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">
              Put these in the first row. Order doesn&apos;t matter, and anything else is ignored.
            </p>
            <dl className="mt-3 space-y-2 text-[14px]">
              {COLUMNS.map((column) => (
                <div key={column.name} className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <dt className="font-medium text-ink">
                    {column.name}
                    {column.required && <span className="ml-1 text-clay">*</span>}
                  </dt>
                  {column.note && <dd className="text-[12.5px] text-ink-faint">{column.note}</dd>}
                </div>
              ))}
            </dl>
            <p className="mt-4 text-[12.5px] leading-relaxed text-ink-faint">
              Support types we recognise: {SUPPORT_TYPES.map((t) => t.label).join(", ")}.
            </p>
          </div>
        </aside>
      </div>
    </DashboardShell>
  );
}
