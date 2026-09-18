import { db } from "@/lib/db";
import { requireCompany } from "@/lib/rbac";
import { shortDate } from "@/lib/format";
import { DashboardShell } from "@/components/dashboard-shell";
import { AccreditationBadge } from "@/components/badges";
import { AccreditationForm } from "@/components/accreditation-form";
import { providerNav } from "../nav";

export const metadata = { title: "Accreditations" };
export const dynamic = "force-dynamic";

export default async function ProviderAccreditationsPage() {
  const { companyId } = await requireCompany();
  const [nav, accreditations] = await Promise.all([
    providerNav(companyId),
    db.providerAccreditation.findMany({ where: { companyId }, orderBy: { createdAt: "desc" } }),
  ]);

  return (
    <DashboardShell title="Accreditations" subtitle="Submit regulatory ratings and quality awards for evidence review." nav={nav} active="/provider/accreditations">
      {accreditations.length > 0 && (
        <section className="card mb-6 p-5 sm:p-6">
          <h2 className="text-[18px]">Your submissions</h2>
          <ul className="mt-3 divide-y divide-line">
            {accreditations.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                <AccreditationBadge scheme={item.scheme} name={item.name} rating={item.rating} status={item.status} />
                <div className="text-right text-[12px] text-ink-faint">
                  <p>Submitted {shortDate(item.createdAt)}</p>
                  {item.expiresAt && <p>Review/expiry {shortDate(item.expiresAt)}</p>}
                  {item.reviewNote && <p className="mt-1 max-w-sm text-clay-dark">{item.reviewNote}</p>}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
      <AccreditationForm />
    </DashboardShell>
  );
}
