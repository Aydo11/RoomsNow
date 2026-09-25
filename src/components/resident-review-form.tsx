"use client";

import { useActionState, useState } from "react";
import { saveResidentReviewAction, type ReviewFormState } from "@/server/actions/resident-reviews";
import { FormError, FormSuccess, SubmitButton } from "./ui";
import { clsx } from "@/lib/clsx";

const RATING_LABELS = ["Poor", "Not great", "OK", "Good", "Really good"];

type Existing = {
  rating: number;
  feelSafe: boolean | null;
  supportHelpful: boolean | null;
  comment: string | null;
  stillLivingThere: boolean;
} | null;

/**
 * "How is it living here?" for someone who moved in through RoomsNow. Public
 * as "Verified resident", never with their name. Saving again edits it.
 */
export function ResidentReviewForm({ kind, id, existing }: { kind: "request" | "referral"; id: string; existing: Existing }) {
  const [state, action] = useActionState<ReviewFormState, FormData>(saveResidentReviewAction, { ok: false });
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [hover, setHover] = useState(0);
  const shown = hover || rating;

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="rating" value={rating} />

      <fieldset>
        <legend className="label">Overall, how is (or was) it living here?</legend>
        <div className="mt-1 flex items-center gap-1" role="radiogroup" aria-label="Rating">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={rating === value}
              aria-label={`${value} star${value === 1 ? "" : "s"}: ${RATING_LABELS[value - 1]}`}
              onClick={() => setRating(value)}
              onMouseEnter={() => setHover(value)}
              onMouseLeave={() => setHover(0)}
              className="rounded p-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-pine"
            >
              <svg viewBox="0 0 20 20" className={clsx("h-8 w-8 transition-colors", shown >= value ? "text-clay" : "text-line-strong")} fill="currentColor" aria-hidden="true">
                <path d="M10 1.5l2.6 5.6 6.1.6-4.6 4.1 1.3 6-5.4-3.1-5.4 3.1 1.3-6-4.6-4.1 6.1-.6L10 1.5Z" />
              </svg>
            </button>
          ))}
          {shown > 0 && <span className="ml-2 text-[14px] text-ink-soft">{RATING_LABELS[shown - 1]}</span>}
        </div>
      </fieldset>

      <YesNo name="feelSafe" label="Do you feel safe there?" initial={existing?.feelSafe ?? null} />
      <YesNo name="supportHelpful" label="Is the support helpful?" initial={existing?.supportHelpful ?? null} />
      <YesNo
        name="stillLivingThere"
        label="Do you still live there?"
        initial={existing ? existing.stillLivingThere : null}
        noSkip
      />

      <div>
        <label htmlFor={`review-comment-${id}`} className="label">
          Anything to tell people thinking of moving in? (optional)
        </label>
        <textarea
          id={`review-comment-${id}`}
          name="comment"
          rows={3}
          maxLength={800}
          defaultValue={existing?.comment ?? ""}
          placeholder="For example: the room, the house, the staff, the support"
          className="field"
        />
        <p className="mt-1 text-[12.5px] leading-relaxed text-ink-faint">
          Your review shows as &ldquo;Verified resident&rdquo;. Your name isn&apos;t shown, but the provider may be able to tell who wrote it. Please don&apos;t name
          other residents or staff. If you feel unsafe, talk to your support worker or your council, or call 999 in an emergency.
        </p>
      </div>

      <FormError message={state.ok ? undefined : state.message} />
      {state.ok && state.message && <FormSuccess message={state.message} />}
      <SubmitButton className="btn-primary" pendingLabel="Saving…" disabled={rating === 0}>
        {existing ? "Update my review" : "Post my review"}
      </SubmitButton>
    </form>
  );
}

function YesNo({ name, label, initial, noSkip }: { name: string; label: string; initial: boolean | null; noSkip?: boolean }) {
  const [value, setValue] = useState<"yes" | "no" | "">(initial === true ? "yes" : initial === false ? "no" : noSkip ? "yes" : "");
  const options: { value: "yes" | "no" | ""; label: string }[] = [
    { value: "yes", label: "Yes" },
    { value: "no", label: "No" },
    ...(noSkip ? [] : [{ value: "" as const, label: "Rather not say" }]),
  ];
  return (
    <fieldset>
      <legend className="label">{label}</legend>
      <input type="hidden" name={name} value={value} />
      <div className="mt-1 flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.label}
            type="button"
            aria-pressed={value === option.value}
            onClick={() => setValue(option.value)}
            className={clsx("chip px-3.5 py-1.5 text-[14px]", value === option.value && "chip-active")}
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
