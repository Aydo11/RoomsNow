import Link from "next/link";
import { db } from "@/lib/db";
import { requireCompany } from "@/lib/rbac";
import { DashboardShell } from "@/components/dashboard-shell";
import { EmptyState } from "@/components/ui";
import { PipelineTrail } from "@/components/pipeline";
import { StatusUpdater } from "@/components/status-updater";
import { DirectMessageForm } from "@/components/direct-message-form";
import { ViewingScheduler } from "@/components/viewing-scheduler";
import { providerNav } from "../nav";
import { PIPELINE, PIPELINE_LABELS, URGENCY_LABELS } from "@/lib/taxonomy";
import { ageFrom, shortDate } from "@/lib/format";

export const metadata = { title: "Referrals" };
export const dynamic = "force-dynamic";

export default async function ProviderReferralsPage() {
  const { companyId } = await requireCompany();
  const [nav, referrals] = await Promise.all([
    providerNav(companyId),
    db.referral.findMany({
      where: { listing: { companyId } },
      orderBy: { createdAt: "desc" },
      include: {
        listing: { select: { id: true, title: true } },
        referrer: { select: { firstName: true, lastName: true, email: true } },
        documents: { select: { id: true, name: true } },
        viewings: { orderBy: { scheduledFor: "asc" } },
      },
    }),
  ]);

  return (
    <DashboardShell
      title="Referrals"
      subtitle="Sent by professionals on behalf of someone they support. Applicant details stay between you, the referrer and our admin team."
      nav={nav}
      active="/provider/referrals"
    >
      {referrals.length === 0 ? (
        <EmptyState
          title="No referrals yet"
          body="Make sure your adverts list a professional referral route so workers know they can refer."
        />
      ) : (
        <ul className="space-y-4">
          {referrals.map((referral) => (
            <li key={referral.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-[18px]">
                    {referral.applicantFirstName} {referral.applicantLastName}
                  </h2>
                  <p className="mt-0.5 text-[14px] text-ink-soft">
                    {referral.applicantDob ? `${ageFrom(referral.applicantDob)} · ` : ""}
                    {referral.reference} · received {shortDate(referral.createdAt)}
                  </p>
                  <p className="mt-1 text-[14px] text-ink-soft">
                    Referred by {referral.referrer.firstName} {referral.referrer.lastName}
                    {referral.organisation ? `, ${referral.organisation}` : ""} ·{" "}
                    <a href={`mailto:${referral.referrer.email}`} className="text-pine-dark hover:underline">
                      {referral.referrer.email}
                    </a>
                  </p>
                  {referral.listing && (
                    <p className="mt-1 text-[14px]">
                      <Link href={`/provider/adverts/${referral.listing.id}`} className="text-pine-dark hover:underline">
                        {referral.listing.title}
                      </Link>
                    </p>
                  )}
                </div>
                <span className="chip">{URGENCY_LABELS[referral.urgency]}</span>
              </div>

              <div className="mt-4">
                <PipelineTrail status={referral.status} />
              </div>

              <dl className="mt-4 grid gap-3 text-[14px] sm:grid-cols-2">
                {referral.preferredLocation && (
                  <div>
                    <dt className="text-ink-faint">Preferred area</dt>
                    <dd>{referral.preferredLocation}</dd>
                  </div>
                )}
                {referral.accommodationNeeds && (
                  <div>
                    <dt className="text-ink-faint">Accommodation needs</dt>
                    <dd className="whitespace-pre-line">{referral.accommodationNeeds}</dd>
                  </div>
                )}
                {referral.supportNeeds && (
                  <div>
                    <dt className="text-ink-faint">Support needs</dt>
                    <dd className="whitespace-pre-line">{referral.supportNeeds}</dd>
                  </div>
                )}
                {referral.additionalInfo && (
                  <div>
                    <dt className="text-ink-faint">Anything else</dt>
                    <dd className="whitespace-pre-line">{referral.additionalInfo}</dd>
                  </div>
                )}
              </dl>

              {referral.documents.length > 0 && (
                <ul className="mt-4 flex flex-wrap gap-2">
                  {referral.documents.map((document) => (
                    <li key={document.id}>
                      <a href={`/api/documents/${document.id}`} className="chip hover:bg-paper-sunk">
                        {document.name}
                      </a>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-5 border-t border-line pt-4">
                <StatusUpdater
                  kind="referral"
                  id={referral.id}
                  current={referral.status}
                  note={referral.statusNote}
                  options={[...PIPELINE, "DECLINED"].map((value) => ({
                    value,
                    label: PIPELINE_LABELS[value],
                  }))}
                />
              </div>

              <div className="mt-3">
                <DirectMessageForm
                  recipientUserId={referral.referrerId}
                  subject={`Referral ${referral.reference}`}
                  label="Message referrer"
                  placeholder={`Hi ${referral.referrer.firstName} — about ${referral.applicantFirstName}'s referral (${referral.reference})…`}
                  compact
                />
              </div>

              <div className="mt-5 border-t border-line pt-4">
                <h3 className="mb-3 text-[14px] font-semibold">Viewings</h3>
                <ViewingScheduler
                  kind="referral"
                  id={referral.id}
                  viewings={referral.viewings.map((viewing) => ({
                    id: viewing.id,
                    scheduledFor: viewing.scheduledFor.toISOString(),
                    status: viewing.status,
                    note: viewing.note,
                    outcomeNote: viewing.outcomeNote,
                  }))}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </DashboardShell>
  );
}
