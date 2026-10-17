"use client";

import { useActionState } from "react";
import { addBlockedPhraseAction } from "@/server/actions/safety";
import { SubmitButton } from "./ui";

export function AddBlockedPhraseForm() {
  const [state, action] = useActionState(addBlockedPhraseAction, { ok: false });
  return (
    <form action={action} className="mt-4 flex flex-wrap items-end gap-3">
      <label className="block min-w-[220px] flex-1 text-sm">
        Word or phrase
        <input name="phrase" required maxLength={80} placeholder="e.g. western union" className="field mt-1" />
      </label>
      <label className="block text-sm">
        What happens
        <select name="action" defaultValue="BLOCK" className="field mt-1">
          <option value="BLOCK">Block it (can&apos;t be sent or saved)</option>
          <option value="FLAG">Flag it (sent, but I get alerted)</option>
        </select>
      </label>
      <SubmitButton pendingLabel="Adding…">Add</SubmitButton>
      {state.message && <p role="status" className={`w-full text-sm ${state.ok ? "text-pine-dark" : "text-clay"}`}>{state.message}</p>}
    </form>
  );
}
