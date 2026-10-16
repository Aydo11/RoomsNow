"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { enableWhatsappEnquiriesAction } from "@/server/actions/company";
import { Field, FormError, FormSuccess, SubmitButton } from "@/components/ui";
import type { FormState } from "@/lib/validation";

/** Only mounted after server-side entitlement checks; buying access never publishes a number. */
export function WhatsappSetupPrompt({
  initialNumber,
  autoOpen = false,
  source = "paid",
}: {
  initialNumber: string | null;
  autoOpen?: boolean;
  /** How they got WhatsApp, so the wording fits: bought it, given it by RoomsNow, or in their plan. */
  source?: "paid" | "granted" | "included";
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [number, setNumber] = useState(initialNumber ? `+${initialNumber.replace(/^\+/, "")}` : "");
  const [consent, setConsent] = useState(false);
  const [state, action, pending] = useActionState<FormState, FormData>(enableWhatsappEnquiriesAction, { ok: false });
  useEffect(() => { if (autoOpen && !dialog.current?.open) dialog.current?.showModal(); }, [autoOpen]);
  useEffect(() => { if (state.ok) router.refresh(); }, [state.ok, router]);

  return (
    <>
      <section className="card mb-5 border-pine/30 p-5" aria-labelledby="whatsapp-setup-banner">
        <p className="text-[12px] font-semibold uppercase tracking-wide text-pine-dark">
          {source === "granted" ? "Free from RoomsNow · setup required" : source === "included" ? "Included in your plan · setup required" : "WhatsApp access active · setup required"}
        </p>
        <h2 id="whatsapp-setup-banner" className="mt-1 text-[22px]">Finish setting up your WhatsApp button</h2>
        <p className="mt-2 text-[15px] text-ink-soft">
          {source === "granted"
            ? "RoomsNow has given you WhatsApp enquiries. The button stays off until you add your business number, confirm it can be public and enable enquiries."
            : source === "included"
              ? "WhatsApp enquiries come with your plan. Add your business number, confirm it can be public and enable enquiries to switch the button on."
              : "Your access is ready, but buying it does not switch the button on. Add your business number, confirm it can be public and enable enquiries."}
        </p>
        <button type="button" className="btn-primary mt-4" onClick={() => dialog.current?.showModal()}>Set up WhatsApp now</button>
      </section>
      <dialog ref={dialog} aria-labelledby="whatsapp-setup-title" aria-describedby="whatsapp-setup-description"
        className="fixed m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-xl overflow-y-auto rounded-2xl border border-line bg-paper p-6 text-ink shadow-2xl backdrop:bg-black/70 sm:p-8">
        <div className="mb-4 flex items-center justify-between gap-3">
          <span className="rounded-full bg-pine-light px-3 py-1 text-[13px] font-semibold text-pine-dark">Access active</span>
          <button type="button" disabled={pending} aria-label="Close WhatsApp setup" className="btn-ghost min-h-11 min-w-11" onClick={() => dialog.current?.close()}>✕</button>
        </div>
        <h2 id="whatsapp-setup-title" className="text-[28px] leading-tight sm:text-[32px]">One last step: turn on WhatsApp enquiries</h2>
        <p id="whatsapp-setup-description" className="mt-3 text-ink-soft">Customers cannot use your button until you finish this setup. It takes about a minute.</p>
        <ol className="my-5 list-decimal space-y-3 pl-5 text-[15px]">
          <li>Choose a business number already registered with WhatsApp or WhatsApp Business.</li>
          <li>Enter it below and confirm you have permission to display it publicly.</li>
          <li>Press <strong>Enable WhatsApp enquiries</strong>. Open one of your live adverts to check the button.</li>
        </ol>
        {state.ok ? <div className="space-y-4"><FormSuccess message={state.message} /><button type="button" className="btn-primary" onClick={() => dialog.current?.close()}>Done</button></div> : (
          <form action={action} className="space-y-4">
            <Field name="whatsappNumber" label="Business WhatsApp number" required error={state.errors?.whatsappNumber} hint="Example: 07700 900123 (UK) or +44 7700 900123. Use +country code for other countries.">
              <input id="whatsappNumber" name="whatsappNumber" type="tel" autoComplete="tel" className="field w-full" required value={number} onChange={(event) => setNumber(event.target.value)} />
            </Field>
            <label className="flex items-start gap-3 text-[14px] leading-relaxed">
              <input name="publishWhatsappConsent" type="checkbox" required checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-1 h-5 w-5 shrink-0" />
              I am authorised to publish this business number on our adverts and agree to receive WhatsApp enquiries.
            </label>
            <p className="rounded-xl bg-paper-sunk p-3 text-[13px] text-ink-soft">Chats open in WhatsApp, not your RoomsNow inbox. Messages include the advert title and link. You can change the number or turn the button off in Company profile → WhatsApp enquiries.</p>
            <FormError message={state.message} />
            <SubmitButton className="btn-primary w-full" pendingLabel="Enabling WhatsApp…">Enable WhatsApp enquiries</SubmitButton>
            <button type="button" disabled={pending} className="btn-ghost w-full" onClick={() => dialog.current?.close()}>Set up later — keep button off</button>
          </form>
        )}
      </dialog>
    </>
  );
}
