"use client";
import { useActionState } from "react";

import { createRequestAction } from "@/server/actions/engagement";
import { Field, FormError, SubmitButton } from "./ui";
import { ContactTip } from "./contact-tip";

export function RequestForm({
  listingId,
  defaults,
}: {
  listingId: string;
  defaults: { accommodationNeeds: string; supportNeeds: string; moveInDate: string; phone?: string };
}) {
  const [state, action] = useActionState(createRequestAction, { ok: false });

  return (
    <form action={action} className="mt-6 space-y-5">
      <input type="hidden" name="listingId" value={listingId} />
      <FormError message={state.errors?.form} />

      <Field label="Preferred move-in date" name="moveInDate" error={state.errors?.moveInDate}>
        <input id="moveInDate" name="moveInDate" type="date" className="field" defaultValue={defaults.moveInDate} />
      </Field>

      <Field
        label="What kind of accommodation do you need?"
        name="accommodationNeeds"
        hint="Room type, area, anything that would make somewhere work or not work for you."
        error={state.errors?.accommodationNeeds}
      >
        <textarea id="accommodationNeeds" name="accommodationNeeds" rows={4} className="field" defaultValue={defaults.accommodationNeeds} />
      </Field>

      <Field
        label="What support would help you?"
        name="supportNeeds"
        hint="Share only what you're comfortable with. You can talk through details in messages later."
        error={state.errors?.supportNeeds}
      >
        <textarea id="supportNeeds" name="supportNeeds" rows={4} className="field" defaultValue={defaults.supportNeeds} />
      </Field>

      <div className="space-y-3">
        <ContactTip />
        <Field
          label="Best phone number to reach you (recommended)"
          name="phone"
          hint="Shared with this provider only, so they can call you about the room."
          error={state.errors?.phone}
        >
          <input id="phone" pattern="\+?[\d\s\(\)\.\-]{7,20}" title="Numbers only, for example 07700 900123" name="phone" type="tel" inputMode="tel" autoComplete="tel" className="field" placeholder="07700 900123" defaultValue={defaults.phone ?? ""} />
        </Field>
      </div>

      <Field label="Anything else the provider should know?" name="additionalInfo" error={state.errors?.additionalInfo}>
        <textarea id="additionalInfo" name="additionalInfo" rows={3} className="field" />
      </Field>

      <label className="flex items-start gap-3 rounded-[10px] border border-line bg-white p-4">
        <input type="checkbox" name="consent" className="mt-0.5 h-4 w-4 rounded border-line-strong text-pine focus:ring-pine" />
        <span className="text-[15px] leading-relaxed">
          I&apos;m happy for this provider to see these answers so they can respond to my request.
        </span>
      </label>
      {state.errors?.consent && <p className="text-[13px] text-clay">{state.errors.consent}</p>}

      <SubmitButton pendingLabel="Sending request…">Send request</SubmitButton>
    </form>
  );
}
