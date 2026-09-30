"use client";

import { useActionState, useEffect, useState } from "react";
import { sendSeekerMailshot } from "@/server/actions/seeker-mailshot";
import { Field, FormError, SubmitButton } from "./ui";
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
  const [previewSrc, setPreviewSrc] = useState(previewUrl("", "Ayden"));
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);

  // Refresh the preview a moment after typing stops.
  useEffect(() => {
    const timer = window.setTimeout(() => setPreviewSrc(previewUrl(note, senderName)), 600);
    return () => window.clearTimeout(timer);
  }, [note, senderName]);

  // The site can't be framed (anti-clickjacking headers), so the preview
  // loads the HTML and shows it in a sandboxed srcdoc frame instead.
  useEffect(() => {
    const controller = new AbortController();
    fetch(previewSrc, { signal: controller.signal, cache: "no-store" })
      .then((response) => (response.ok ? response.text() : Promise.reject(new Error(String(response.status)))))
      .then((html) => setPreviewHtml(html.replace("<head>", '<head><base target="_blank">')))
      .catch((error) => {
        if (!controller.signal.aborted) {
          console.error("Preview failed", error);
          setPreviewHtml("<p style=\"font-family:sans-serif;padding:24px\">The preview couldn't load. Try Open full size.</p>");
        }
      });
    return () => controller.abort();
  }, [previewSrc]);

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

      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
          <p className="text-sm font-semibold text-ink">Preview</p>
          <a href={previewSrc} target="_blank" rel="noopener" className="text-[13px] font-medium text-pine hover:underline">
            Open full size
          </a>
        </div>
        {previewHtml === null ? (
          <div className="grid h-[720px] place-items-center bg-paper-sunk text-sm text-ink-soft">Loading preview…</div>
        ) : (
          <iframe
            title="Email preview"
            srcDoc={previewHtml}
            sandbox="allow-popups allow-popups-to-escape-sandbox"
            className="block h-[720px] w-full bg-paper-sunk"
          />
        )}
      </div>
    </div>
  );
}

function previewUrl(note: string, senderName: string) {
  const params = new URLSearchParams();
  if (note.trim()) params.set("note", note.slice(0, 2000));
  if (senderName.trim()) params.set("senderName", senderName.slice(0, 80));
  const query = params.toString();
  return `/api/admin/seeker-mailshot/preview${query ? `?${query}` : ""}`;
}
