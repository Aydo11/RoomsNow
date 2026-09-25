"use client";

import { useActionState } from "react";
import { clsx } from "@/lib/clsx";
import { createRoomAlertAction, type RoomAlertState } from "@/server/actions/room-alerts";

/**
 * "Tell me when a room comes up" for visitors without an account. Asks for
 * the least possible: where, and an email or mobile number.
 */
export function RoomAlertSignup({
  where = "",
  support = [],
  smsEnabled = false,
  compact = false,
  className,
}: {
  where?: string;
  support?: string[];
  smsEnabled?: boolean;
  compact?: boolean;
  className?: string;
}) {
  const [state, action, pending] = useActionState<RoomAlertState, FormData>(createRoomAlertAction, { ok: false });

  if (state.ok) {
    return (
      <div className={clsx("rounded-card border border-pine/25 bg-pine-light/50 p-5", className)} role="status">
        <p className="text-[16px] font-semibold text-ink">Nearly done: check your {state.sentTo?.includes("@") ? "email" : "messages"}</p>
        <p className="mt-1 text-[14px] leading-relaxed text-ink-soft">
          We&apos;ve sent a link to {state.sentTo}. Tap it and we&apos;ll tell you as soon as a room comes up.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className={clsx("rounded-card border border-line bg-white p-5", className)}>
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-pine-light text-pine-dark" aria-hidden="true">
          <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M5.5 13.5V9a4.5 4.5 0 0 1 9 0v4.5l1.5 1.5H4l1.5-1.5ZM8.5 17a1.6 1.6 0 0 0 3 0" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <div>
          <h2 className="text-[17px] font-bold text-ink">Tell me when a room comes up</h2>
          <p className="mt-0.5 text-[14px] leading-relaxed text-ink-soft">No account needed. We&apos;ll only contact you about rooms, and you can stop any time.</p>
        </div>
      </div>

      <div className={clsx("mt-4 grid gap-3", !compact && "sm:grid-cols-[1fr_1.3fr_auto] sm:items-end")}>
        <div>
          <label className="label" htmlFor="room-alert-where">
            Area
          </label>
          <input id="room-alert-where" name="where" className="field" defaultValue={where} placeholder="Town, city or postcode" maxLength={80} />
        </div>
        <div>
          <label className="label" htmlFor="room-alert-contact">
            {smsEnabled ? "Email or mobile number" : "Email address"}
          </label>
          <input
            id="room-alert-contact"
            name="contact"
            className="field"
            required
            inputMode={smsEnabled ? "text" : "email"}
            autoComplete={smsEnabled ? "on" : "email"}
            placeholder={smsEnabled ? "you@example.com or 07…" : "you@example.com"}
            maxLength={200}
          />
        </div>
        {support.map((slug) => (
          <input key={slug} type="hidden" name="support" value={slug} />
        ))}
        <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Setting up…" : "Alert me"}
        </button>
      </div>
      {state.message && (
        <p className="mt-2 text-[13px] text-clay" role="alert">
          {state.message}
        </p>
      )}
    </form>
  );
}
