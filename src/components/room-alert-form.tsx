"use client";

import { useActionState, useState } from "react";
import { createRoomAlertAction } from "@/server/actions/room-alerts";
import { Field, FormError, FormSuccess, SubmitButton } from "./ui";

/** Sign up for new-room alerts by WhatsApp or email, no account needed. */
export function RoomAlertForm({ where = "", whatsapp }: { where?: string; whatsapp: boolean }) {
  const [state, action] = useActionState(createRoomAlertAction, { ok: false });
  const [channel, setChannel] = useState<"whatsapp" | "email">(whatsapp ? "whatsapp" : "email");

  if (state.ok) {
    return (
      <div className="card p-6 text-center">
        <p className="text-[34px]" aria-hidden="true">{channel === "whatsapp" ? "💬" : "📧"}</p>
        <h2 className="mt-2 text-[22px]">Nearly done</h2>
        <FormSuccess message={state.message} />
      </div>
    );
  }

  return (
    <form action={action} className="card space-y-5 p-6">
      <FormError message={state.errors?.form} />
      <Field label="Where do you need a room?" name="where" error={state.errors?.where} hint="A town, area or postcode, like Birmingham, Handsworth or B21." required>
        <input id="where" name="where" defaultValue={where} required maxLength={60} className="field text-[17px]" autoComplete="address-level2" />
      </Field>

      {whatsapp && (
        <fieldset>
          <legend className="label">Send alerts by</legend>
          <div className="grid grid-cols-2 gap-2">
            {(["whatsapp", "email"] as const).map((c) => (
              <label key={c} htmlFor={`channel-${c}`} className={`flex cursor-pointer items-center justify-center gap-2 rounded-[12px] border-2 px-3 py-3 text-[15px] font-semibold ${channel === c ? (c === "whatsapp" ? "border-[#25d366] bg-positive-surface text-positive" : "border-pine bg-pine-light") : "border-line"}`}>
                <input id={`channel-${c}`} type="radio" name="channel" value={c} checked={channel === c} onChange={() => setChannel(c)} className="sr-only" />
                {c === "whatsapp" ? "💬 WhatsApp" : "📧 Email"}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      {!whatsapp && <input type="hidden" name="channel" value="email" />}

      {channel === "whatsapp" ? (
        <Field label="Your WhatsApp number" name="phone" error={state.errors?.phone} hint="UK mobile. We only use it for room alerts." required>
          <input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" required className="field text-[17px]" placeholder="07700 900123" />
        </Field>
      ) : (
        <Field label="Your email" name="email" error={state.errors?.email} required>
          <input id="email" name="email" type="email" autoComplete="email" required className="field text-[17px]" />
        </Field>
      )}

      <SubmitButton pendingLabel="Setting up…" className={channel === "whatsapp" ? "w-full rounded-[10px] bg-[#25d366] px-5 py-3.5 text-[16px] font-bold text-[#063d1c] hover:brightness-95" : "btn-primary w-full"}>
        {channel === "whatsapp" ? "Send me rooms on WhatsApp" : "Email me new rooms"}
      </SubmitButton>
      <p className="text-[13px] leading-relaxed text-ink-faint">
        Free. At most 3 alerts a day. Every message has a link to stop them. See our <a href="/privacy" className="underline">privacy notice</a>.
      </p>
    </form>
  );
}
