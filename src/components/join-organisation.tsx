"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { acceptInviteAction, joinWithNewAccountAction } from "@/server/actions/referral-team";
import { Field, FormError, SubmitButton } from "./ui";

export function AcceptInviteButton({ token, orgName }: { token: string; orgName: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="space-y-3">
      <FormError message={error ?? undefined} />
      <button
        type="button"
        className="btn-primary"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const result = await acceptInviteAction(token);
            if (result && !result.ok) setError(result.message);
          })
        }
      >
        {pending ? "Joining…" : `Join ${orgName}`}
      </button>
    </div>
  );
}

export function JoinWithNewAccountForm({ token, email }: { token: string; email: string }) {
  const [state, action] = useActionState(joinWithNewAccountAction, { ok: false });
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <FormError message={state.errors?.form} />
      <Field label="Email" name="email">
        <input id="email" value={email} readOnly className="field bg-paper-sunk text-ink-soft" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="First name" name="firstName" error={state.errors?.firstName} required>
          <input id="firstName" name="firstName" autoComplete="given-name" className="field" required />
        </Field>
        <Field label="Last name" name="lastName" error={state.errors?.lastName} required>
          <input id="lastName" name="lastName" autoComplete="family-name" className="field" required />
        </Field>
      </div>
      <Field label="Job title" name="jobTitle" error={state.errors?.jobTitle}>
        <input id="jobTitle" name="jobTitle" autoComplete="organization-title" className="field" placeholder="e.g. Housing Support Officer" />
      </Field>
      <Field label="Choose a password" name="password" error={state.errors?.password} hint="At least 8 characters, with a letter and a number." required>
        <input id="password" name="password" type="password" autoComplete="new-password" className="field" required />
      </Field>
      <label className="flex items-start gap-2.5 text-[14px] text-ink-soft">
        <input type="checkbox" name="terms" className="mt-0.5 h-4 w-4 accent-pine" />
        <span>
          I agree to the <Link href="/terms" className="text-pine-dark underline">terms</Link> and{" "}
          <Link href="/privacy" className="text-pine-dark underline">privacy notice</Link>.
        </span>
      </label>
      {state.errors?.terms && <p className="text-[13px] text-clay" role="alert">{state.errors.terms}</p>}
      <SubmitButton pendingLabel="Creating your account…">Create account and join</SubmitButton>
    </form>
  );
}
