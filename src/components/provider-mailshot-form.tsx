"use client";

import { useActionState, useState } from "react";
import { sendProviderMailshot } from "@/server/actions/provider-mailshot";
import { Field, FormError, FormSuccess, SubmitButton } from "./ui";
import type { FormState } from "@/lib/validation";

const initialState: FormState = { ok: false };

const TABS = [
  {
    value: "NEWS",
    label: "News & updates",
    subjectPlaceholder: "New on RoomsNow this month",
    bodyPlaceholder: "Tell providers what's changed — new features, site updates, or general news.",
  },
  {
    value: "PROMO",
    label: "Promotional code",
    subjectPlaceholder: "A promo code just for you",
    bodyPlaceholder: "Explain the offer and who it's for.",
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
        <h2 className="text-xl">Send a provider mailshot</h2>
        <span className="rounded-pill bg-paper-sunk px-2.5 py-1 text-[12px] font-medium text-ink-soft">
          {recipientCount} recipient{recipientCount === 1 ? "" : "s"} match the filter
        </span>
      </div>
      <p className="text-sm text-ink-soft">
        Reaches providers who already have a RoomsNow account — pick a tab, write the message once,
        and it sends to everyone matching the filter on the left, each as its own email.
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
      <FormSuccess message={state.ok ? state.message : undefined} />

      <label className="block text-sm">
        Your name <span className="text-ink-faint">(shown as the sender)</span>
        <input name="senderName" required maxLength={80} defaultValue="Ayden" className="field mt-1" />
      </label>

      <Field label="Subject" name="subject" required>
        <input name="subject" required maxLength={150} placeholder={active.subjectPlaceholder} className="field" />
      </Field>

      <Field label="Message" name="body" required>
        <textarea name="body" required rows={6} placeholder={active.bodyPlaceholder} className="field" />
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
          <input name="ctaLabel" maxLength={40} placeholder="View in RoomsNow" className="field" />
        </Field>
        <Field label="Button link" name="ctaUrl" hint="Optional — defaults to the dashboard.">
          <input name="ctaUrl" maxLength={300} placeholder="/pricing" className="field" />
        </Field>
      </div>

      <SubmitButton pendingLabel="Sending…" disabled={recipientCount === 0}>
        Send to {recipientCount} provider{recipientCount === 1 ? "" : "s"}
      </SubmitButton>
    </form>
  );
}
