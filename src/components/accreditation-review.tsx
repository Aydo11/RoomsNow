"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ACCREDITATION_SCHEMES, type AccreditationScheme } from "@/lib/accreditations";
import { reviewAccreditationAction } from "@/server/actions/accreditations";

export function AccreditationReview({ id, scheme, initialRating }: { id: string; scheme: string; initialRating: string | null }) {
  const router = useRouter();
  const [rating, setRating] = useState(initialRating ?? "");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const config = ACCREDITATION_SCHEMES[scheme as AccreditationScheme];
  const ratings = config?.ratings as readonly string[] | undefined;

  function run(approve: boolean) {
    startTransition(async () => {
      const result = await reviewAccreditationAction(id, approve, rating, note);
      if (!result.ok) setMessage(result.message ?? "Could not save the review.");
      else router.refresh();
    });
  }

  return (
    <div className="space-y-2 rounded-[10px] border border-line bg-paper p-3">
      <label className="block text-[12px] font-semibold" htmlFor={`rating-${id}`}>Confirmed rating or level</label>
      {ratings?.length ? (
        <select id={`rating-${id}`} className="field" value={rating} onChange={(event) => setRating(event.target.value)}>
          <option value="">Choose…</option>
          {ratings.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
      ) : <input id={`rating-${id}`} className="field" value={rating} onChange={(event) => setRating(event.target.value)} maxLength={60} />}
      <label className="block text-[12px] font-semibold" htmlFor={`note-${id}`}>Review note</label>
      <textarea id={`note-${id}`} className="field" rows={3} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Required when rejecting; useful for the audit trail." />
      {message && <p className="text-[12px] text-clay-dark">{message}</p>}
      <div className="flex flex-wrap gap-2">
        <button className="btn-primary" disabled={pending || !rating} onClick={() => run(true)}>Approve badge</button>
        <button className="btn-ghost text-clay-dark" disabled={pending || note.trim().length < 4} onClick={() => run(false)}>Reject</button>
      </div>
    </div>
  );
}
