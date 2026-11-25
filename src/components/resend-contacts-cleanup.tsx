"use client";

import { useActionState } from "react";
import { clearResendContactsAction } from "@/server/actions/marketing";
import { FormError, SubmitButton } from "./ui";
import type { FormState } from "@/lib/validation";

const initialState: FormState = { ok: false };

/** Shown on the campaign page for when Resend says the contact limit is reached. */
export function ResendContactsCleanup() {
  const [state, action] = useActionState(clearResendContactsAction, initialState);
  return (
    <form
      action={action}
      className="card space-y-2 p-4 text-[13px] leading-relaxed text-ink-soft"
      onSubmit={(event) => {
        if (!confirm("Delete subscribed contacts from Resend? People who unsubscribed are kept. Each campaign adds its own recipients back.")) event.preventDefault();
      }}
    >
      <p className="font-medium text-ink">Resend contact limit reached?</p>
      <p>
        Removes old contacts from Resend to make room. Anyone who unsubscribed is kept, so they&apos;re never emailed
        again. This can take a couple of minutes.
      </p>
      <FormError message={state.errors?.form} />
      {state.ok && state.message && <p className="font-medium text-positive">{state.message}</p>}
      <SubmitButton>Clear old contacts</SubmitButton>
    </form>
  );
}
