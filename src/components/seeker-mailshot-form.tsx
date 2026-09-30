"use client";

import { useActionState, useState } from "react";
import { sendSeekerMailshot } from "@/server/actions/seeker-mailshot";
import { Field, FormError, SubmitButton } from "./ui";
import { EmailPreview } from "./email-preview";
import type { FormState } from "@/lib/validation";

const initialState: FormState = { ok: false };
const DEFAULT_SUBJECT = "About RoomsNow: how we help you find the right room";

/**
 * Prepare / test / send the "About RoomsNow" email to people looking for a
 * room, with a live preview of exactly what they'll receive.
 */
export function SeekerMailshotForm({ audience, recipientCount }: { audience: string; recipientCount: number }) {
  const [state, action] = useActionState(sendSeekerMailshot, initialState);
  const [senderName, setSenderName] = useState("Ayden");
  const [subject, setSubject] = useState(DEFAULT_SUBJECT);
  const [note, setNote] = useState("");
  return (
    <div className="space-y-4">
      <form action={action} className="card space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl">About RoomsNow email</h2>
          <span className="rounded-pill bg-paper-sunk px-2.5 py-1 text-[12px] font-medium tabular-nums text-ink-soft">
            {recipientCount} {recipientCount === 1 ? "person" : "people"}
          </span>
        </div>
        <p className="text-sm text-ink-soft">
          Explains who we are, what RoomsNow offers and how we connect people with the right room, with a
          button to start searching. Each email greets the person by first name and includes an
          unsubscribe link. Preparing makes a draft in Resend; nothing is sent until you confirm.
        </p>
        <input type="hidden" name="audience" value={audience} />

        <FormError message={state.errors?.form} />
        {state.message && (
          <p role="status" className={`rounded-[10px] border p-3 text-sm ${state.ok ? "border-pine/30 bg-pine/5 text-pine-dark" : "border-line bg-paper-sunk text-ink-soft"}`}>
            {state.message}
          </p>
        )}

        <label className="block text-sm">
          Your name <span className="text-ink-faint">(signs off the email)</span>
          <input id="seeker-sender" name="senderName" required maxLength={80} value={senderName} onChange={(event) => setSenderName(event.target.value)} className="field mt-1" />
        </label>

        <Field label="Subject" name="subject" required>
          <input id="seeker-subject" name="subject" required maxLength={150} value={subject} onChange={(event) => setSubject(event.target.value)} className="field" />
        </Field>

        <Field label="Personal note" name="note" hint="Optional. Appears after the greeting, e.g. news or a thank you. Separate paragraphs with a blank line.">
          <textarea id="seeker-note" name="note" rows={4} maxLength={2000} value={note} onChange={(event) => setNote(event.target.value)} placeholder="e.g. We've just added supported housing in Leeds and Bradford." className="field" />
        </Field>

        <div className="flex flex-wrap gap-2">
          <SubmitButton name="operation" value="test" pendingLabel="Sending test…" className="btn-secondary">
            Send me a test
          </SubmitButton>
          <SubmitButton name="operation" value="prepare" pendingLabel="Preparing in Resend…" disabled={recipientCount === 0 || Boolean(state.broadcastId)}>
            Prepare for {recipientCount} {recipientCount === 1 ? "person" : "people"}
          </SubmitButton>
        </div>

        {state.broadcastId && state.importId && (
          <div className="rounded-[12px] border border-pine/30 bg-pine/5 p-4">
            <p className="text-sm font-semibold text-ink">Final confirmation</p>
            <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">
              Check the preview below first. Resend skips anyone who has unsubscribed or bounced. The draft
              holds the version from when you pressed Prepare; reload this page to discard it and make changes.
            </p>
            <input type="hidden" name="broadcastId" value={state.broadcastId} />
            <input type="hidden" name="importId" value={state.importId} />
            <SubmitButton name="operation" value="send-prepared" pendingLabel="Checking import…" className="btn-primary mt-3">
              Send to {recipientCount} {recipientCount === 1 ? "person" : "people"}
            </SubmitButton>
          </div>
        )}
      </form>

      <EmailPreview values={{ type: "seeker", senderName, note }} subject={subject} />
    </div>
  );
}

