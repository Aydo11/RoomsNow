"use client";

import { useState, useTransition } from "react";
import { saveClientShareReviewAction } from "@/server/actions/clients";

const OPTIONS = [
  { value: "POTENTIAL_FIT", label: "Potential match" },
  { value: "NEEDS_INFORMATION", label: "Need more information" },
  { value: "CANNOT_MEET_NEEDS", label: "Cannot meet stated needs" },
] as const;

export function ClientSuitabilityReview({
  shareId,
  initialStatus,
  initialNote,
}: {
  shareId: string;
  initialStatus: string | null;
  initialNote: string | null;
}) {
  const [status, setStatus] = useState(initialStatus ?? "");
  const [note, setNote] = useState(initialNote ?? "");
  const [feedback, setFeedback] = useState("");
  const [isPending, startTransition] = useTransition();

  function save() {
    setFeedback("");
    startTransition(async () => {
      const result = await saveClientShareReviewAction(shareId, status, note);
      setFeedback(result.message);
    });
  }

  return (
    <section className="card p-5 sm:p-6" aria-labelledby="suitability-review-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-wide text-pine-dark">Provider team only</p>
          <h2 id="suitability-review-heading" className="mt-1 text-[19px]">Suitability review</h2>
          <p className="mt-1 max-w-[68ch] text-[14px] leading-relaxed text-ink-soft">
            Record whether your service may meet the person&apos;s stated accommodation and support requirements. Base this on your current availability, service capacity, accessibility and published eligibility criteria — not assumptions about the person.
          </p>
        </div>
        {initialStatus && <span className="chip">Review saved</span>}
      </div>

      <fieldset className="mt-4">
        <legend className="mb-2 text-[14px] font-medium text-ink">Your current assessment</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {OPTIONS.map((option) => (
            <label key={option.value} className={`flex min-h-12 cursor-pointer items-center gap-2 rounded-[10px] border px-3 py-2.5 text-[14px] transition-colors ${status === option.value ? "border-pine bg-pine-light text-pine-dark" : "border-line bg-white text-ink-soft hover:border-pine/40"}`}>
              <input type="radio" name="suitability-review" value={option.value} checked={status === option.value} onChange={() => setStatus(option.value)} className="accent-pine" />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      <label htmlFor="suitability-review-note" className="mt-4 block text-[14px] font-medium text-ink">
        Factual note <span className="font-normal text-ink-faint">(required when more information is needed or your service cannot meet the stated needs)</span>
      </label>
      <textarea
        id="suitability-review-note"
        value={note}
        onChange={(event) => setNote(event.target.value)}
        maxLength={1200}
        rows={3}
        placeholder="For example, note the specific support capacity, access feature or eligibility detail that needs checking."
        className="field mt-1.5 min-h-24 resize-y"
      />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p aria-live="polite" className={`text-[13px] ${feedback.startsWith("Your organisation") ? "text-pine-dark" : "text-clay"}`}>{feedback}</p>
        <button type="button" onClick={save} disabled={isPending || !status} className="btn-primary disabled:cursor-not-allowed disabled:opacity-50">
          {isPending ? "Saving…" : "Save assessment"}
        </button>
      </div>
      <p className="mt-3 text-[12px] text-ink-faint">This assessment and note are visible to your provider organisation only. Contact the referrer through RoomsNow to request clarification or share a decision.</p>
    </section>
  );
}
