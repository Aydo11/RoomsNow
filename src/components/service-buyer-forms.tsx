"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  messageServiceBusinessAction,
  requestServiceQuoteAction,
  submitServiceReviewAction,
  toggleServiceFavouriteAction,
  updateServiceQuoteAction,
} from "@/server/actions/service-buyer";
import { URGENCY_LABELS, type ServiceQuoteStatusValue } from "@/lib/service-marketplace";
import type { FormState } from "@/lib/validation";
import { Field, FormError, FormSuccess, SubmitButton } from "./ui";
import { clsx } from "@/lib/clsx";

const initial: FormState = { ok: false };

export function ServiceFavouriteButton({ advertId, saved: initiallySaved, compact = false }: { advertId: string; saved: boolean; compact?: boolean }) {
  const [saved, setSaved] = useState(initiallySaved);
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      aria-pressed={saved}
      disabled={pending}
      onClick={() => start(async () => { const result = await toggleServiceFavouriteAction(advertId); setSaved(result.saved); })}
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-pill border px-3 py-1.5 text-[13px] font-medium transition-colors disabled:opacity-60",
        saved ? "border-brand bg-brand/10 text-brand" : "border-line text-ink-soft hover:border-brand/40 hover:text-brand",
        compact && "px-2 py-1",
      )}
    >
      <svg viewBox="0 0 20 20" className="h-4 w-4" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
        <path d="M10 17s-6.5-3.9-6.5-8.6A3.6 3.6 0 0 1 10 6a3.6 3.6 0 0 1 6.5 2.4C16.5 13.1 10 17 10 17Z" strokeLinejoin="round" />
      </svg>
      <span className={compact ? "sr-only" : undefined}>{saved ? "Saved" : "Save"}</span>
    </button>
  );
}

const TEMPLATES = [
  { label: "Void turnaround", text: "We have a room becoming vacant and need it turned around before the next resident moves in. Please quote for the work described below." },
  { label: "Certificate due", text: "A compliance certificate is due for renewal at this property. Please quote and let us know your earliest availability." },
  { label: "Repair", text: "We need a repair at a shared supported house. Residents are living there, so please arrange access with us first." },
];

export function ServiceQuoteRequestForm({ advertId, service, defaultLocation }: { advertId: string; service: string; defaultLocation: string }) {
  const [state, action] = useActionState(requestServiceQuoteAction, initial);
  const [description, setDescription] = useState("");
  const e = state.errors ?? {};
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="advertId" value={advertId} />
      <FormError message={e.form} />
      <Field label="What do you need?" name="service" required error={e.service}>
        <input id="service" name="service" defaultValue={service} required maxLength={120} className="field" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Where" name="location" required hint="Town or postcode — no full address yet" error={e.location}>
          <input id="location" name="location" defaultValue={defaultLocation} required className="field" />
        </Field>
        <Field label="How soon" name="urgency" error={e.urgency}>
          <select id="urgency" name="urgency" className="field" defaultValue="FLEXIBLE">
            {Object.entries(URGENCY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </Field>
        <Field label="Preferred date" name="preferredDate" error={e.preferredDate}>
          <input id="preferredDate" name="preferredDate" type="date" className="field" />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Budget from (£)" name="budgetMin" error={e.budgetMin}>
            <input id="budgetMin" name="budgetMin" inputMode="decimal" className="field" />
          </Field>
          <Field label="to (£)" name="budgetMax" error={e.budgetMax}>
            <input id="budgetMax" name="budgetMax" inputMode="decimal" className="field" />
          </Field>
        </div>
      </div>
      <div>
        <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
          <span className="text-[12.5px] text-ink-faint">Start from:</span>
          {TEMPLATES.map((template) => (
            <button key={template.label} type="button" className="chip text-[12.5px]" onClick={() => setDescription((current) => (current ? `${current}\n\n${template.text}` : template.text))}>
              {template.label}
            </button>
          ))}
        </div>
        <Field label="Details" name="description" required hint="Describe the job. Don't include residents' names or personal details." error={e.description}>
          <textarea id="description" name="description" rows={6} required maxLength={3000} value={description} onChange={(event) => setDescription(event.target.value)} className="field" />
        </Field>
      </div>
      <Field label="Photos or documents" name="attachments" hint="Up to 4 — JPG, PNG, WebP or PDF" error={e.attachments}>
        <input id="attachments" name="attachments" type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf" className="field" />
      </Field>
      <SubmitButton className="btn-primary w-full sm:w-auto" pendingLabel="Sending…">Send quote request</SubmitButton>
    </form>
  );
}

export function MessageServiceBusinessForm({ advertId, businessName }: { advertId: string; businessName: string }) {
  const [state, action] = useActionState(messageServiceBusinessAction, initial);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="advertId" value={advertId} />
      <FormError message={state.errors?.form} />
      <Field label={`Message ${businessName}`} name="body" error={state.errors?.body}>
        <textarea id="body" name="body" rows={4} maxLength={4000} required className="field" placeholder="Hi, do you cover our area and when could you next visit?" />
      </Field>
      <SubmitButton className="btn-secondary" pendingLabel="Sending…">Send message</SubmitButton>
    </form>
  );
}

const BUYER_ACTIONS: Partial<Record<ServiceQuoteStatusValue, Array<{ to: ServiceQuoteStatusValue; label: string; primary?: boolean }>>> = {
  NEW: [{ to: "CANCELLED", label: "Cancel request" }],
  VIEWED: [{ to: "CANCELLED", label: "Cancel request" }],
  QUOTED: [{ to: "ACCEPTED", label: "Accept quote", primary: true }, { to: "DECLINED", label: "Decline quote" }, { to: "CANCELLED", label: "Cancel request" }],
  ACCEPTED: [{ to: "COMPLETED", label: "Mark job complete", primary: true }, { to: "CANCELLED", label: "Cancel" }],
};

export function BuyerQuoteActions({ quoteId, status }: { quoteId: string; status: ServiceQuoteStatusValue }) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();
  const options = BUYER_ACTIONS[status] ?? [];
  if (!options.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {options.map((option) => (
        <button
          key={option.to}
          type="button"
          disabled={pending}
          className={option.primary ? "btn-primary" : "btn-secondary"}
          onClick={() => start(async () => { const result = await updateServiceQuoteAction(quoteId, option.to); setMessage(result.ok ? null : result.message); router.refresh(); })}
        >
          {option.label}
        </button>
      ))}
      {message && <span className="text-[13px] text-clay" role="alert">{message}</span>}
    </div>
  );
}

function StarInput({ name, label }: { name: string; label: string }) {
  const [value, setValue] = useState(0);
  return (
    <fieldset>
      <legend className="label">{label}</legend>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <label key={star} className="cursor-pointer">
            <input type="radio" name={name} value={star} className="peer sr-only" checked={value === star} onChange={() => setValue(star)} required />
            <span className="sr-only">{star} star{star === 1 ? "" : "s"}</span>
            <svg viewBox="0 0 20 20" aria-hidden="true" className={clsx("h-7 w-7 rounded peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-brand", star <= value ? "text-clay" : "text-line-strong")} fill="currentColor">
              <path d="M10 1.5l2.6 5.6 6.1.6-4.6 4.1 1.3 6-5.4-3.1-5.4 3.1 1.3-6-4.6-4.1 6.1-.6L10 1.5Z" />
            </svg>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function ServiceReviewForm({ quoteId }: { quoteId: string }) {
  const [state, action] = useActionState(submitServiceReviewAction, initial);
  if (state.ok) return <FormSuccess message={state.message} />;
  const firstError = state.errors ? Object.values(state.errors)[0] : undefined;
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="quoteId" value={quoteId} />
      <FormError message={firstError} />
      <div className="grid gap-4 sm:grid-cols-2">
        <StarInput name="rating" label="Overall" />
        <StarInput name="quality" label="Quality of work" />
        <StarInput name="communication" label="Communication" />
        <StarInput name="timeliness" label="Timeliness" />
        <StarInput name="value" label="Value for money" />
      </div>
      <Field label="Comments" name="comment" hint="Public. Don't name residents or share addresses.">
        <textarea id="comment" name="comment" rows={4} maxLength={1500} className="field" />
      </Field>
      <SubmitButton pendingLabel="Publishing…">Publish review</SubmitButton>
    </form>
  );
}
