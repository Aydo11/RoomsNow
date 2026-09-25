import Link from "next/link";
import { Stars } from "./star-rating";
import { monthYear } from "@/lib/format";
import type { ResidentReviewSummary } from "@/lib/review-rules";
import type { PublicResidentReview } from "@/server/resident-reviews";

/**
 * "What residents say": reviews from people who actually moved in through
 * RoomsNow, with the provider's public replies. Renders nothing until there's
 * at least one review.
 */
export function ResidentReviews({
  summary,
  reviews,
  moreHref,
  heading = "What residents say",
}: {
  summary: ResidentReviewSummary;
  reviews: PublicResidentReview[];
  moreHref?: string;
  heading?: string;
}) {
  if (!summary.count) return null;
  return (
    <section id="resident-reviews" className="mt-8 scroll-mt-24" aria-labelledby="resident-reviews-heading">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="resident-reviews-heading" className="text-[22px]">
            {heading}
          </h2>
          <p className="mt-1 text-[13px] text-ink-faint">Only people who moved in through RoomsNow can leave a review.</p>
        </div>
        <div className="flex items-center gap-2">
          <Stars rating={summary.average} size="md" />
          <span className="text-[16px] font-semibold tabular-nums text-ink">{summary.average.toFixed(1)}</span>
          <span className="text-[13px] text-ink-faint">
            ({summary.count} resident{summary.count === 1 ? "" : "s"})
          </span>
        </div>
      </div>

      {(summary.feelSafePct !== null || summary.supportHelpfulPct !== null) && (
        <div className="mt-4 flex flex-wrap gap-2">
          {summary.feelSafePct !== null && <Figure value={summary.feelSafePct} label="feel safe living here" />}
          {summary.supportHelpfulPct !== null && <Figure value={summary.supportHelpfulPct} label="say the support is helpful" />}
        </div>
      )}

      <ul className="mt-4 divide-y divide-line rounded-card border border-line bg-white">
        {reviews.map((review) => (
          <li key={review.id} className="p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Stars rating={review.rating} />
              <span className="text-[12px] text-ink-faint">{monthYear(review.createdAt)}</span>
            </div>
            {review.comment && <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-ink">{review.comment}</p>}
            <p className="mt-2 text-[12.5px] text-ink-faint">
              Verified resident · {review.stillLivingThere ? "lives here now" : "has moved on"}
              {review.listingTitle ? ` · ${review.listingTitle}` : ""}
            </p>
            {review.providerReply && (
              <div className="mt-3 rounded-[10px] border-l-2 border-pine bg-paper-sunk/70 px-3.5 py-2.5">
                <p className="text-[12.5px] font-semibold text-ink-soft">Reply from the provider</p>
                <p className="mt-1 whitespace-pre-line text-[14px] leading-relaxed text-ink-soft">{review.providerReply}</p>
              </div>
            )}
          </li>
        ))}
      </ul>
      {moreHref && summary.count > reviews.length && (
        <Link href={moreHref} className="mt-3 inline-block text-[14px] font-semibold text-pine-dark hover:underline">
          See all {summary.count} reviews →
        </Link>
      )}
    </section>
  );
}

function Figure({ value, label }: { value: number; label: string }) {
  return (
    <span className="inline-flex items-baseline gap-1.5 rounded-full bg-pine-light/60 px-3 py-1 text-[13.5px] text-ink">
      <strong className="tabular-nums text-pine-dark">{value}%</strong>
      {label}
    </span>
  );
}

/** One-line rating for the provider card on an advert. */
export function ResidentRatingLine({ summary, href }: { summary: ResidentReviewSummary; href: string }) {
  if (!summary.count) return null;
  return (
    <Link href={href} className="mt-3 flex items-center gap-2 text-[13px] text-ink-soft hover:text-ink">
      <Stars rating={summary.average} />
      <span className="font-semibold tabular-nums text-ink">{summary.average.toFixed(1)}</span>
      <span>
        from {summary.count} resident{summary.count === 1 ? "" : "s"}
      </span>
    </Link>
  );
}
