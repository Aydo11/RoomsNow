import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/rbac";
import { DashboardShell } from "@/components/dashboard-shell";
import { AdvertStatusPill, BusinessLogo, BusinessStatusPill, InsuranceStatus, QuoteStatusPill } from "@/components/service-ui";
import { AdvertDecisionForm, BusinessDecisionForm, EvidenceDecisionForm } from "@/components/service-admin-forms";
import { categoryLabel, EVIDENCE_LABELS, evidenceChecklist, insuranceState, isVerifiedServiceBusiness, priceLabel, type EvidenceLike } from "@/lib/service-marketplace";
import { dateTime, money, shortDate } from "@/lib/format";
import { adminNav } from "../../nav";

export const metadata = { title: "Service business" };
export const dynamic = "force-dynamic";

/** Due diligence for one service business. Full admins only: this page links to private evidence. */
export default async function AdminServiceBusinessPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAdmin("ALL");
  const business = await db.serviceBusiness.findUnique({
    where: { id },
    include: {
      owner: { select: { firstName: true, lastName: true, email: true, emailVerified: true, createdAt: true, status: true } },
      subscription: true,
      evidence: { orderBy: { createdAt: "desc" } },
      adverts: { orderBy: { updatedAt: "desc" } },
      quotes: { orderBy: { createdAt: "desc" }, take: 20, include: { company: { select: { name: true } } } },
    },
  });
  if (!business) notFound();
  const [nav, history] = await Promise.all([
    adminNav(),
    db.auditLog.findMany({
      where: { OR: [{ targetType: "ServiceBusiness", targetId: business.id }, { targetType: "ServiceEvidence", targetId: { in: business.evidence.map((e) => e.id) } }] },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { actor: { select: { firstName: true, lastName: true } } },
    }),
  ]);
  const evidence = business.evidence as unknown as EvidenceLike[];
  const insurance = insuranceState(evidence);

  return (
    <DashboardShell title={business.name} subtitle={business.tradingName ? `Trading as ${business.tradingName}` : undefined} nav={nav} active="/admin/marketplace" action={<Link href="/admin/marketplace?tab=businesses" className="btn-secondary">All businesses</Link>}>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <BusinessLogo src={business.logoUrl} name={business.name} size={40} />
        <BusinessStatusPill status={business.status} />
        <InsuranceStatus state={insurance.state} expiresAt={insurance.expiresAt} />
        {isVerifiedServiceBusiness(business, evidence) && <span className="text-[13px] font-medium text-pine-dark">Shows Verified badge</span>}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-5">
          <section className="card p-5">
            <h2 className="text-[18px]">Business details</h2>
            <dl className="mt-3 grid gap-3 text-[14px] sm:grid-cols-2">
              <div><dt className="text-ink-faint">Company number</dt><dd>{business.companyNumber ? <a className="text-brand hover:underline" href={`https://find-and-update.company-information.service.gov.uk/company/${encodeURIComponent(business.companyNumber)}`} target="_blank" rel="noopener noreferrer">{business.companyNumber} ↗</a> : "Sole trader / not given"}</dd></div>
              <div><dt className="text-ink-faint">Contact</dt><dd>{business.contactName} · {business.email}{business.phone ? ` · ${business.phone}` : ""}</dd></div>
              <div><dt className="text-ink-faint">Account owner</dt><dd>{business.owner.firstName} {business.owner.lastName} · {business.owner.email} · {business.owner.emailVerified ? "email verified" : "email NOT verified"}</dd></div>
              <div><dt className="text-ink-faint">Website</dt><dd>{business.website ? <a className="break-all text-brand hover:underline" href={business.website} target="_blank" rel="noopener noreferrer nofollow">{business.website}</a> : "—"}</dd></div>
              <div><dt className="text-ink-faint">Categories</dt><dd>{business.categories.map(categoryLabel).join(", ") || "—"}</dd></div>
              <div><dt className="text-ink-faint">Coverage</dt><dd>{business.nationalCoverage ? "Nationwide" : [...business.areas, ...business.postcodes].join(", ") || "—"}{business.radiusMiles ? ` · ${business.radiusMiles} miles from ${business.basePostcode ?? "base"}` : ""}</dd></div>
              <div><dt className="text-ink-faint">Plan</dt><dd>{business.subscription ? `${business.subscription.tier === "PRO" ? "Pro" : "Standard"} · ${business.subscription.status.toLowerCase()}${business.subscription.trialEndsAt ? ` · trial to ${shortDate(business.subscription.trialEndsAt)}` : ""}` : "None"}</dd></div>
              <div><dt className="text-ink-faint">Submitted</dt><dd>{business.submittedAt ? dateTime(business.submittedAt) : "Not yet"}</dd></div>
            </dl>
            {business.description && <p className="mt-4 whitespace-pre-line text-[14px] text-ink-soft">{business.description}</p>}
          </section>

          <section className="card p-5">
            <h2 className="text-[18px]">Evidence</h2>
            <ul className="mt-2 space-y-1 text-[13px] text-ink-soft">
              {evidenceChecklist(evidence).map((item) => <li key={item.key}>{item.done ? "✓" : "✗"} {item.label}{item.required ? "" : " (optional)"}</li>)}
            </ul>
            {business.evidence.length === 0 ? <p className="mt-3 text-[14px] text-ink-soft">No documents uploaded.</p> : (
              <ul className="mt-3 divide-y divide-line">
                {business.evidence.map((item) => (
                  <li key={item.id} className="py-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <a href={`/api/service-evidence/${item.id}`} target="_blank" rel="noreferrer" className="font-medium text-brand hover:underline">{item.label}</a>
                        <p className="text-[13px] text-ink-faint">
                          {EVIDENCE_LABELS[item.type]}{item.issuer ? ` · ${item.issuer}` : ""}{item.reference ? ` · ref ${item.reference}` : ""}{item.expiresAt ? ` · expires ${shortDate(item.expiresAt)}` : ""} · {item.fileName} ({Math.ceil(item.sizeBytes / 1024)} KB)
                        </p>
                        {item.reviewNote && <p className="text-[13px] text-clay">{item.reviewNote}</p>}
                      </div>
                      <span className="text-[13px] font-medium">{item.status.toLowerCase()}</span>
                    </div>
                    {item.status === "PENDING" && <EvidenceDecisionForm evidenceId={item.id} />}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-[12.5px] text-ink-faint">Opening a document is recorded in the audit log against your name.</p>
          </section>

          <section className="card p-5">
            <h2 className="text-[18px]">Adverts</h2>
            {business.adverts.length === 0 ? <p className="mt-2 text-[14px] text-ink-soft">None yet.</p> : (
              <ul className="mt-2 divide-y divide-line">
                {business.adverts.map((advert) => (
                  <li key={advert.id} className="py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="min-w-0"><span className="font-medium">{advert.title}</span><span className="block text-[13px] text-ink-faint">{categoryLabel(advert.category)} · {priceLabel(advert)} · {advert.views} views</span></span>
                      <AdvertStatusPill status={advert.status} />
                    </div>
                    {["PENDING_REVIEW", "ACTIVE", "PAUSED"].includes(advert.status) && <AdvertDecisionForm advertId={advert.id} status={advert.status} />}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {business.quotes.length > 0 && (
            <section className="card p-5">
              <h2 className="text-[18px]">Recent quote requests</h2>
              <ul className="mt-2 divide-y divide-line text-[14px]">
                {business.quotes.map((q) => (
                  <li key={q.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <span>{q.service} · {q.company.name} · {shortDate(q.createdAt)}{q.quoteAmount !== null ? ` · ${money(q.quoteAmount)}` : ""}</span>
                    <QuoteStatusPill status={q.status} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="space-y-4">
          <section className="card p-5">
            <h2 className="mb-3 text-[16px]">Decision</h2>
            {business.statusReason && <p className="mb-3 rounded-[8px] bg-paper-sunk px-3 py-2 text-[13px]">Last note: {business.statusReason}</p>}
            <BusinessDecisionForm businessId={business.id} status={business.status} />
          </section>
          <section className="card p-5">
            <h2 className="text-[16px]">History</h2>
            <ul className="mt-2 space-y-1.5 text-[13px]">
              {history.map((entry) => (
                <li key={entry.id}><span className="text-ink">{entry.action.replace(/_/g, " ").replace(/\./g, " · ")}</span><span className="block text-ink-faint">{entry.actor ? `${entry.actor.firstName} ${entry.actor.lastName}` : "System"} · {dateTime(entry.createdAt)}</span></li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </DashboardShell>
  );
}
