import Link from "next/link";
import { Prisma, VerificationStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/rbac";
import { DashboardShell } from "@/components/dashboard-shell";
import { EmptyState } from "@/components/ui";
import { VerificationDecision } from "@/components/admin-controls";
import { AdminFilters, AdminFilterField } from "@/components/admin-filters";
import { AdminPagination, ADMIN_PAGE_SIZE, pageNumber } from "@/components/admin-pagination";
import { adminNav } from "../nav";
import { shortDate } from "@/lib/format";
import { REQUIRED_VERIFICATION_DOCUMENTS, VERIFICATION_CATEGORY_LABELS } from "@/lib/verification";

export const metadata = { title: "Verification" };
export const dynamic = "force-dynamic";

type Search = { q?: string; status?: string; evidence?: string; sort?: string; page?: string };

const statusStyles: Record<VerificationStatus, string> = {
  NOT_REQUESTED: "border-line bg-paper text-ink-soft",
  PENDING: "border-blue-200 bg-blue-50 text-blue-800",
  APPROVED: "border-emerald-200 bg-emerald-50 text-emerald-800",
  REJECTED: "border-red-200 bg-red-50 text-red-700",
};

function statusLabel(status: VerificationStatus) {
  return status.replace(/_/g, " ").toLowerCase();
}

function filterHref(query: Search, status?: VerificationStatus) {
  const params = new URLSearchParams();
  if (query.q?.trim()) params.set("q", query.q.trim());
  if (status) params.set("status", status);
  if (query.evidence === "complete" || query.evidence === "missing") params.set("evidence", query.evidence);
  if (query.sort === "oldest") params.set("sort", "oldest");
  const value = params.toString();
  return value ? `?${value}` : "?";
}

export default async function AdminVerificationPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requireAdmin();
  const query = await searchParams;
  const q = query.q?.trim();
  const status = Object.values(VerificationStatus).includes(query.status as VerificationStatus)
    ? query.status as VerificationStatus
    : undefined;
  const evidence = query.evidence === "complete" || query.evidence === "missing" ? query.evidence : undefined;
  const sort = query.sort === "oldest" ? "oldest" : "newest";
  const page = pageNumber(query.page);
  const requiredEvidence: Prisma.VerificationRequestWhereInput[] = REQUIRED_VERIFICATION_DOCUMENTS.map((required) => ({
    documents: { some: { category: required.category } },
  }));
  const where: Prisma.VerificationRequestWhereInput = {
    ...(q ? {
      OR: [
        { company: { name: { contains: q, mode: "insensitive" } } },
        { company: { email: { contains: q, mode: "insensitive" } } },
        { company: { registrationNumber: { contains: q, mode: "insensitive" } } },
      ],
    } : {}),
    ...(status ? { status } : {}),
    ...(evidence === "complete" ? { AND: requiredEvidence } : {}),
    ...(evidence === "missing" ? { NOT: { AND: requiredEvidence } } : {}),
  };

  const [nav, requests, total, statusCounts] = await Promise.all([
    adminNav(),
    db.verificationRequest.findMany({
      where,
      orderBy: { createdAt: sort === "oldest" ? "asc" : "desc" },
      skip: (page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE,
      include: {
        company: { select: { id: true, name: true, slug: true, email: true, registrationNumber: true, website: true } },
        documents: { select: { id: true, name: true, category: true, createdAt: true }, orderBy: { createdAt: "asc" } },
      },
    }),
    db.verificationRequest.count({ where }),
    db.verificationRequest.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  const counts = new Map(statusCounts.map((item) => [item.status, item._count._all]));
  const allCount = statusCounts.reduce((sum, item) => sum + item._count._all, 0);

  return (
    <DashboardShell
      title="Verification"
      subtitle="Search, filter and review provider due-diligence evidence from one compact queue."
      nav={nav}
      active="/admin/verification"
    >
      <nav aria-label="Verification status" className="mb-3 flex gap-2 overflow-x-auto pb-1">
        <Link href={filterHref(query)} className={`shrink-0 rounded-full border px-3 py-1.5 text-[12px] font-semibold ${!status ? "border-brand bg-brand text-white" : "border-line bg-white text-ink-soft hover:border-blue-300"}`}>
          All <span className="ml-1 opacity-75">{allCount}</span>
        </Link>
        {(["PENDING", "APPROVED", "REJECTED"] as VerificationStatus[]).map((value) => (
          <Link key={value} href={filterHref(query, value)} className={`shrink-0 rounded-full border px-3 py-1.5 text-[12px] font-semibold capitalize ${status === value ? "border-brand bg-brand text-white" : "border-line bg-white text-ink-soft hover:border-blue-300"}`}>
            {statusLabel(value)} <span className="ml-1 opacity-75">{counts.get(value) ?? 0}</span>
          </Link>
        ))}
      </nav>

      <AdminFilters>
        <AdminFilterField label="Search provider" wide>
          <input className="field" name="q" defaultValue={q} placeholder="Company, email or registration no." />
        </AdminFilterField>
        <AdminFilterField label="Status">
          <select className="field" name="status" defaultValue={status ?? ""}>
            <option value="">All statuses</option>
            {(["PENDING", "APPROVED", "REJECTED"] as VerificationStatus[]).map((value) => <option key={value} value={value}>{statusLabel(value)}</option>)}
          </select>
        </AdminFilterField>
        <AdminFilterField label="Evidence pack">
          <select className="field" name="evidence" defaultValue={evidence ?? ""}>
            <option value="">Any completeness</option>
            <option value="complete">Complete</option>
            <option value="missing">Missing documents</option>
          </select>
        </AdminFilterField>
        <AdminFilterField label="Submitted">
          <select className="field" name="sort" defaultValue={sort}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </AdminFilterField>
      </AdminFilters>

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-[13px] text-ink-faint">{total.toLocaleString()} matching verification{total === 1 ? "" : "s"}</p>
        <p className="hidden text-[12px] text-ink-faint sm:block">Select a row to inspect its documents and review checklist.</p>
      </div>

      {requests.length === 0 ? (
        <div className="mt-3"><EmptyState title="No matching verifications" body="Try clearing a filter or search term." /></div>
      ) : (
        <ul className="mt-3 space-y-2">
          {requests.map((request) => {
            const presentCategories = new Set(request.documents.map((document) => document.category));
            const presentRequired = REQUIRED_VERIFICATION_DOCUMENTS.filter((required) => presentCategories.has(required.category)).length;
            const complete = presentRequired === REQUIRED_VERIFICATION_DOCUMENTS.length;
            return (
              <li key={request.id}>
                <details className="group rounded-card border border-line bg-white shadow-sm open:border-blue-200 open:shadow-card">
                  <summary className="relative grid cursor-pointer list-none items-center gap-2 px-3 py-3 marker:hidden sm:grid-cols-[minmax(0,1fr)_130px_130px_116px_22px] sm:px-4 [&::-webkit-details-marker]:hidden">
                    <div className="min-w-0 pr-8 sm:pr-0">
                      <p className="truncate text-[14px] font-semibold text-ink">{request.company.name}</p>
                      <p className="truncate text-[12px] text-ink-faint">{request.company.email} · {request.company.registrationNumber ?? "No registration no."}</p>
                    </div>
                    <div className="flex items-center gap-2 sm:block">
                      <span className="text-[11px] text-ink-faint sm:block">Submitted</span>
                      <span className="text-[12px] text-ink-soft">{shortDate(request.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-2 sm:block">
                      <span className="text-[11px] text-ink-faint sm:block">Required evidence</span>
                      <span className={`text-[12px] font-semibold ${complete ? "text-emerald-700" : "text-amber-700"}`}>{presentRequired}/{REQUIRED_VERIFICATION_DOCUMENTS.length} {complete ? "complete" : "received"}</span>
                    </div>
                    <span className={`w-fit rounded-full border px-2 py-1 text-[11px] font-semibold capitalize ${statusStyles[request.status]}`}>{statusLabel(request.status)}</span>
                    <span aria-hidden="true" className="absolute right-4 top-4 text-[18px] text-ink-faint transition-transform group-open:rotate-180 sm:static">⌄</span>
                  </summary>

                  <div className="border-t border-line px-3 py-4 sm:px-4">
                    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px]">
                          <Link href={`/companies/${request.company.slug}`} className="font-semibold text-brand hover:underline">View provider profile</Link>
                          {request.company.website ? <a href={request.company.website} target="_blank" rel="noreferrer" className="text-ink-soft hover:text-brand hover:underline">Company website</a> : null}
                          {request.insuranceExpiresAt ? <span className="text-ink-soft">Insurance expires {shortDate(request.insuranceExpiresAt)}</span> : null}
                        </div>
                        {request.note ? <p className="mt-3 rounded-[10px] bg-paper px-3 py-2 text-[13px] text-ink-soft"><span className="font-semibold text-ink">Provider note:</span> {request.note}</p> : null}

                        <h2 className="mt-4 text-[13px] font-semibold">Evidence documents</h2>
                        <ul className="mt-2 grid gap-2 md:grid-cols-2">
                          {REQUIRED_VERIFICATION_DOCUMENTS.map((required) => {
                            const document = request.documents.find((item) => item.category === required.category);
                            return (
                              <li key={required.category} className={`rounded-[10px] border px-3 py-2 ${document ? "border-line bg-white" : "border-amber-200 bg-amber-50"}`}>
                                <span className="block text-[11px] font-semibold uppercase tracking-wide text-ink-faint">{required.label}</span>
                                {document ? <a href={`/api/documents/${document.id}`} target="_blank" className="mt-0.5 block truncate text-[13px] text-brand hover:underline" title={document.name}>{document.name}</a> : <span className="mt-0.5 block text-[12px] font-semibold text-amber-800">Missing</span>}
                              </li>
                            );
                          })}
                          {request.documents.filter((document) => !REQUIRED_VERIFICATION_DOCUMENTS.some((required) => required.category === document.category)).map((document) => (
                            <li key={document.id} className="rounded-[10px] border border-line bg-white px-3 py-2">
                              <span className="block text-[11px] font-semibold uppercase tracking-wide text-ink-faint">{VERIFICATION_CATEGORY_LABELS[document.category ?? ""] ?? "Additional evidence"}</span>
                              <a href={`/api/documents/${document.id}`} target="_blank" className="mt-0.5 block truncate text-[13px] text-brand hover:underline" title={document.name}>{document.name}</a>
                            </li>
                          ))}
                        </ul>
                        {request.reviewNote ? <p className="mt-3 text-[13px] text-ink-soft"><span className="font-semibold text-ink">Review note:</span> {request.reviewNote}</p> : null}
                      </div>

                      {request.status === "PENDING" ? (
                        <VerificationDecision id={request.id} requiredDocumentsPresent={complete} />
                      ) : (
                        <div className="rounded-[10px] border border-line bg-paper p-3 text-[13px] text-ink-soft">
                          <p className="font-semibold capitalize text-ink">Review {statusLabel(request.status)}</p>
                          <p className="mt-1">Reviewed {request.reviewedAt ? shortDate(request.reviewedAt) : "previously"}.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
      )}
      <AdminPagination page={page} total={total} query={{ q, status, evidence, sort }} />
    </DashboardShell>
  );
}
