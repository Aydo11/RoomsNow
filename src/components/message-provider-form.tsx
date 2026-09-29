"use client";
import { useActionState } from "react";

import Link from "next/link";
import { startConversationAction } from "@/server/actions/engagement";
import { FormError, SubmitButton } from "./ui";
import { ContactTip } from "./contact-tip";

export function MessageProviderForm({
  listingId,
  lookingForAdId,
  signedIn,
  companyName,
  defaultPhone,
}: {
  listingId?: string;
  lookingForAdId?: string;
  signedIn: boolean;
  companyName?: string;
  /** The person's saved number, filled in for them. */
  defaultPhone?: string | null;
}) {
  const [state, action] = useActionState(startConversationAction, { ok: false });

  if (!signedIn) {
    return (
      <div className="card p-5">
        <h2 className="text-[17px]">Message {companyName ?? "them"}</h2>
        <p className="mt-1.5 text-[14px] text-ink-soft">
          Sign in to start a conversation. Your details stay private until you share them.
        </p>
        {listingId && <ContactTip compact className="mt-3" />}
        <Link
          href={`/login?next=${encodeURIComponent(listingId ? `/listings/${listingId}` : `/people/${lookingForAdId}`)}`}
          className="btn-primary mt-4 w-full"
        >
          Sign in to message
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="card space-y-3 p-5">
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
      <SubmitButton className="btn-primary w-full" pendingLabel="Sending…">Send message</SubmitButton>
    </form>
  );
}
