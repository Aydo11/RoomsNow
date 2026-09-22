"use client";

import { useActionState, useState } from "react";
import { sendProviderMailshot } from "@/server/actions/provider-mailshot";
import { Field, FormError, SubmitButton } from "./ui";
import type { FormState } from "@/lib/validation";

const initialState: FormState = { ok: false };

const TABS = [
  {
    value: "NEWS",
    label: "Fill vacant rooms",
    subject: "Fill your voids now — publish your live rooms on RoomsNow",
    body: "Every day a suitable room sits empty is lost income and a missed placement. RoomsNow puts your current vacancies in front of people and professional referrers searching by location, support need and availability.\n\nPublish or update your available rooms today so enquiries are based on accurate information. You can manage adverts, referrals and messages from one provider dashboard.",
    ctaLabel: "List available rooms",
    ctaUrl: "/provider/adverts/new",
  },
  {
    value: "PROMO",
    label: "Promotional code",
    subject: "Fill your voids faster with your RoomsNow provider offer",
    body: "Make your available accommodation easier for referrers and people looking for housing to find. Use the offer below to publish more vacancies, manage enquiries and see how your adverts perform.",
    ctaLabel: "View provider membership",
    ctaUrl: "/provider/membership",
  },
] as const;

type Kind = (typeof TABS)[number]["value"];

export function ProviderMailshotForm({
  filters,
  recipientCount,
}: {
  filters: { status: string; verification?: string; source?: string };
  recipientCount: number;
}) {
  const [state, action] = useActionState(sendProviderMailshot, initialState);
  const [kind, setKind] = useState<Kind>("NEWS");
  const active = TABS.find((tab) => tab.value === kind) ?? TABS[0];

  return (
    <form action={action} className="card space-y-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl">Prepare a provider campaign</h2>
        <span className="rounded-pill bg-paper-sunk px-2.5 py-1 text-[12px] font-medium text-ink-soft">
          {recipientCount} recipient{recipientCount === 1 ? "" : "s"} match the filter
        </span>
      </div>
      <p className="text-sm text-ink-soft">
        Reaches providers who already have a RoomsNow account. RoomsNow prepares a Resend Broadcast
        first; nothing is sent until you confirm it. Resend then queues delivery, honours existing
        opt-outs and tracks bounces, complaints and unsubscribes.
      </p>

      <div className="flex gap-1 rounded-[10px] border border-line bg-paper-sunk p-1" role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={kind === tab.value}
            onClick={() => setKind(tab.value)}
            className={`flex-1 rounded-[8px] px-3 py-2 text-[13px] font-medium transition-colors ${
              kind === tab.value ? "bg-white text-ink shadow-raise" : "text-ink-soft hover:text-ink"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="status" value={filters.status} />
      <input type="hidden" name="verification" value={filters.verification ?? ""} />
      <input type="hidden" name="source" value={filters.source ?? ""} />

      <FormError message={state.errors?.form} />
      {state.message && (
        <p role="status" className={`rounded-[10px] border p-3 text-sm ${state.ok ? "border-pine/30 bg-pine/5 text-pine-dark" : "border-line bg-paper-sunk text-ink-soft"}`}>
          {state.message}
        </p>
      )}

      <label className="block text-sm">
        Your name <span className="text-ink-faint">(shown as the sender)</span>
        <input name="senderName" required maxLength={80} defaultValue="Ayden" className="field mt-1" />
      </label>

      <Field label="Subject" name="subject" required>
        <input key={`${kind}-subject`} name="subject" required maxLength={150} defaultValue={active.subject} className="field" />
      </Field>

      <Field label="Message" name="body" required>
        <textarea key={`${kind}-body`} name="body" required rows={7} defaultValue={active.body} className="field" />
      </Field>

      {kind === "PROMO" && (
        <>
          <Field label="Promo code" name="promoCode" error={state.errors?.promoCode} required>
            <input name="promoCode" required maxLength={40} placeholder="e.g. SPRING20" className="field font-mono uppercase" />
          </Field>
          <Field label="Offer description" name="promoBlurb" hint="Shown above the code in the email.">
            <input name="promoBlurb" maxLength={200} placeholder="e.g. 20% off your first month" className="field" />
          </Field>
        </>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Button label" name="ctaLabel" hint="Optional — defaults to “View in RoomsNow”.">
          <input key={`${kind}-cta-label`} name="ctaLabel" maxLength={40} defaultValue={active.ctaLabel} className="field" />
        </Field>
        <Field label="Button link" name="ctaUrl" hint="Optional — defaults to the dashboard.">
          <input key={`${kind}-cta-url`} name="ctaUrl" maxLength={300} defaultValue={active.ctaUrl} className="field" />
        </Field>
      </div>

      <SubmitButton name="operation" value="prepare" pendingLabel="Preparing in Resend…" disabled={recipientCount === 0 || Boolean(state.broadcastId)}>
        Prepare for {recipientCount} provider{recipientCount === 1 ? "" : "s"}
      </SubmitButton>

      {state.broadcastId && state.importId && (
        <div className="rounded-[12px] border border-pine/30 bg-pine/5 p-4">
          <p className="text-sm font-semibold text-ink">Final confirmation</p>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">
            Only press send after checking the subject, links and recipient filter. Resend will skip
            globally unsubscribed or suppressed contacts automatically. The draft contains the
            version shown when you pressed Prepare; reload this page to discard it and make changes.
          </p>
          <input type="hidden" name="broadcastId" value={state.broadcastId} />
          <input type="hidden" name="importId" value={state.importId} />
          <SubmitButton name="operation" value="send-prepared" pendingLabel="Checking import…" className="btn-primary mt-3">
            Send prepared campaign
          </SubmitButton>
        </div>
      )}
    </form>
  );
}
