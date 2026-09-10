"use client";

import { useActionState } from "react";
import { sendPreLaunchInvite } from "@/server/actions/marketing";
import { SubmitButton } from "./ui";

export function PreLaunchInviteForm() {
  const [state, action] = useActionState(sendPreLaunchInvite, { ok: false });
  return (
    <form action={action} className="card space-y-4 p-5">
      <h2 className="text-xl">Send a pre-launch mailshot</h2>
      <p className="text-sm text-ink-soft">
        Sends the founding-provider invitation email (Birmingham/UK stats, the void-filling
        pitch, and the 3-months-free Professional offer) to every address below in one batch —
        up to 150 at a time, each sent individually. After someone registers, grant their 3 free
        months from the provider access table below.
      </p>
      <label className="block text-sm">
        Your name <span className="text-ink-faint">(shown as the sender)</span>
        <input name="senderName" required maxLength={80} defaultValue="Ayden" className="field mt-1" />
      </label>
      <label className="block text-sm">
        Provider emails <span className="text-ink-faint">(one per line, or comma-separated)</span>
        <textarea
          name="emails"
          required
          rows={6}
          placeholder={"provider1@example.com\nprovider2@example.com\nprovider3@example.com"}
          className="field mt-1 font-mono text-[13px]"
        />
      </label>
      <label className="block text-sm">
        First name <span className="text-ink-faint">(optional, only used for &ldquo;Hi [name]&rdquo; when sending to a single address)</span>
        <input name="firstName" maxLength={80} className="field mt-1" />
      </label>
      <SubmitButton pendingLabel="Sending…">Send mailshot</SubmitButton>
      {state.message && (
        <p role="status" className={`text-sm ${state.ok ? "text-pine-dark" : "text-clay"}`}>
          {state.message}
        </p>
      )}
    </form>
  );
}
