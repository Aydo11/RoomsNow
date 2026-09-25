import Link from "next/link";
import { db } from "@/lib/db";
import { requireCompany } from "@/lib/rbac";
import { DashboardShell, StatCard } from "@/components/dashboard-shell";
import { Stars } from "@/components/star-rating";
import { ReviewReplyForm } from "@/components/review-reply-form";
import { summariseResidentReviews } from "@/lib/review-rules";
import { monthYear } from "@/lib/format";
import { providerNav } from "../nav";

export const metadata = { title: "Resident reviews" };
export const dynamic = "force-dynamic";

/** Every resident review of this provider, with a public reply box under each. */
export default async function ProviderReviewsPage() {
  const { companyId } = await requireCompany();
  const [nav, company, reviews] = await Promise.all([
    providerNav(companyId),
    db.company.findUniqueOrThrow({ where: { id: companyId }, select: { slug: true } }),
    db.residentReview.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        rating: true,
        feelSafe: true,
        supportHelpful: true,
        comment: true,
        stillLivingThere: true,
        createdAt: true,
        providerReply: true,
        hiddenAt: true,
        listing: { select: { title: true } },
      },
    }),
  ]);
  const summary = summariseResidentReviews(reviews.filter((review) => !review.hiddenAt));
  const awaitingReply = reviews.filter((review) => !review.hiddenAt && !review.providerReply).length;

  return (
    <DashboardShell
      title="Resident reviews"
      subtitle="Reviews from people who moved into your homes through RoomsNow. They're public on your profile and adverts. A kind, specific reply shows future residents and referrers that you listen."
      nav={nav}
      active="/provider/reviews"
      action={
        <Link href={`/companies/${company.slug}#resident-reviews`} className="btn-secondary">
          See them on your profile
        </Link>
      }
    >
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Average rating" value={summary.count ? summary.average.toFixed(1) : "—"} hint={`${summary.count} review${summary.count === 1 ? "" : "s"}`} />
        <StatCard label="Feel safe" value={summary.feelSafePct === null ? "—" : `${summary.feelSafePct}%`} />
        <StatCard label="Support is helpful" value={summary.supportHelpfulPct === null ? "—" : `${summary.supportHelpfulPct}%`} />
        <StatCard label="Waiting for your reply" value={awaitingReply} />
      </div>

      {reviews.length === 0 ? (
        <div className="card mt-6 p-6">
          <p className="text-[15px] text-ink-soft">
            No resident reviews yet. When someone moves in through RoomsNow (a request or referral marked &ldquo;Moved in&rdquo;), they can review their home from their
            account.
          </p>
        </div>
      ) : (
        <ul className="mt-6 space-y-4">
          {reviews.map((review) => (
            <li key={review.id} className="card p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Stars rating={review.rating} size="md" />
                  {review.hiddenAt && <span className="chip px-2 py-0.5 text-[12px]">Taken down by RoomsNow</span>}
                </div>
                <span className="text-[12.5px] text-ink-faint">
                  {monthYear(review.createdAt)}
                  {review.listing ? ` · ${review.listing.title}` : ""}
                </span>
              </div>
              <p className="mt-2 text-[13px] text-ink-soft">
                Feels safe: {review.feelSafe === null ? "not answered" : review.feelSafe ? "yes" : "no"} · Support helpful:{" "}
                {review.supportHelpful === null ? "not answered" : review.supportHelpful ? "yes" : "no"} · {review.stillLivingThere ? "Lives there now" : "Has moved on"}
              </p>
              {review.comment && <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-ink">{review.comment}</p>}
              {review.providerReply && (
                <div className="mt-3 rounded-[10px] border-l-2 border-pine bg-paper-sunk/70 px-3.5 py-2.5">
                  <p className="text-[12.5px] font-semibold text-ink-soft">Your reply</p>
                  <p className="mt-1 whitespace-pre-line text-[14px] text-ink-soft">{review.providerReply}</p>
                </div>
              )}
              {!review.hiddenAt && <ReviewReplyForm reviewId={review.id} initial={review.providerReply} />}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-6 max-w-[80ch] text-[12.5px] leading-relaxed text-ink-faint">
        Please never contact a resident to ask them to change or remove a review. If a review names someone or includes something untrue, report it to RoomsNow and
        we&apos;ll look at it.
      </p>
    </DashboardShell>
  );
}
