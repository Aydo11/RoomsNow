import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/rbac";
import { DashboardShell, DataTable } from "@/components/dashboard-shell";
import { EmptyState, FormSuccess } from "@/components/ui";
import { PipelineTrail } from "@/components/pipeline";
import { userNav } from "../nav";
import { shortDate } from "@/lib/format";
import { stepForStatus } from "@/lib/next-steps";
import { NextStepsGuide } from "@/components/next-steps-guide";
import { ResidentReviewForm } from "@/components/resident-review-form";
import { reviewablePlacements } from "@/server/resident-reviews";

export const metadata = { title: "My requests" };
export const dynamic = "force-dynamic";

export default async function RequestsPage({ searchParams }: { searchParams: Promise<{ submitted?: string }> }) {
  const user = await requireUser("/dashboard/requests");
  const query = await searchParams;
  const nav = await userNav(user.id);

  const [requests, referrals, placements] = await Promise.all([
    db.accommodationRequest.findMany({
      where: { applicantId: user.id },
      orderBy: { updatedAt: "desc" },
      include: { listing: { select: { id: true, title: true, company: { select: { name: true } } } } },
    }),
    db.referral.findMany({
      where: { applicantEmail: user.email },
      orderBy: { updatedAt: "desc" },
      select: { id: true, reference: true, status: true, organisation: true, updatedAt: true },
    }),
    reviewablePlacements(user),
  ]);
  const reviewFor = (kind: "request" | "referral", id: string) => placements.find((p) => p.kind === kind && p.id === id);
  const referralPlacements = placements.filter((p) => p.kind === "referral");

  return (
    <DashboardShell
      title="Requests and referrals"
      subtitle="Everything you've asked for, and where it's got to."
      nav={nav}
      active="/dashboard/requests"
    >
      {query.submitted && (
        <div className="mb-8 space-y-5">
          <FormSuccess message="Request sent. The provider has been notified and will be in touch through messages." />
          <div className="card p-5 sm:p-6">
            <NextStepsGuide current="applied" compact />
          </div>
        </div>
      )}

      {requests.length === 0 ? (
        <EmptyState
          title="No requests yet"
          body="When you find somewhere suitable, send a request and you can follow its progress here."
          actionHref="/search"
          actionLabel="Search accommodation"
        />
      ) : (
        <ul className="space-y-4">
          {requests.map((request) => (
            <li key={request.id}>
              <details className="card group overflow-hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3.5 hover:bg-paper [&::-webkit-details-marker]:hidden">
                  <span className="min-w-0">
                    <span className="block truncate text-[16px] font-semibold">{request.listing.title}</span>
                    <span className="mt-0.5 block truncate text-[13px] text-ink-soft">{request.listing.company.name} · requested {shortDate(request.createdAt)}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-3">
                    <span className="chip capitalize">{request.status.replace(/_/g, " ").toLowerCase()}</span>
                    <svg viewBox="0 0 20 20" className="h-4 w-4 text-ink-faint transition group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m5 7.5 5 5 5-5" /></svg>
                  </span>
                </summary>
                <div className="border-t border-line p-5">
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/listings/${request.listing.id}`} className="btn-secondary">View advert</Link>
                    <Link href="/messages" className="btn-secondary">Message provider</Link>
                    {stepForStatus(request.status) && (
                      <Link href={`/next-steps?step=${stepForStatus(request.status)}#step-${stepForStatus(request.status)}`} className="btn-ghost">
                        What happens next
                      </Link>
                    )}
                  </div>
                  <div className="mt-5"><PipelineTrail status={request.status} /></div>
                  {request.statusNote && (
                    <p className="mt-4 rounded-[10px] bg-paper-sunk px-4 py-3 text-[14px] text-ink-soft">{request.statusNote}</p>
                  )}
                  {reviewFor("request", request.id) && (
                    <ReviewBox placement={reviewFor("request", request.id)!} />
                  )}
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}

      {referrals.length > 0 && (
        <section className="mt-10">
          <h2 className="text-[20px]">Referrals made for you</h2>
          <p className="mt-1 text-[14px] text-ink-soft">
            Submitted by a professional working with you. Only they and the provider can see the detail.
          </p>
          <div className="mt-4">
            <DataTable head={["Reference", "Referred by", "Status", "Updated"]}>
              {referrals.map((referral) => (
                <tr key={referral.id}>
                  <td className="px-4 py-3 font-medium">{referral.reference}</td>
                  <td className="px-4 py-3">{referral.organisation}</td>
                  <td className="px-4 py-3">{referral.status.replace(/_/g, " ").toLowerCase()}</td>
                  <td className="px-4 py-3 text-ink-soft">{shortDate(referral.updatedAt)}</td>
                </tr>
              ))}
            </DataTable>
          </div>
          {referralPlacements.map((placement) => (
            <div key={placement.id} className="card mt-4 p-5">
              <p className="text-[15px] font-semibold">{placement.listingTitle}</p>
              <p className="text-[13px] text-ink-soft">{placement.companyName}</p>
              <ReviewBox placement={placement} />
            </div>
          ))}
        </section>
      )}
    </DashboardShell>
  );
}

function ReviewBox({ placement }: { placement: Awaited<ReturnType<typeof reviewablePlacements>>[number] }) {
  return (
    <div className="mt-5 rounded-[12px] border border-line bg-paper/60 p-4">
      <h3 className="text-[16px] font-semibold">{placement.review ? "Your review" : "How is it living here?"}</h3>
      <p className="mt-1 text-[13px] text-ink-soft">
        {placement.review?.hiddenAt
          ? "RoomsNow has taken this review down. You can edit it below."
          : placement.review
            ? "Thanks for sharing. You can change it at any time."
            : "Your review helps other people choose a safe, good home."}
      </p>
      {placement.review?.providerReply && (
        <div className="mt-3 rounded-[10px] border-l-2 border-pine bg-white px-3.5 py-2.5">
          <p className="text-[12.5px] font-semibold text-ink-soft">Reply from the provider</p>
          <p className="mt-1 whitespace-pre-line text-[14px] text-ink-soft">{placement.review.providerReply}</p>
        </div>
      )}
      <div className="mt-4">
        <ResidentReviewForm kind={placement.kind} id={placement.id} existing={placement.review} />
      </div>
    </div>
  );
}
