"use client";

import { useActionState, useState } from "react";
import { clsx } from "@/lib/clsx";
import { submitCheckInAction, type CheckInState } from "@/server/actions/checkins";

const OPTIONS = [
  { value: "GOING_WELL", label: "Going well", hint: "Settled, engaging, no worries", tone: "border-emerald-600 bg-emerald-50 text-emerald-800" },
  { value: "SOME_CONCERNS", label: "Some concerns", hint: "Worth keeping an eye on", tone: "border-amber-500 bg-amber-50 text-amber-800" },
  { value: "AT_RISK", label: "At risk", hint: "Could break down without support", tone: "border-red-600 bg-red-50 text-red-800" },
  { value: "ENDED", label: "Placement ended", hint: "They've moved out or been evicted", tone: "border-ink bg-paper-sunk text-ink" },
] as const;

export function CheckInForm({
  referralId,
  week,
  initialHealth,
  initialNote,
}: {
  referralId: string;
  week: 4 | 12;
  initialHealth?: string | null;
  initialNote?: string | null;
}) {
  const [state, action, pending] = useActionState<CheckInState, FormData>(submitCheckInAction, { ok: false });
  const [health, setHealth] = useState(initialHealth ?? "");

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="referralId" value={referralId} />
      <input type="hidden" name="week" value={week} />
      <input type="hidden" name="health" value={health} />
      <fieldset>
        <legend className="text-[15px] font-semibold text-ink">Is the placement going well?</legend>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={health === option.value}
              onClick={() => setHealth(option.value)}
              className={clsx(
                "rounded-[12px] border-2 px-4 py-3 text-left transition active:scale-[0.98]",
                health === option.value ? option.tone : "border-line bg-white text-ink hover:border-pine/40",
              )}
            >
              <span className="block text-[15px] font-semibold">{option.label}</span>
              <span className="block text-[13px] opacity-80">{option.hint}</span>
            </button>
          ))}
        </div>
      </fieldset>
      <div>
        <label htmlFor={`note-${week}`} className="label">
          Anything to add? (optional)
        </label>
        <textarea
          id={`note-${week}`}
          name="note"
          className="field min-h-[90px]"
          maxLength={1000}
          defaultValue={initialNote ?? ""}
          placeholder="e.g. rent arrears building, missed two key-work sessions"
        />
        <p className="mt-1 text-[12px] text-ink-faint">Seen by the referrer and the provider for this placement. Keep it factual and avoid unnecessary personal details.</p>
      </div>
      {state.message && (
        <p className={clsx("text-[14px]", state.ok ? "text-pine-dark" : "text-clay")} role="status">
          {state.message}
        </p>
      )}
      <button type="submit" disabled={pending || !health} className="btn-primary">
        {pending ? "Saving…" : initialHealth ? "Update answer" : "Send answer"}
      </button>
    </form>
  );
}
