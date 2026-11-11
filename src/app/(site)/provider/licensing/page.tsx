import { db } from "@/lib/db";
import { requireCompany } from "@/lib/rbac";
import { DashboardShell } from "@/components/dashboard-shell";
import { LicensingItemForm } from "@/components/licensing-item-form";
import { LICENSING_STANDARDS, licensingProgress } from "@/lib/licensing";
import { providerNav } from "../nav";

export const metadata = { title: "Licensing readiness" };
export const dynamic = "force-dynamic";

function Bar({ percent }: { percent: number }) {
  return (
    <span aria-hidden="true" className="block h-2 w-full overflow-hidden rounded-full bg-paper-sunk">
      <span className="block h-full rounded-full bg-pine transition-[width]" style={{ width: `${percent}%` }} />
    </span>
  );
}

/** Checklist against the National Supported Housing Standards, ahead of council licensing. */
export default async function ProviderLicensingPage() {
  const { companyId } = await requireCompany();
  const [nav, items] = await Promise.all([
    providerNav(companyId),
    db.licensingItem.findMany({ where: { companyId } }),
  ]);
  const byKey = new Map(items.map((item) => [item.key, item]));
  const progress = licensingProgress(new Set(items.filter((i) => i.done).map((i) => i.key)));

  return (
    <DashboardShell
      title="Licensing readiness"
      subtitle="Get ready for council licensing of supported housing. Work through the National Supported Housing Standards, tick off what's in place and keep your evidence in one private place."
      nav={nav}
      active="/provider/licensing"
    >
      <section className="card p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-pine-dark">Your readiness</p>
            <p className="mt-1 font-display text-[40px] leading-none tabular-nums">{progress.percent}%</p>
          </div>
          <p className="text-[14px] text-ink-soft tabular-nums">{progress.done} of {progress.total} in place</p>
        </div>
        <div className="mt-4"><Bar percent={progress.percent} /></div>
        <p className="mt-4 text-[13.5px] leading-relaxed text-ink-soft">
          Councils are expected to start licensing supported and exempt accommodation from 2027, under the Supported Housing (Regulatory Oversight) Act 2023.
          The regulations and guidance are still being finalised, so treat this as preparation rather than a guarantee of a licence. Evidence you upload is private to your team.
        </p>
      </section>

      <div className="mt-6 space-y-5">
        {LICENSING_STANDARDS.map((standard) => {
          const stat = progress.standards.find((s) => s.key === standard.key)!;
          const percent = Math.round((stat.done / stat.total) * 100);
          return (
            <section key={standard.key} className="card p-5 sm:p-6" aria-labelledby={`std-${standard.key}`}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 id={`std-${standard.key}`} className="text-[19px]">{standard.title}</h2>
                <span className={`chip tabular-nums ${stat.done === stat.total ? "chip-active" : ""}`}>{stat.done}/{stat.total}</span>
              </div>
              <p className="mt-1 text-[14px] text-ink-soft">{standard.summary}</p>
              <div className="mt-3"><Bar percent={percent} /></div>
              <div className="mt-2 divide-y divide-line">
                {standard.items.map((item) => {
                  const saved = byKey.get(item.key);
                  return (
                    <LicensingItemForm
                      key={item.key}
                      itemKey={item.key}
                      label={item.label}
                      hint={item.hint}
                      done={saved?.done ?? false}
                      note={saved?.note ?? null}
                      evidence={saved?.documentId ? { id: saved.documentId, name: saved.documentName ?? "Evidence" } : null}
                    />
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </DashboardShell>
  );
}
