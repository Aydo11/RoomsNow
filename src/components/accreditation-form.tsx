"use client";

import { useActionState, useState } from "react";
import { ACCREDITATION_SCHEMES, type AccreditationScheme } from "@/lib/accreditations";
import { submitAccreditationAction } from "@/server/actions/accreditations";
import { Field, FormError, FormSuccess, SubmitButton } from "./ui";

export function AccreditationForm() {
  const [state, action] = useActionState(submitAccreditationAction, { ok: false });
  const [scheme, setScheme] = useState<AccreditationScheme>("CQC");
  const ratings = ACCREDITATION_SCHEMES[scheme].ratings as readonly string[];

  return (
    <form action={action} className="card space-y-4 p-5 sm:p-6">
      <div>
        <h2 className="text-[20px]">Submit an accreditation</h2>
        <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">The badge remains under assessment until an administrator checks the evidence. Providers cannot publish their own rating.</p>
      </div>
      <FormError message={state.errors?.form} />
      <FormSuccess message={state.ok ? state.message : undefined} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Scheme or regulator" name="scheme" error={state.errors?.scheme}>
          <select id="scheme" name="scheme" className="field" value={scheme} onChange={(event) => setScheme(event.target.value as AccreditationScheme)}>
            {Object.entries(ACCREDITATION_SCHEMES).map(([value, item]) => <option key={value} value={value}>{item.label}</option>)}
          </select>
        </Field>
        {scheme === "OTHER" && (
          <Field label="Accreditation name" name="customName" error={state.errors?.customName}>
            <input id="customName" name="customName" className="field" maxLength={100} />
          </Field>
        )}
        <Field label={scheme === "CQC" ? "Official CQC rating" : "Level or award"} name="rating" error={state.errors?.rating}>
          {ratings.length ? (
            <select id="rating" name="rating" className="field" defaultValue="">
              <option value="" disabled>Choose…</option>
              {ratings.map((rating) => <option key={rating} value={rating}>{rating}</option>)}
            </select>
          ) : <input id="rating" name="rating" className="field" maxLength={60} placeholder="e.g. Accredited member" />}
        </Field>
        <Field label={scheme === "CQC" ? "CQC provider or location ID" : "Membership or certificate number"} name="referenceNumber" error={state.errors?.referenceNumber}>
          <input id="referenceNumber" name="referenceNumber" className="field" maxLength={100} />
        </Field>
        <Field label="Public register link" name="publicUrl" hint="Optional, but recommended for CQC." error={state.errors?.publicUrl}>
          <input id="publicUrl" name="publicUrl" className="field" type="url" placeholder="https://…" />
        </Field>
        <Field label="Expiry or review date" name="expiresAt" hint="Leave blank if the award has no expiry." error={state.errors?.expiresAt}>
          <input id="expiresAt" name="expiresAt" className="field" type="date" />
        </Field>
        <Field label="Supporting evidence" name="evidence" hint="Certificate, regulator record or assessment evidence. Kept private." error={state.errors?.evidence} required>
          <input id="evidence" name="evidence" className="field" type="file" required accept="application/pdf,image/jpeg,image/png,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" />
        </Field>
      </div>
      <p className="rounded-[10px] bg-paper px-3 py-2 text-[12px] leading-relaxed text-ink-soft">Submitting confirms the information is current and that RoomsNow may verify it with the named issuer. A RoomsNow approval checks the evidence supplied; it does not replace a regulator inspection.</p>
      <SubmitButton pendingLabel="Submitting…">Submit for assessment</SubmitButton>
    </form>
  );
}
