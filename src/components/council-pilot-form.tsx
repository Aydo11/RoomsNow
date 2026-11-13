"use client";

import { useActionState } from "react";
import { requestCouncilPilot } from "@/server/actions/council-pilot";
import { FormError, FormSuccess, SubmitButton } from "@/components/ui";

export function CouncilPilotForm() {
  const [state, action] = useActionState(requestCouncilPilot, { ok: false });
  if (state.ok) return <FormSuccess message={state.message} />;
  return (
    <form action={action} className="mt-4 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {([["name", "Your name", "text", 100], ["email", "Work email", "email", 254], ["council", "Council or commissioning team", "text", 120], ["area", "Area you cover", "text", 120]] as const).map(([name, label, type, maxLength]) => (
          <label key={name} className="block text-sm font-medium text-ink">{label}
            <input name={name} type={type} maxLength={maxLength} className="field mt-1" required />
          </label>
        ))}
      </div>
      <p className="text-sm text-ink-soft">We’ll use these details to reply about the pilot. Please don’t enter client information. <a href="/privacy" className="text-pine-dark underline">Privacy notice</a></p>
      <FormError message={state.message} />
      <SubmitButton pendingLabel="Sending…">Request a pilot</SubmitButton>
    </form>
  );
}
