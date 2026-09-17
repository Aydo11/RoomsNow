"use client";

import { useActionState } from "react";
import { sendPreLaunchInvite } from "@/server/actions/marketing";
import { SubmitButton } from "./ui";

export function PreLaunchInviteForm() {
  const [state, action] = useActionState(sendPreLaunchInvite, { ok: false });
  return (
    <form action={action} className="card space-y-4 p-5">
      <h2 className="text-xl">Prepare a provider outreach campaign</h2>
      <p className="text-sm text-ink-soft">
        Imports up to 500 valid business contacts into a campaign-specific Resend segment and
        prepares the founding-provider invitation. Nothing is sent until you confirm it. Only add
        organisations you can lawfully contact; never use bought, scraped or personal lists.
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
      <SubmitButton name="operation" value="prepare" pendingLabel="Preparing in Resend…" disabled={Boolean(state.broadcastId)}>
        Prepare campaign
      </SubmitButton>
      {state.message && (
        <p role="status" className={`text-sm ${state.ok ? "text-pine-dark" : "text-clay"}`}>
          {state.message}
        </p>
      )}
      {state.broadcastId && state.importId && (
        <div className="rounded-[12px] border border-pine/30 bg-pine/5 p-4">
          <p className="text-sm font-semibold text-ink">Final confirmation</p>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">
            Check the offer, list source and links before sending. Resend will retain previous
            opt-outs and suppress addresses that have bounced or complained. Reload this page if
            you want to discard this draft and change the list.
          </p>
          <input type="hidden" name="broadcastId" value={state.broadcastId} />
          <input type="hidden" name="importId" value={state.importId} />
          <SubmitButton name="operation" value="send-prepared" pendingLabel="Checking import…" className="btn-primary mt-3">
            Send prepared campaign
          </SubmitButton>
        </div>
      )}
    </form>
  );
}
