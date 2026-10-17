"use client";

import { useState, useTransition, useActionState } from "react";
import { useRouter } from "next/navigation";
import { deleteAccountAction, exportMyDataAction } from "@/server/actions/profile";
import { changePasswordAction, logoutEverywhereAction } from "@/server/actions/auth";
import { Field, FormError, SubmitButton } from "./ui";

export function AccountSettings() {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  function download() {
    startTransition(async () => {
      const data = await exportMyDataAction();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "my-data.json";
      link.click();
      URL.revokeObjectURL(url);
    });
  }

  return (
    <>
      <SecuritySection />

      <div className="card mt-6 p-6">
        <h2 className="text-[20px]">Your data</h2>
        <p className="mt-2 max-w-[62ch] text-[15px] leading-relaxed text-ink-soft">
          Download everything we hold about you as a JSON file — profile, adverts, requests, saved
          properties, notifications and messages you&apos;ve sent.
        </p>
        <button onClick={download} disabled={pending} className="btn-secondary mt-4">
          {pending ? "Preparing…" : "Download my data"}
        </button>
      </div>

      <div className="card mt-6 border-clay/30 p-6">
        <h2 className="text-[20px]">Delete account</h2>
        <p className="mt-2 max-w-[62ch] text-[15px] leading-relaxed text-ink-soft">
          Your profile and adverts are removed straight away. A minimal record is kept for 30 days
          so providers you&apos;ve contacted can close off their side, then it&apos;s deleted.
        </p>
        {confirming ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              className="btn-danger"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await deleteAccountAction();
                  if (result.redirect) router.push(result.redirect);
                })
              }
            >
              Yes, delete my account
            </button>
            <button className="btn-ghost" onClick={() => setConfirming(false)}>Keep my account</button>
          </div>
        ) : (
          <button className="btn-danger mt-4" onClick={() => setConfirming(true)}>Delete my account</button>
        )}
      </div>
    </>
  );
}

function SecuritySection() {
  const [state, action] = useActionState(changePasswordAction, { ok: false });

  return (
    <div className="card mt-6 p-6">
      <h2 className="text-[20px]">Password and sessions</h2>

      <form action={action} className="mt-4 grid max-w-md gap-4">
        <FormError message={state.errors?.form} />
        <Field label="Current password" name="currentPassword" error={state.errors?.currentPassword}>
          <input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" className="field" />
        </Field>
        <Field
          label="New password"
          name="password"
          hint="At least 12 characters, with a letter and a number."
          error={state.errors?.password}
        >
          <input id="password" name="password" type="password" autoComplete="new-password" className="field" />
        </Field>
        <Field label="Confirm new password" name="confirmPassword" error={state.errors?.confirmPassword}>
          <input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" className="field" />
        </Field>
        <SubmitButton pendingLabel="Changing…">Change password</SubmitButton>
        <p className="text-[13px] text-ink-faint">
          Changing your password signs you out everywhere, including here.
        </p>
      </form>

      <div className="mt-6 border-t border-line pt-5">
        <p className="max-w-[62ch] text-[15px] leading-relaxed text-ink-soft">
          Two-step login asks for a code from an app on your phone when you sign in, so a stolen password isn&apos;t enough.
        </p>
        <a href="/security/two-step" className="btn-secondary mt-3">Two-step login</a>
      </div>

      <form action={logoutEverywhereAction} className="mt-6 border-t border-line pt-5">
        <p className="max-w-[62ch] text-[15px] leading-relaxed text-ink-soft">
          Signed in somewhere you don&apos;t recognise? This ends every session on every device
          straight away.
        </p>
        <button className="btn-secondary mt-3">Sign out everywhere</button>
      </form>
    </div>
  );
}
