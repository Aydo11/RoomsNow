"use client";

import { useActionState, useState } from "react";
import {
  manageProviderMembershipGrantAction,
  type AdminMembershipGrantState,
} from "@/server/actions/admin";
import { Field, FormError, FormSuccess, SubmitButton } from "./ui";

const initialState: AdminMembershipGrantState = { ok: false };

const DURATION_OPTIONS = [
  { value: "1", label: "1 month" },
  { value: "2", label: "2 months" },
  { value: "3", label: "3 months" },
  { value: "6", label: "6 months" },
  { value: "12", label: "12 months" },
  { value: "NONE", label: "No expiry" },
  { value: "CUSTOM", label: "Custom date…" },
] as const;

export function AdminMembershipGrantForm({
  companyId,
  currentGrant,
}: {
  companyId: string;
  currentGrant?: { tier: "PROFESSIONAL" | "BUSINESS"; name: string; expiresOn: string | null } | null;
}) {
  const [state, action] = useActionState(manageProviderMembershipGrantAction, initialState);
  const [duration, setDuration] = useState<string>(currentGrant?.expiresOn ? "CUSTOM" : "3");

  return (
    <details className="min-w-[20rem] text-left">
      <summary className="cursor-pointer text-[14px] font-medium text-pine-dark">Manage access</summary>
      <form action={action} className="mt-3 space-y-3 rounded-[12px] border border-line bg-surface-soft p-4">
        <input type="hidden" name="companyId" value={companyId} />
        <FormError message={state.errors?.form} />
        <FormSuccess message={state.ok ? state.message : undefined} />

        {currentGrant && (
          <p className="rounded-[8px] bg-pine-light px-3 py-2 text-[13px] text-pine-dark">
            Admin granted: {currentGrant.name}
            {currentGrant.expiresOn ? ` until ${currentGrant.expiresOn}` : " with no expiry"}
          </p>
        )}

        <Field
          label="Complimentary plan"
          name="tier"
          error={state.errors?.tier}
          hint="Leave as “No change” to add boost credits only, without touching membership."
        >
          <select className="field" name="tier" defaultValue={currentGrant?.tier ?? "PROFESSIONAL"}>
            <option value="">No change</option>
            <option value="PROFESSIONAL">Professional</option>
            <option value="BUSINESS">Business</option>
          </select>
        </Field>
        <Field label="Duration" name="duration" error={state.errors?.expiresOn}>
          <select
            className="field"
            name="duration"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
          >
            {DURATION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
        {duration === "CUSTOM" && (
          <Field label="Expiry date" name="expiresOn" error={state.errors?.expiresOn}>
            <input className="field" type="date" name="expiresOn" defaultValue={currentGrant?.expiresOn ?? ""} />
          </Field>
        )}
        <Field
          label="Promotional boost credits"
          name="boostCredits"
          hint="Adds one-off 24-hour boosts on top of whatever they already have — separate from the membership plan above."
        >
          <input className="field" type="number" name="boostCredits" min={0} max={50} step={1} placeholder="0" />
        </Field>
        <Field label="Reason" name="reason" error={state.errors?.reason} required>
          <textarea
            className="field min-h-20"
            name="reason"
            maxLength={500}
            placeholder="For example: founding provider offer"
            required
          />
        </Field>

        <div className="flex flex-wrap gap-2">
          <SubmitButton pendingLabel="Saving…" name="intent" value="GRANT">
            {currentGrant ? "Update grant" : "Grant access"}
          </SubmitButton>
          {currentGrant && (
            <SubmitButton
              name="intent"
              value="REVOKE"
              pendingLabel="Removing…"
              className="btn-ghost text-clay-dark"
            >
              Remove grant
            </SubmitButton>
          )}
        </div>
        <p className="text-[12px] leading-5 text-ink-faint">
          This changes permissions only. It does not create a payment or alter the provider&apos;s Stripe subscription.
        </p>
      </form>
    </details>
  );
}
