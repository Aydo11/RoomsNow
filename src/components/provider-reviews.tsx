import { Stars } from "./star-rating";
import { shortDate } from "@/lib/format";

export type ProviderReviewItem = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: Date;
  organisation: string | null;
};

/**
 * Public reviews block for an approved (or unapproved) provider's profile.
 * Complements VerificationPanel: verification is "we checked the paperwork",
 * this is "referrers who actually placed someone here say it went well" —
 * only rendered when there's at least one review, so it never shows an
 * empty state on the many profiles that don't have one yet.
 */
export function ProviderReviews({
  average,
  count,
  reviews,
}: {
  average: number;
  count: number;
  reviews: ProviderReviewItem[];
}) {
  return (
    <section className="mt-5 rounded-[14px] border border-line bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[16px] font-semibold text-ink">Referrer reviews</h2>
        <div className="flex items-center gap-2">
          <Stars rating={average} size="md" />
          <span className="text-[14px] font-semibold text-ink">{average.toFixed(1)}</span>
          <span className="text-[12px] text-ink-faint">({count} placement{count === 1 ? "" : "s"})</span>
        </div>
      </div>

      <ul className="mt-4 space-y-4">
        {reviews.map((review) => (
          <li key={review.id} className="border-t border-line pt-4 first:border-0 first:pt-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Stars rating={review.rating} />
              <span className="text-[12px] text-ink-faint">{shortDate(review.createdAt)}</span>
            </div>
            {review.comment && <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">{review.comment}</p>}
            <p className="mt-1 text-[12px] text-ink-faint">{review.organisation ?? "Verified referrer"} · placed via RoomsNow</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
