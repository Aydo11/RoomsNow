"use client";
import { useActionState, useState } from "react";

import Link from "next/link";
import { startConversationAction } from "@/server/actions/engagement";
import { FormError, SubmitButton } from "./ui";
import { ContactTip } from "./contact-tip";
import { money } from "@/lib/format";

/** Rooms someone can ask at the same time as this one (this one + 2 = 3). */
const MAX_EXTRA = 2;

type SimilarRoom = { id: string; title: string; provider: string; place: string; rent: number | null };

export function MessageProviderForm({
  listingId,
  lookingForAdId,
  signedIn,
  companyName,
  defaultPhone,
  similar = [],
}: {
  listingId?: string;
  lookingForAdId?: string;
  signedIn: boolean;
  companyName?: string;
  /** The person's saved number, filled in for them. */
  defaultPhone?: string | null;
  /** Similar rooms from other providers that can be asked in the same go. */
  similar?: SimilarRoom[];
}) {
  const [state, action] = useActionState(startConversationAction, { ok: false });
  const [picked, setPicked] = useState<string[]>([]);

  if (!signedIn) {
    return (
      <div className="card p-5">
        <h2 className="text-[17px]">Message {companyName ?? "them"}</h2>
        <p className="mt-1.5 text-[14px] text-ink-soft">
          Create an account or sign in to start a conversation. Your details stay private until you share them.
        </p>
        {listingId && <ContactTip compact className="mt-3" />}
        <Link
          href={`/register?next=${encodeURIComponent(listingId ? `/listings/${listingId}` : `/people/${lookingForAdId}`)}`}
          className="btn-primary mt-4 w-full"
        >
          Create account to message
        </Link>
        <Link href={`/login?next=${encodeURIComponent(listingId ? `/listings/${listingId}` : `/people/${lookingForAdId}`)}`} className="mt-3 block text-center text-[14px] text-pine-dark underline">Already registered? Sign in</Link>
      </div>
    );
  }

  return (
    <form action={action} className="card min-w-0 space-y-3 p-5">
      <h2 className="text-[17px]">Send a message</h2>
      {listingId && <input type="hidden" name="listingId" value={listingId} />}
      {lookingForAdId && <input type="hidden" name="lookingForAdId" value={lookingForAdId} />}
      <FormError message={state.errors?.form ?? state.errors?.body} />
      {listingId && <ContactTip />}
      <label className="sr-only" htmlFor="message-body">Your message</label>
      <textarea
        id="message-body"
        name="body"
        rows={4}
        required
        className="field"
        placeholder={listingId
          ? "Hi, is the room still available? I'm looking to move in soon. I'm free to talk most days after 10am."
          : "Hi — is the room still available, and do you accept referrals from the local authority?"}
      />
      {listingId && (
        <div>
          <label className="label" htmlFor="message-phone">
            Your phone number <span className="font-normal text-ink-faint">(recommended)</span>
          </label>
          <input
            id="message-phone" pattern="\+?[\d\s\(\)\.\-]{7,20}" title="Numbers only, for example 07700 900123"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            className="field"
            placeholder="07700 900123"
            defaultValue={defaultPhone ?? ""}
            aria-describedby="message-phone-hint"
          />
          {state.errors?.phone ? (
            <p className="mt-1 text-[13px] text-clay" role="alert">{state.errors.phone}</p>
          ) : (
            <p id="message-phone-hint" className="mt-1 text-[12.5px] text-ink-faint">
              Added to your message so {companyName ?? "the provider"} can call you back.
            </p>
          )}
        </div>
      )}
      {listingId && similar.length > 0 && (
        <div role="group" aria-labelledby="similar-rooms-heading" className="min-w-0 rounded-[12px] border border-line bg-paper-sunk/50 p-3">
          <p id="similar-rooms-heading" className="text-[14px] font-semibold text-ink">Ask similar rooms too</p>
          <p className="mt-0.5 text-[12.5px] text-ink-soft">Send the same message to up to {MAX_EXTRA} more rooms, so you aren&apos;t stuck if one provider is slow to reply.</p>
          <div className="mt-2 space-y-1.5">
            {similar.map((room) => {
              const checked = picked.includes(room.id);
              const disabled = !checked && picked.length >= MAX_EXTRA;
              return (
                <label key={room.id} className={`flex min-w-0 cursor-pointer items-start gap-2.5 rounded-[10px] border bg-white p-2.5 ${checked ? "border-pine" : "border-line"} ${disabled ? "opacity-50" : ""}`}>
                  <input
                    type="checkbox"
                    name="alsoListingId"
                    value={room.id}
                    checked={checked}
                    disabled={disabled}
                    onChange={(event) => setPicked((now) => (event.target.checked ? [...now, room.id] : now.filter((id) => id !== room.id)))}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-[#1666AA]"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-semibold text-ink" title={room.title}>{room.title}</span>
                    <span className="block truncate text-[12px] text-ink-soft">{room.provider} · {room.place}{room.rent ? ` · from ${money(room.rent)}/week` : ""}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}
      <SubmitButton className="btn-primary w-full" pendingLabel="Sending…">{picked.length ? `Send to ${picked.length + 1} rooms` : "Send message"}</SubmitButton>
    </form>
  );
}
