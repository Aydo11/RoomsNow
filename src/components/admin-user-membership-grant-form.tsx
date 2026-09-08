"use client";

import { useActionState } from "react";
import { manageUserMembershipGrantAction, type AdminMembershipGrantState } from "@/server/actions/admin";
import { Field, FormError, FormSuccess, SubmitButton } from "./ui";

const initialState: AdminMembershipGrantState = { ok: false };

export function AdminUserMembershipGrantForm({
  userId,
  currentGrant,
}: {
  userId: string;
  currentGrant?: { name: string; expiresOn: string | null } | null;
}) {
  const [state, action] = useActionState(manageUserMembershipGrantAction, initialState);

  return (
    <details className="min-w-[18rem] text-left">
      <summary className="cursor-pointer text-[14px] font-medium text-pine-dark">Manage access</summary>
      <form action={action} className="mt-3 space-y-3 rounded-[12px] border border-line bg-paper p-4">
        <input type="hidden" name="userId" value={userId} />
        <input type="hidden" name="tier" value="REFERRER_PRO" />
        <FormError message={state.errors?.form} />
        <FormSuccess message={state.ok ? state.message : undefined} />

        {currentGrant && (
          <p className="rounded-[8px] bg-pine-light px-3 py-2 text-[13px] text-pine-dark">
            Admin granted: {currentGrant.name}
            {currentGrant.expiresOn ? ` until ${currentGrant.expiresOn}` : " with no expiry"}
          </p>
        )}

        <Field label="Complimentary plan" name="tier-display">
          <input id="tier-display" className="field bg-paper-sunk" value="Referrer Pro" readOnly />
        </Field>
        <Field label="Expiry date" name="expiresOn" error={state.errors?.expiresOn} hint="Leave blank until an admin ends access.">
          <input className="field" type="date" name="expiresOn" defaultValue={currentGrant?.expiresOn ?? ""} />
        </Field>
        <Field label="Reason" name="reason" error={state.errors?.reason} required>
          <textarea className="field min-h-20" name="reason" maxLength={500} placeholder="For example: partner trial" required />
        </Field>

        <div className="flex flex-wrap gap-2">
          <SubmitButton pendingLabel="Saving…" name="intent" value="GRANT">
            {currentGrant ? "Update grant" : "Grant Pro access"}
          </SubmitButton>
          {currentGrant && (
            <SubmitButton name="intent" value="REVOKE" pendingLabel="Removing…" className="btn-ghost text-clay-dark">
              Remove grant
            </SubmitButton>
          )}
        </div>
        <p className="text-[12px] leading-5 text-ink-faint">This changes permissions only and leaves Stripe billing untouched.</p>
      </form>
    </details>
  );
}
