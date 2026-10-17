"use client";

import Link from "next/link";
import { useActionState } from "react";
import { confirmTwoStepAction, disableTwoStepAction, type TwoStepState } from "@/server/actions/two-step";
import { verifyTwoStepAction } from "@/server/actions/auth";
import { Field, FormError, FormSuccess, SubmitButton } from "./ui";

const initial: TwoStepState = { ok: false };

function CodeInput({ autoFocus = true, allowRecovery = false }: { autoFocus?: boolean; allowRecovery?: boolean }) {
  return (
    <input
      id="code"
      name="code"
      inputMode={allowRecovery ? "text" : "numeric"}
      autoComplete="one-time-code"
      autoFocus={autoFocus}
      required
      maxLength={allowRecovery ? 12 : 7}
      placeholder="123456"
      className="field font-mono text-[20px] tracking-[0.3em]"
    />
  );
}

export function TwoStepSetupForm() {
  const [state, action] = useActionState(confirmTwoStepAction, initial);
  if (state.ok && state.recoveryCodes) {
    return (
      <div className="mt-6 space-y-4">
        <FormSuccess message="Two-step login is on." />
        <div className="card p-5">
          <p className="font-semibold text-ink">Save your recovery codes now</p>
          <p className="mt-1 text-[14px] text-ink-soft">Each code works once if you lose your phone. They won&apos;t be shown again, so keep them somewhere safe, like a password manager.</p>
          <ul className="mt-4 grid grid-cols-2 gap-2 font-mono text-[15px]">
            {state.recoveryCodes.map((code) => <li key={code} className="rounded bg-paper-sunk px-3 py-1.5 text-center">{code}</li>)}
          </ul>
        </div>
        <Link href="/admin" className="btn-primary">I&apos;ve saved them, continue</Link>
      </div>
    );
  }
  return (
    <form action={action} className="mt-6 space-y-4">
      <Field label="6-digit code" name="code" error={state.errors?.code}><CodeInput /></Field>
      <SubmitButton className="btn-primary" pendingLabel="Checking…">Turn on two-step login</SubmitButton>
    </form>
  );
}

export function TwoStepDisableForm() {
  const [state, action] = useActionState(disableTwoStepAction, initial);
  if (state.ok) return <div className="mt-5"><FormSuccess message={state.message} /></div>;
  return (
    <form action={action} className="mt-6 space-y-4">
      <Field label="Enter a current code to turn two-step login off" name="code" error={state.errors?.code}><CodeInput autoFocus={false} /></Field>
      <SubmitButton className="btn-secondary" pendingLabel="Turning off…">Turn off two-step login</SubmitButton>
    </form>
  );
}

export function TwoStepLoginForm() {
  const [state, action] = useActionState(verifyTwoStepAction, { ok: false });
  return (
    <form action={action} className="mt-7 space-y-4">
      <FormError message={state.errors?.form} />
      <Field label="Code from your authenticator app" name="code" error={state.errors?.code} hint="Lost your phone? Enter one of your recovery codes instead.">
        <CodeInput allowRecovery />
      </Field>
      <SubmitButton className="btn-primary w-full" pendingLabel="Checking…">Continue</SubmitButton>
    </form>
  );
}
