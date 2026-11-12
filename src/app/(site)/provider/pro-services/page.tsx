import Link from "next/link";
import { db } from "@/lib/db";
import { requireCompany } from "@/lib/rbac";
import { planLimits } from "@/lib/billing";
import { money, shortDate } from "@/lib/format";
import { DashboardShell, DataTable } from "@/components/dashboard-shell";
import { FormError, FormSuccess, SubmitButton } from "@/components/ui";
import { MembershipTabs } from "@/components/membership-tabs";
import { providerNav } from "../nav";
import { proServiceEnquiryAction } from "@/server/actions/pro-services";
import { PRO_SERVICES, PRO_SERVICE_KEYS, SESSION_HOURS, canUseProServices, sessionLabel, sessionPrice, type ProService } from "@/lib/pro-services";

export const metadata = { title: "Pro Services" };
export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  plan: "Pro Services are part of Professional and Business memberships. Upgrade to send an enquiry.",
  busy: "You've sent several enquiries in the last hour. Please try again a bit later, or email info@roomsnow.co.uk.",
  service: "Choose a service to enquire about.",
};

type Expert = { id: string; name: string; role: string; specialism: string; bio: string; hourlyRate: number };

function EnquiryForm({ service, experts, allowed }: { service: ProService; experts: Expert[]; allowed: boolean }) {
  if (!allowed) {
    return (
      <Link href="/provider/membership" className="btn-secondary">Upgrade to enquire</Link>
    );
  }
  const id = service.key.toLowerCase();
  return (
    <details className="group rounded-card border border-line bg-paper-sunk/40 p-4 open:bg-white">
      <summary className="btn-primary cursor-pointer list-none [&::-webkit-details-marker]:hidden">Enquire: email me the pack</summary>
      <form action={proServiceEnquiryAction} className="mt-4 grid gap-3 sm:grid-cols-2">
        <input type="hidden" name="service" value={service.key} />
        {service.key === "EXPERT" && experts.length > 0 && (
          <>
            <label className="block">
              <span className="label">Manager</span>
              <select id={`${id}-expert`} name="expertId" className="field">
                <option value="">Suggest someone for me</option>
                {experts.map((e) => <option key={e.id} value={e.id}>{e.name} · {money(e.hourlyRate)}/hour</option>)}
              </select>
            </label>
            <label className="block">
              <span className="label">Session length</span>
              <select id={`${id}-hours`} name="hours" className="field" defaultValue="1">
                {SESSION_HOURS.map((h) => <option key={h} value={h}>{sessionLabel(h)}</option>)}
              </select>
            </label>
          </>
        )}
        <label className="block">
          <span className="label">Phone (optional)</span>
          <input id={`${id}-phone`} name="phone" type="tel" maxLength={30} className="field" autoComplete="tel" />
        </label>
        <label className="block sm:col-span-2">
          <span className="label">What do you need? (optional)</span>
          <textarea id={`${id}-message`} name="message" rows={3} maxLength={1500} className="field" placeholder="For example: 12 properties, 8 staff, records in spreadsheets today." />
          <span className="mt-1 block text-[12.5px] text-ink-faint">Please leave out residents' names and any personal or case details.</span>
        </label>
        <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
          <SubmitButton pendingLabel="Sending your pack…">Send me the pack</SubmitButton>
          <span className="text-[13px] text-ink-soft">We email you the full pack and keep a copy, so replies stay in one email thread.</span>
        </div>
      </form>
    </details>
  );
}

export default async function ProServicesPage({ searchParams }: { searchParams: Promise<{ sent?: string; queued?: string; error?: string }> }) {
  const { user, companyId } = await requireCompany();
  const query = await searchParams;
  const [nav, limits, experts, enquiries] = await Promise.all([
    providerNav(companyId),
    planLimits(companyId),
    db.proExpert.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    db.proServiceEnquiry.findMany({ where: { companyId }, orderBy: { createdAt: "desc" }, take: 10 }),
  ]);
  const allowed = canUseProServices(limits.membership.tier);
  const business = limits.membership.tier === "BUSINESS";

  return (
    <DashboardShell
      title="Pro Services"
      subtitle="CRM, websites and expert advice from the RoomsNow team, for Professional and Business members. Prices are plus VAT."
      nav={nav}
      active="/provider/pro-services"
    >
      <MembershipTabs active="pro" />
      {query.sent && <div className="mb-5"><FormSuccess message={`Pack sent to ${user.email} (reference ${query.sent}). Reply to that email with any questions and we'll pick it up.`} /></div>}
      {query.queued && <div className="mb-5"><FormSuccess message={`Enquiry saved (reference ${query.queued}). We couldn't send the email just now, so the team will email you the pack.`} /></div>}
      {query.error && <div className="mb-5"><FormError message={ERRORS[query.error] ?? "Something went wrong. Please try again."} /></div>}
      {!allowed && (
        <div className="card mb-6 flex flex-wrap items-center justify-between gap-3 p-5">
          <p className="text-[15px] text-ink-soft">You're on <strong className="text-ink">{limits.membership.name}</strong>. Pro Services come with Professional and Business. You can look at the prices now.</p>
          <Link href="/provider/membership" className="btn-primary">See plans</Link>
        </div>
      )}

      <nav aria-label="Services" className="mb-6 flex flex-wrap gap-2">
        {PRO_SERVICE_KEYS.map((k) => <a key={k} href={`#${k.toLowerCase()}`} className="rounded-full border border-line px-3 py-1.5 text-[13.5px] font-semibold text-pine-dark hover:bg-pine-light/60">{PRO_SERVICES[k].name}</a>)}
      </nav>

      <div className="space-y-8">
        {PRO_SERVICE_KEYS.map((key) => {
          const s = PRO_SERVICES[key];
          return (
            <section key={key} id={key.toLowerCase()} className="card scroll-mt-24 p-5 sm:p-6">
              <p className="text-[13px] font-semibold uppercase tracking-wide text-pine-dark">{s.name}</p>
              <h2 className="mt-1 text-[22px] leading-tight [text-wrap:balance]">{s.headline}</h2>
              <p className="mt-2 max-w-[65ch] text-[15px] leading-relaxed text-ink-soft">{s.helps}</p>

              {key === "EXPERT" ? (
                experts.length ? (
                  <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {experts.map((e) => (
                      <div key={e.id} className="rounded-card border border-line p-4">
                        <p className="font-semibold text-ink">{e.name}</p>
                        <p className="text-[13.5px] text-ink-soft">{e.role} · {e.specialism}</p>
                        <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">{e.bio}</p>
                        <dl className="mt-3 grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-[14px] tabular-nums">
                          {SESSION_HOURS.map((h) => (
                            <div key={h} className="contents">
                              <dt className="text-ink-soft">{sessionLabel(h)}</dt>
                              <dd className="text-right font-semibold text-ink">
                                {business && <s className="mr-1.5 font-normal text-ink-faint">{money(sessionPrice(e.hourlyRate, h))}</s>}
                                {money(sessionPrice(e.hourlyRate, h, business))}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-5 rounded-card border border-line p-4 text-[15px] text-ink-soft">Managers are being added. Launch rate is <strong className="text-ink">£150 per hour</strong>. Enquire and we'll match you with the right person.</p>
                )
              ) : (
                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {s.prices.map((p) => (
                    <div key={p.label} className="rounded-card border border-line p-4">
                      <p className="text-[14px] font-semibold text-ink-soft">{p.label}</p>
                      <p className="mt-1 text-[20px] font-semibold text-ink">{p.price}</p>
                      <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-soft">{p.detail}</p>
                    </div>
                  ))}
                </div>
              )}

              <ul className="mt-5 grid gap-1.5 text-[14.5px] text-ink sm:grid-cols-3">
                {s.outcomes.map((o) => <li key={o} className="flex gap-2"><span aria-hidden="true" className="text-pine">✓</span>{o}</li>)}
              </ul>
              <p className="mt-3 text-[13px] text-ink-faint">{s.terms}</p>
              <div className="mt-5"><EnquiryForm service={s} experts={experts} allowed={allowed} /></div>
            </section>
          );
        })}
      </div>

      {enquiries.length > 0 && (
        <section className="mt-8">
          <h2 className="text-[20px]">Your enquiries</h2>
          <p className="mt-1 text-[14px] text-ink-soft">Each one has a reference. Keep it in the subject when you reply so the conversation stays together.</p>
          <div className="mt-3">
            <DataTable head={["Date", "Reference", "Service", "Pack emailed", "Status"]}>
              {enquiries.map((e) => (
                <tr key={e.id}>
                  <td className="px-4 py-3">{shortDate(e.createdAt)}</td>
                  <td className="px-4 py-3 font-mono text-[13px]">{e.reference}</td>
                  <td className="px-4 py-3">{PRO_SERVICES[e.service as keyof typeof PRO_SERVICES]?.name ?? e.service}{e.expertName ? ` · ${e.expertName}` : ""}</td>
                  <td className="px-4 py-3">{e.packSentAt ? shortDate(e.packSentAt) : "Pending"}</td>
                  <td className="px-4 py-3 capitalize text-ink-soft">{e.status.toLowerCase()}</td>
                </tr>
              ))}
            </DataTable>
          </div>
        </section>
      )}
    </DashboardShell>
  );
}
