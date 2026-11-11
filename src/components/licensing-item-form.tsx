"use client";

import { useActionState } from "react";
import { saveLicensingItemAction } from "@/server/actions/licensing";
import { SubmitButton } from "./ui";

/** One checklist row: tick it off, add a note, attach evidence. */
export function LicensingItemForm({
  itemKey,
  label,
  hint,
  done,
  note,
  evidence,
}: {
  itemKey: string;
  label: string;
  hint: string;
  done: boolean;
  note: string | null;
  evidence: { id: string; name: string } | null;
}) {
  const [state, action] = useActionState(saveLicensingItemAction, { ok: false });
  const id = `lic-${itemKey.replace(/\./g, "-")}`;
  return (
    <form action={action} className="py-4">
      <input type="hidden" name="key" value={itemKey} />
      <label htmlFor={`${id}-done`} className="flex cursor-pointer items-start gap-3">
        <input id={`${id}-done`} name="done" type="checkbox" defaultChecked={done} className="mt-1 h-5 w-5 shrink-0 accent-pine" />
        <span>
          <span className="block text-[15.5px] font-semibold">{label}</span>
          <span className="block text-[13.5px] text-ink-soft">{hint}</span>
        </span>
      </label>
      <details className="ml-8 mt-2" open={Boolean(note || evidence) || undefined}>
        <summary className="cursor-pointer text-[13px] font-semibold text-pine-dark">Notes and evidence</summary>
        <div className="mt-2 space-y-2">
          <label htmlFor={`${id}-note`} className="sr-only">Note</label>
          <textarea id={`${id}-note`} name="note" defaultValue={note ?? ""} maxLength={500} placeholder="Where this is kept, who owns it, what's left to do" className="field min-h-[64px] text-[14px]" />
          {evidence && (
            <p className="text-[13px]">
              Evidence: <a href={`/api/documents/${evidence.id}`} target="_blank" rel="noopener" className="font-semibold text-pine-dark underline">{evidence.name}</a>
            </p>
          )}
          <label htmlFor={`${id}-evidence`} className="block text-[13px] text-ink-soft">{evidence ? "Replace evidence" : "Attach evidence"} (PDF, Word or image, private to your team)</label>
          <input id={`${id}-evidence`} name="evidence" type="file" className="field text-[13px]" />
          {state.errors?.evidence && <p role="alert" className="text-[13px] font-medium text-clay">{state.errors.evidence}</p>}
        </div>
      </details>
      <div className="ml-8 mt-2 flex items-center gap-3">
        <SubmitButton pendingLabel="Saving…" className="btn-secondary min-h-9 px-3 py-1.5 text-[13px]">Save</SubmitButton>
        {state.ok && <span className="text-[13px] font-semibold text-pine-dark" aria-live="polite">Saved</span>}
        {state.errors?.form && <span role="alert" className="text-[13px] text-clay">{state.errors.form}</span>}
      </div>
    </form>
  );
}
