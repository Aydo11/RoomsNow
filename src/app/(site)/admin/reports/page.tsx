import Link from "next/link";
import { Prisma, ReportStatus, ReportTargetType } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/rbac";
import { DashboardShell, DataTable } from "@/components/dashboard-shell";
import { EmptyState } from "@/components/ui";
import { AdminFilters, AdminFilterField } from "@/components/admin-filters";
import { AdminPagination, ADMIN_PAGE_SIZE, pageNumber } from "@/components/admin-pagination";
import { adminNav } from "../nav";
import { FEEDBACK_MARKER } from "@/lib/feedback";
import { shortDate } from "@/lib/format";

export const metadata = { title: "Reports" };
export const dynamic = "force-dynamic";

type Search = { page?: string; status?: string; targetType?: string; archive?: string; from?: string; to?: string };

function dateBoundary(value: string | undefined, end = false) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(`${value}T${end ? "23:59:59.999" : "00:00:00.000"}Z`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export default async function AdminReportsPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requireAdmin("MODERATION");
  const query = await searchParams;
  const page = pageNumber(query.page);
  const status = Object.values(ReportStatus).includes(query.status as ReportStatus) ? query.status as ReportStatus : undefined;
  const targetType = Object.values(ReportTargetType).includes(query.targetType as ReportTargetType)
    ? query.targetType as ReportTargetType
    : undefined;
  const archive = query.archive === "archived" ? "archived" : query.archive === "all" ? "all" : "active";
  const from = dateBoundary(query.from);
  const to = dateBoundary(query.to, true);
  const where: Prisma.ReportWhereInput = {
    NOT: { detail: { startsWith: FEEDBACK_MARKER } },
    ...(status ? { status } : {}),
    ...(targetType ? { targetType } : {}),
    ...(archive === "active" ? { archivedAt: null } : archive === "archived" ? { archivedAt: { not: null } } : {}),
    ...(from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
  };

  const [nav, reports, total] = await Promise.all([
    adminNav(),
    db.report.findMany({
      where,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      skip: (page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE,
      include: { reporter: { select: { firstName: true, lastName: true, email: true } } },
    }),
    db.report.count({ where }),
  ]);

  return (
    <DashboardShell title="Reports" subtitle="Moderation cases, evidence, decisions and dated history." nav={nav} active="/admin/reports">
      <AdminFilters>
        <AdminFilterField label="Status">
          <select className="field" name="status" defaultValue={status ?? ""}>
            <option value="">All statuses</option>
            {Object.values(ReportStatus).map((value) => <option key={value} value={value}>{value.replace(/_/g, " ").toLowerCase()}</option>)}
          </select>
        </AdminFilterField>
        <AdminFilterField label="Reported item">
          <select className="field" name="targetType" defaultValue={targetType ?? ""}>
            <option value="">All item types</option>
            {Object.values(ReportTargetType).map((value) => <option key={value} value={value}>{value.replace(/_/g, " ").toLowerCase()}</option>)}
          </select>
        </AdminFilterField>
        <AdminFilterField label="Case location">
          <select className="field" name="archive" defaultValue={archive}>
            <option value="active">Active cases</option>
            <option value="archived">Archive</option>
            <option value="all">Active and archived</option>
          </select>
        </AdminFilterField>
        <AdminFilterField label="Reported from"><input className="field" type="date" name="from" defaultValue={query.from} /></AdminFilterField>
        <AdminFilterField label="Reported to"><input className="field" type="date" name="to" defaultValue={query.to} /></AdminFilterField>
      </AdminFilters>

      <div className="mt-4">
        {reports.length === 0 ? <EmptyState title="No matching reports" body="Try clearing or changing the filters." /> : (
          <DataTable compact head={["Reported", "Reason", "Item", "Reporter", "Status", ""]}>
            {reports.map((report) => (
              <tr key={report.id}>
                <td className="px-4 py-3 text-ink-soft">{shortDate(report.createdAt)}</td>
                <td className="max-w-[260px] px-4 py-3">
                  <span className="block truncate">{report.reason.replace(/_/g, " ").toLowerCase()}</span>
                  {report.detail ? <span className="block truncate text-[12px] text-ink-faint">{report.detail}</span> : null}
                </td>
                <td className="px-4 py-3 capitalize">{report.targetType.replace(/_/g, " ").toLowerCase()}</td>
                <td className="px-4 py-3">
                  <span className="block">{report.reporter.firstName} {report.reporter.lastName}</span>
                  <span className="block text-[12px] text-ink-faint">{report.reporter.email}</span>
                </td>
                <td className="px-4 py-3 capitalize text-ink-soft">
                  {report.status.toLowerCase()}{report.archivedAt ? " · archived" : ""}
                </td>
                <td className="px-4 py-3 text-right"><Link prefetch={false} className="btn-secondary" href={`/admin/reports/${report.id}`}>Open case</Link></td>
              </tr>
            ))}
          </DataTable>
        )}
        <AdminPagination page={page} total={total} query={{ status, targetType, archive, from: query.from, to: query.to }} />
      </div>
    </DashboardShell>
  );
}
