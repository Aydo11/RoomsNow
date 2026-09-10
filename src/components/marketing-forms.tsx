"use client";

import { useActionState } from "react";
import { sendPreLaunchInvite } from "@/server/actions/marketing";
import { SubmitButton } from "./ui";

export function PreLaunchInviteForm() {
  const [state, action] = useActionState(sendPreLaunchInvite, { ok: false });
  return (
    <form action={action} className="card space-y-4 p-5">
      <h2 className="text-xl">Send a pre-launch invite</h2>
      <p className="text-sm text-ink-soft">
        Sends the founding-provider invitation email (Birmingham/UK stats, the void-filling
        pitch, and the 3-months-free Professional offer) to one provider. After they register,
        grant the 3 free months from the provider access table below.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          First name <span className="text-ink-faint">(optional, for &ldquo;Hi [name]&rdquo;)</span>
          <input name="firstName" maxLength={80} className="field mt-1" />
        </label>
        <label className="block text-sm">
          Provider email
          <input name="email" type="email" required className="field mt-1" />
        </label>
      </div>
      <SubmitButton pendingLabel="Sending…">Send invite</SubmitButton>
      {state.message && (
        <p role="status" className={`text-sm ${state.ok ? "text-pine-dark" : "text-clay"}`}>
          {state.message}
        </p>
      )}
    </form>
  );
}
