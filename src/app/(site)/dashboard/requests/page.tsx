import Link from "next/link";
import { SuccessCelebration } from "@/components/success-celebration";
import { requestConversationIds, requestThreadKey } from "@/lib/request-conversation";
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
import { FoundHomeButton } from "@/components/found-home";
import { confirmMoveInAction, foundElsewhereAction, lookingAgainAction } from "@/server/actions/found-home";

export const metadata = { title: "My requests" };
export const dynamic = "force-dynamic";

export default async function RequestsPage({ searchParams }: { searchParams: Promise<{ submitted?: string }> }) {
  const user = await requireUser("/dashboard/requests");
  const query = await searchParams;
  const nav = await userNav(user.id);

  const [account, requests, referrals, placements] = await Promise.all([
    db.user.findUnique({ where: { id: user.id }, select: { foundHomeAt: true, foundHomeElsewhere: true } }),
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
  const threads = await requestConversationIds(requests.map((request) => ({ listingId: request.listingId, applicantId: user.id })));
  const threadFor = (listingId: string) => threads.get(requestThreadKey(listingId, user.id));
  const submitted = requests.find((request) => request.id === query.submitted);
  const submittedThread = submitted ? threadFor(submitted.listingId) : undefined;
  const reviewFor = (kind: "request" | "referral", id: string) => placements.find((p) => p.kind === kind && p.id === id);
  const referralPlacements = placements.filter((p) => p.kind === "referral");
  const isOpen = (status: string) => !["MOVED_IN", "DECLINED", "WITHDRAWN"].includes(status);
  const openCount = requests.filter((request) => isOpen(request.status)).length;

  return (
    <DashboardShell
      title="Requests and referrals"
      subtitle="Everything you've asked for, and where it's got to."
      nav={nav}
      active="/dashboard/requests"
    >
      {submitted && <SuccessCelebration kind="request-sent" />}
      {query.submitted && (
        <div className="mb-8 space-y-5">
          <FormSuccess message="Request sent. We've also started a conversation with the provider in Messages, so you can talk it through there." />
          {submittedThread && (
            <Link href={`/messages/${submittedThread}`} className="btn-primary">Open the conversation</Link>
          )}
          <div className="card p-5 sm:p-6">
            <NextStepsGuide current="applied" compact />
          </div>
        </div>
      )}

      {account?.foundHomeAt ? (
        <section className="mb-8 rounded-card border border-[#2f9e5f]/40 bg-positive-surface p-5 sm:p-6">
          <h2 className="text-[19px] text-ink">🎉 You found somewhere to live</h2>
          <p className="mt-1 text-[15px] text-ink-soft">
            You told us on {shortDate(account.foundHomeAt)}{account.foundHomeElsewhere ? " that you found a home outside RoomsNow" : ""}. Congratulations, and good luck in your new home.
          </p>
          <div className="mt-3">
            <FoundHomeButton
              action={lookingAgainAction}
              label="I'm looking again"
              title="Are you looking for a room again?"
              body="We'll treat you as still looking. Requests you withdrew stay withdrawn, so send new ones for any rooms you're interested in."
              confirmLabel="Yes, I'm looking again"
              className="btn-ghost px-0 text-[14px]"
            />
          </div>
        </section>
      ) : requests.length > 0 && (
        <section className="mb-8 card p-5 sm:p-6">
          <h2 className="text-[19px]">Found somewhere to live?</h2>
          <p className="mt-1 max-w-[62ch] text-[15px] text-ink-soft">
            Let us know so providers stop waiting on you. If you moved into one of the rooms below, open it and tap <strong>I moved in here</strong>.
          </p>
          <div className="mt-4">
            <FoundHomeButton
              action={foundElsewhereAction}
              label="I found somewhere not on RoomsNow"
              title="Found somewhere outside RoomsNow?"
              body={openCount ? `We'll withdraw your ${openCount} open request${openCount === 1 ? "" : "s"} and let the providers know, so they don't keep a room for you.` : "We'll note that you've found somewhere to live."}
              confirmLabel="Yes, I've found somewhere"
              className="btn-secondary"
            />
          </div>
        </section>
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
                    <Link href={threadFor(request.listingId) ? `/messages/${threadFor(request.listingId)}` : "/messages"} className="btn-secondary">Message provider</Link>
                    {stepForStatus(request.status) && (
                      <Link href={`/next-steps?step=${stepForStatus(request.status)}#step-${stepForStatus(request.status)}`} className="btn-ghost">
                        What happens next
                      </Link>
                    )}
                  </div>
                  {isOpen(request.status) && !account?.foundHomeAt && (
                    <div className="mt-4">
                      <FoundHomeButton
                        action={confirmMoveInAction.bind(null, request.id)}
                        label="🏠 I moved in here"
                        title={`Did you move into ${request.listing.title}?`}
                        body={openCount > 1 ? `We'll tell ${request.listing.company.name}, and withdraw your other ${openCount - 1} open request${openCount === 2 ? "" : "s"} so those providers aren't left waiting.` : `We'll let ${request.listing.company.name} know you've moved in.`}
                        confirmLabel="Yes, I moved in"
                      />
                    </div>
                  )}
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
