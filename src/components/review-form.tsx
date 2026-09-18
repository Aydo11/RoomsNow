"use client";

import { useActionState, useState } from "react";
import { submitProviderReviewAction } from "@/server/actions/referrals";
import { FormError, FormSuccess, SubmitButton } from "./ui";
import type { FormState } from "@/lib/validation";

const RATING_LABELS = ["Poor", "Below average", "Good", "Very good", "Excellent"];

/**
 * Lets a referrer rate how a placement went, once the referral has reached
 * MOVED_IN. One review per referral — enforced server-side by the unique
 * ProviderReview.referralId — so this can only ever be filled in once.
 */
export function ReviewForm({ referralId }: { referralId: string }) {
  const initialState: FormState = { ok: false };
  const [state, action] = useActionState(submitProviderReviewAction, initialState);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);

  if (state.ok) return <FormSuccess message={state.message ?? "Thanks — your review has been posted."} />;

  const shown = hover || rating;

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="referralId" value={referralId} />
      <input type="hidden" name="rating" value={rating} />
      <div>
        <div className="flex items-center gap-1" role="radiogroup" aria-label="Rating">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={rating === value}
              aria-label={`${value} star${value === 1 ? "" : "s"}`}
              onClick={() => setRating(value)}
              onMouseEnter={() => setHover(value)}
              onMouseLeave={() => setHover(0)}
              className="rounded p-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-pine"
            >
              <svg
                viewBox="0 0 20 20"
                className={`h-7 w-7 transition-colors ${shown >= value ? "text-clay" : "text-line-strong"}`}
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M10 1.5l2.6 5.6 6.1.6-4.6 4.1 1.3 6-5.4-3.1-5.4 3.1 1.3-6-4.6-4.1 6.1-.6L10 1.5Z" />
              </svg>
            </button>
          ))}
          {shown > 0 && <span className="ml-2 text-[13px] text-ink-soft">{RATING_LABELS[shown - 1]}</span>}
        </div>
      </div>
      <FormError message={state.errors?.form ?? state.errors?.rating} />
      <textarea
        name="comment"
        rows={3}
        maxLength={800}
        placeholder="How did the placement go? What would other referrers want to know? (optional)"
        className="field"
      />
      <SubmitButton className="btn-primary" pendingLabel="Posting…" disabled={rating === 0}>
        Post review
      </SubmitButton>
    </form>
  );
}
