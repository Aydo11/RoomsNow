"use client";

import { useActionState, useState } from "react";
import { replyToResidentReviewAction, type ReviewFormState } from "@/server/actions/resident-reviews";
import { FormError, SubmitButton } from "./ui";

/** Provider's public reply under a resident review. */
export function ReviewReplyForm({ reviewId, initial }: { reviewId: string; initial: string | null }) {
  const [state, action] = useActionState<ReviewFormState, FormData>(replyToResidentReviewAction, { ok: false });
  const [open, setOpen] = useState(!initial);

  if (!open) {
    return (
      <button type="button" className="btn-ghost mt-2 px-2 text-[13px]" onClick={() => setOpen(true)}>
        Edit reply
      </button>
    );
  }
  return (
    <form action={action} className="mt-3 space-y-2">
      <input type="hidden" name="reviewId" value={reviewId} />
      <label htmlFor={`reply-${reviewId}`} className="label">
        Your public reply
      </label>
      <textarea
        id={`reply-${reviewId}`}
        name="reply"
        rows={3}
        maxLength={800}
        defaultValue={initial ?? ""}
        className="field"
        placeholder="Thank them, or explain what you've changed. Keep it kind and don't share personal details."
      />
      <FormError message={state.ok ? undefined : state.message} />
      {state.ok && state.message && <p className="text-[13px] text-pine-dark">{state.message}</p>}
      <SubmitButton className="btn-secondary" pendingLabel="Saving…">
        {initial ? "Update reply" : "Publish reply"}
      </SubmitButton>
    </form>
  );
}
