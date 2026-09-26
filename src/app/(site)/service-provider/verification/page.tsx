import { db } from "@/lib/db";
import { DashboardShell } from "@/components/dashboard-shell";
import { DeleteEvidenceButton, EvidenceUploadForm, SubmitBusinessForReviewForm } from "@/components/service-forms";
import { BusinessStatusPill, InsuranceStatus, ServiceVerifiedBadge } from "@/components/service-ui";
import { requireServiceBusiness } from "@/server/service-marketplace";
import { EVIDENCE_LABELS, evidenceChecklist, insuranceState, isVerifiedServiceBusiness, readyForReview, type EvidenceLike } from "@/lib/service-marketplace";
import { shortDate } from "@/lib/format";
import { serviceProviderNav } from "../nav";

export const metadata = { title: "Verification" };
export const dynamic = "force-dynamic";

const EVIDENCE_STATUS = { PENDING: "Waiting for check", ACCEPTED: "Accepted", REJECTED: "Rejected" } as const;

export default async function ServiceVerificationPage() {
  const { user, business } = await requireServiceBusiness();
  const [nav, evidence] = await Promise.all([
    serviceProviderNav(user.id),
    db.serviceEvidence.findMany({ where: { businessId: business.id }, orderBy: { createdAt: "desc" } }),
  ]);
  const typed = evidence as unknown as EvidenceLike[];
  const checklist = evidenceChecklist(typed);
  const ready = readyForReview(business, typed);
  const insurance = insuranceState(typed);
  const canSubmit = ["ONBOARDING", "CHANGES_REQUESTED", "REJECTED"].includes(business.status);

  return (
    <DashboardShell
      title="Verification"
      subtitle="Every business is checked by our team before providers can see it. The Verified badge needs approved incorporation details and in-date public liability insurance."
      nav={nav}
      active="/service-provider/verification"
    >
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <BusinessStatusPill status={business.status} />
        <InsuranceStatus state={insurance.state} expiresAt={insurance.expiresAt} />
        {isVerifiedServiceBusiness(business, typed) && <ServiceVerifiedBadge />}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <EvidenceUploadForm />

          <section className="card p-5">
            <h2 className="text-[18px]">Your documents</h2>
            {evidence.length === 0 ? (
              <p className="mt-2 text-[14px] text-ink-soft">Nothing uploaded yet.</p>
            ) : (
              <ul className="mt-3 divide-y divide-line">
                {evidence.map((item) => (
                  <li key={item.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="text-[15px] font-medium text-ink">{item.label}</p>
                      <p className="text-[13px] text-ink-faint">
                        {EVIDENCE_LABELS[item.type]}
                        {item.issuer ? ` · ${item.issuer}` : ""}
                        {item.expiresAt ? ` · expires ${shortDate(item.expiresAt)}` : ""} · {item.fileName}
                      </p>
                      {item.status === "REJECTED" && item.reviewNote && <p className="mt-1 text-[13px] text-clay">{item.reviewNote}</p>}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={item.status === "ACCEPTED" ? "text-[13px] font-medium text-pine-dark" : item.status === "REJECTED" ? "text-[13px] font-medium text-clay" : "text-[13px] text-ink-soft"}>
                        {EVIDENCE_STATUS[item.status]}
                      </span>
                      {item.status !== "ACCEPTED" && <DeleteEvidenceButton id={item.id} />}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <section className="card p-5">
            <h2 className="text-[16px]">Checklist</h2>
            <ul className="mt-3 space-y-2 text-[14px]">
              {checklist.map((item) => (
                <li key={item.key} className="flex gap-2">
                  <span aria-hidden="true" className={item.done ? "text-pine" : "text-ink-faint"}>{item.done ? "✓" : "○"}</span>
                  <span className={item.done ? "text-ink-soft" : "text-ink"}>
                    {item.label}
                    {!item.required && <span className="text-ink-faint"> (recommended)</span>}
                  </span>
                </li>
              ))}
            </ul>
            {canSubmit ? (
              <div className="mt-4 space-y-2">
                {!ready.ready && <p className="text-[13px] text-ink-soft">Still needed: {ready.missing.join(", ")}.</p>}
                <SubmitBusinessForReviewForm disabled={!ready.ready} />
              </div>
            ) : (
              <p className="mt-4 text-[13px] text-ink-soft">
                {business.status === "PENDING_REVIEW"
                  ? "With our team now. New documents you upload are checked as they arrive."
                  : business.status === "APPROVED"
                    ? "You're approved. Keep your insurance in date — the Verified badge drops off when it expires."
                    : "Contact support about your account."}
              </p>
            )}
          </section>
          <p className="text-[12.5px] leading-relaxed text-ink-faint">
            Your documents are stored privately. Only authorised RoomsNow staff can open them, and every view is recorded. Providers see the document name, issuer and
            expiry date — never the file or policy number.
          </p>
        </aside>
      </div>
    </DashboardShell>
  );
}
