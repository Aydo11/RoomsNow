"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { reviewServiceAdvertAction, reviewServiceBusinessAction, reviewServiceEvidenceAction, setServiceReviewHiddenAction } from "@/server/actions/service-admin";
import type { FormState } from "@/lib/validation";
import { FormError, FormSuccess, SubmitButton } from "./ui";

const initial: FormState = { ok: false };

export function BusinessDecisionForm({ businessId, status }: { businessId: string; status: string }) {
  const [state, action] = useActionState(reviewServiceBusinessAction, initial);
  const options =
    status === "SUSPENDED"
      ? [["reinstate", "Reinstate"]]
      : status === "APPROVED"
        ? [["suspend", "Suspend"], ["changes", "Ask for updated evidence"]]
        : [["approve", "Approve"], ["changes", "Ask for changes"], ["reject", "Reject"], ["suspend", "Suspend"]];
  const [decision, setDecision] = useState(options[0][0]);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="businessId" value={businessId} />
      <FormError message={state.errors?.form ?? state.errors?.reason} />
      <FormSuccess message={state.ok ? state.message : undefined} />
      <label htmlFor="decision" className="label">Decision</label>
      <select id="decision" name="decision" className="field" value={decision} onChange={(event) => setDecision(event.target.value)}>
        {options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
      <label htmlFor="reason" className="label">{decision === "approve" || decision === "reinstate" ? "Note to the business (optional)" : "Reason — sent to the business"}</label>
      <textarea id="reason" name="reason" rows={3} maxLength={1000} className="field" />
      <SubmitButton pendingLabel="Saving…">Save decision</SubmitButton>
    </form>
  );
}

export function EvidenceDecisionForm({ evidenceId }: { evidenceId: string }) {
  const [state, action] = useActionState(reviewServiceEvidenceAction, initial);
  if (state.ok) return <FormSuccess message={state.message} />;
  return (
    <form action={action} className="mt-2 flex flex-wrap items-start gap-2">
      <input type="hidden" name="evidenceId" value={evidenceId} />
      <label className="sr-only" htmlFor={`note-${evidenceId}`}>Note</label>
      <input id={`note-${evidenceId}`} name="note" placeholder="Note (required to reject)" className="field min-w-0 flex-1 py-1.5 text-[13px]" />
      <SubmitButton className="btn-primary min-h-9 px-3 py-1.5 text-[13px]" name="decision" value="accept" pendingLabel="…">Accept</SubmitButton>
      <SubmitButton className="btn-secondary min-h-9 px-3 py-1.5 text-[13px] text-clay" name="decision" value="reject" pendingLabel="…">Reject</SubmitButton>
      {(state.errors?.form || state.errors?.note) && <p className="basis-full text-[13px] text-clay" role="alert">{state.errors?.form ?? state.errors?.note}</p>}
    </form>
  );
}

export function AdvertDecisionForm({ advertId, status }: { advertId: string; status: string }) {
  const [state, action] = useActionState(reviewServiceAdvertAction, initial);
  if (state.ok) return <FormSuccess message={state.message} />;
  return (
    <form action={action} className="mt-2 flex flex-wrap items-start gap-2">
      <input type="hidden" name="advertId" value={advertId} />
      <label className="sr-only" htmlFor={`advert-note-${advertId}`}>Note</label>
      <input id={`advert-note-${advertId}`} name="note" placeholder="What to change (required to reject)" className="field min-w-0 flex-1 py-1.5 text-[13px]" />
      {status === "PENDING_REVIEW" && <SubmitButton className="btn-primary min-h-9 px-3 py-1.5 text-[13px]" name="decision" value="approve" pendingLabel="…">Approve</SubmitButton>}
      <SubmitButton className="btn-secondary min-h-9 px-3 py-1.5 text-[13px] text-clay" name="decision" value="reject" pendingLabel="…">{status === "PENDING_REVIEW" ? "Reject" : "Take down"}</SubmitButton>
      {(state.errors?.form || state.errors?.note) && <p className="basis-full text-[13px] text-clay" role="alert">{state.errors?.form ?? state.errors?.note}</p>}
    </form>
  );
}

export function ServiceReviewVisibilityButton({ reviewId, hidden }: { reviewId: string; hidden: boolean }) {
  const [pending, start] = useTransition();
  const [reason, setReason] = useState("");
  const router = useRouter();
  const run = () =>
    start(async () => {
      await setServiceReviewHiddenAction(reviewId, !hidden, reason || undefined);
      router.refresh();
    });
  return (
    <div className="flex flex-wrap items-center gap-2">
      {!hidden && (
        <>
          <label className="sr-only" htmlFor={`hide-${reviewId}`}>Reason for hiding</label>
          <input id={`hide-${reviewId}`} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Reason (audit log)" className="field min-w-0 flex-1 py-1.5 text-[13px]" />
        </>
      )}
      <button type="button" disabled={pending} className="btn-secondary min-h-8 px-2.5 py-1 text-[13px]" onClick={run}>
        {pending ? "Saving…" : hidden ? "Restore" : "Hide"}
      </button>
    </div>
  );
}
