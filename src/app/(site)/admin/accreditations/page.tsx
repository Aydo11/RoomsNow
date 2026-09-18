import { AccreditationStatus, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/rbac";
import { shortDate } from "@/lib/format";
import { DashboardShell } from "@/components/dashboard-shell";
import { AdminFilters, AdminFilterField } from "@/components/admin-filters";
import { AccreditationBadge } from "@/components/badges";
import { AccreditationReview } from "@/components/accreditation-review";
import { EmptyState } from "@/components/ui";
import { adminNav } from "../nav";

export const metadata = { title: "Accreditations" };
export const dynamic = "force-dynamic";

type Search = { q?: string; status?: string; scheme?: string };

export default async function AdminAccreditationsPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requireAdmin("MODERATION");
  const query = await searchParams;
  const status = Object.values(AccreditationStatus).includes(query.status as AccreditationStatus) ? query.status as AccreditationStatus : undefined;
  const q = query.q?.trim();
  const where: Prisma.ProviderAccreditationWhereInput = {
    ...(status ? { status } : {}),
    ...(query.scheme ? { scheme: query.scheme } : {}),
    ...(q ? { OR: [
      { company: { name: { contains: q, mode: "insensitive" } } },
      { referenceNumber: { contains: q, mode: "insensitive" } },
      { name: { contains: q, mode: "insensitive" } },
    ] } : {}),
  };
  const [nav, items] = await Promise.all([
    adminNav(),
    db.providerAccreditation.findMany({
      where,
      orderBy: [{ status: "asc" }, { createdAt: "asc" }],
      include: { company: { select: { name: true, slug: true } }, documents: { select: { id: true, name: true } } },
    }),
  ]);

  return (
    <DashboardShell title="Accreditations" subtitle="Review external regulator ratings and evidence-based provider awards." nav={nav} active="/admin/accreditations">
      <AdminFilters>
        <AdminFilterField label="Search" wide><input className="field" name="q" defaultValue={q} placeholder="Provider, award or reference" /></AdminFilterField>
        <AdminFilterField label="Status"><select className="field" name="status" defaultValue={status ?? ""}><option value="">All statuses</option>{Object.values(AccreditationStatus).map((value) => <option key={value} value={value}>{value.replaceAll("_", " ").toLowerCase()}</option>)}</select></AdminFilterField>
        <AdminFilterField label="Scheme"><select className="field" name="scheme" defaultValue={query.scheme ?? ""}><option value="">All schemes</option><option value="CQC">CQC</option><option value="BVSC">BVSC</option><option value="ROOMSNOW">RoomsNow</option><option value="OTHER">Other</option></select></AdminFilterField>
      </AdminFilters>
      {items.length === 0 ? <div className="mt-4"><EmptyState title="No matching accreditations" body="Try changing the filters." /></div> : (
        <ul className="mt-4 space-y-3">
          {items.map((item) => (
            <li key={item.id} className="card p-4">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <AccreditationBadge scheme={item.scheme} name={item.name} rating={item.rating} status={item.status} />
                    <a href={`/companies/${item.company.slug}`} className="font-semibold text-brand hover:underline">{item.company.name}</a>
                  </div>
                  <dl className="mt-3 grid gap-2 text-[13px] text-ink-soft sm:grid-cols-2">
                    <div><dt className="text-ink-faint">Submitted</dt><dd>{shortDate(item.createdAt)}</dd></div>
                    <div><dt className="text-ink-faint">Reference</dt><dd>{item.referenceNumber || "Not supplied"}</dd></div>
                    <div><dt className="text-ink-faint">Expiry/review</dt><dd>{item.expiresAt ? shortDate(item.expiresAt) : "No expiry supplied"}</dd></div>
                    <div><dt className="text-ink-faint">Evidence</dt><dd>{item.documents.map((document) => <a key={document.id} href={`/api/documents/${document.id}`} target="_blank" className="block truncate text-brand hover:underline">{document.name}</a>)}</dd></div>
                  </dl>
                  {item.publicUrl && <a href={item.publicUrl} target="_blank" rel="noreferrer" className="mt-3 inline-block text-[13px] text-brand hover:underline">Open public register record</a>}
                  {item.reviewNote && <p className="mt-3 text-[13px] text-ink-soft"><strong>Previous note:</strong> {item.reviewNote}</p>}
                </div>
                {item.status === "UNDER_ASSESSMENT" ? <AccreditationReview id={item.id} scheme={item.scheme} initialRating={item.rating} /> : <div className="rounded-[10px] bg-paper p-3 text-[13px] text-ink-soft">Reviewed {item.reviewedAt ? shortDate(item.reviewedAt) : "previously"}. Status: {item.status.replaceAll("_", " ").toLowerCase()}.</div>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </DashboardShell>
  );
}
