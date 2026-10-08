"use client";

import { useActionState, useState } from "react";
import { manageWhatsappGrantAction, type AdminMembershipGrantState } from "@/server/actions/admin";
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

/** Give one provider WhatsApp enquiries for free, whatever plan they are on. */
export function AdminWhatsappGrantForm({
  companyId,
  current,
}: {
  companyId: string;
  current: { active: boolean; expiresOn: string | null };
}) {
  const [state, action] = useActionState(manageWhatsappGrantAction, initialState);
  const [duration, setDuration] = useState<string>("3");

  return (
    <details className="min-w-[18rem] text-left">
      <summary className="cursor-pointer text-[14px] font-medium text-pine-dark">WhatsApp</summary>
      <form action={action} className="mt-3 space-y-3 rounded-[12px] border border-line bg-surface-soft p-4">
        <input type="hidden" name="companyId" value={companyId} />
        <FormError message={state.errors?.form} />
        <FormSuccess message={state.ok ? state.message : undefined} />

        {current.active && (
          <p className="rounded-[8px] bg-pine-light px-3 py-2 text-[13px] text-pine-dark">
            WhatsApp granted{current.expiresOn ? ` until ${current.expiresOn}` : " with no expiry"}
          </p>
        )}

        <Field label="How long" name="duration" error={state.errors?.expiresOn}>
          <select className="field" name="duration" value={duration} onChange={(e) => setDuration(e.target.value)}>
            {DURATION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </Field>
        {duration === "CUSTOM" && (
          <Field label="Expiry date" name="expiresOn" error={state.errors?.expiresOn}>
            <input className="field" type="date" name="expiresOn" defaultValue={current.expiresOn ?? ""} />
          </Field>
        )}
        <Field label="Reason" name="reason" error={state.errors?.reason} required>
          <textarea className="field min-h-16" name="reason" maxLength={500} placeholder="For example: founding provider trial" required />
        </Field>

        <div className="flex flex-wrap gap-2">
          <SubmitButton pendingLabel="Saving…" name="intent" value="GRANT">
            {current.active ? "Update WhatsApp grant" : "Grant WhatsApp"}
          </SubmitButton>
          {current.active && (
            <SubmitButton name="intent" value="REVOKE" pendingLabel="Removing…" className="btn-ghost text-clay">
              Remove
            </SubmitButton>
          )}
        </div>
        <p className="text-[12px] leading-5 text-ink-faint">
          Works on any plan, including Free. No charge is made and their membership is not changed.
        </p>
      </form>
    </details>
  );
}
