"use client";

import { useActionState, useState } from "react";
import { grantAccreditationAction } from "@/server/actions/accreditations";
import { ACCREDITATION_SCHEMES } from "@/lib/accreditations";
import { FormError, FormSuccess, SubmitButton } from "./ui";

const SCHEMES = ["BVSC", "CQC", "ROOMSNOW"] as const;

/** Admin: give a provider an accreditation directly (e.g. BVSC evidence sent through verification). */
export function GrantAccreditationForm({ companies }: { companies: Array<{ id: string; name: string }> }) {
  const [state, action] = useActionState(grantAccreditationAction, { ok: false });
  const [scheme, setScheme] = useState<(typeof SCHEMES)[number]>("BVSC");
  const err = (key: string) => state.errors?.[key] && <p className="mt-1 text-[12.5px] text-clay">{state.errors[key]}</p>;
  return (
    <details className="card mb-5 p-4" open={!state.ok && Boolean(state.errors) || undefined}>
      <summary className="cursor-pointer text-[16px] font-semibold">+ Grant an accreditation to a provider</summary>
      <p className="mt-1 text-[13px] text-ink-soft">For evidence you've already checked elsewhere, such as a BVSC certificate sent through verification. It goes live straight away and the provider is told.</p>
      <form action={action} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="sm:col-span-2 lg:col-span-3"><FormSuccess message={state.ok ? state.message : undefined} /><FormError message={state.errors?.form} /></div>
        <div>
          <label htmlFor="grant-company" className="label">Provider</label>
          <select id="grant-company" name="companyId" required className="field" defaultValue="">
            <option value="" disabled>Choose a provider</option>
            {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {err("companyId")}
        </div>
        <div>
          <label htmlFor="grant-scheme" className="label">Scheme</label>
          <select id="grant-scheme" name="scheme" className="field" value={scheme} onChange={(e) => setScheme(e.target.value as (typeof SCHEMES)[number])}>
            {SCHEMES.map((s) => <option key={s} value={s}>{ACCREDITATION_SCHEMES[s].label}</option>)}
          </select>
          {err("scheme")}
        </div>
        <div>
          <label htmlFor="grant-rating" className="label">Rating / level</label>
          <select id="grant-rating" name="rating" required className="field" key={scheme} defaultValue="">
            <option value="" disabled>Choose</option>
            {ACCREDITATION_SCHEMES[scheme].ratings.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          {err("rating")}
        </div>
        <div>
          <label htmlFor="grant-ref" className="label">Reference (optional)</label>
          <input id="grant-ref" name="referenceNumber" className="field" placeholder="Certificate or provider ID" />
        </div>
        <div>
          <label htmlFor="grant-expiry" className="label">Expiry / review date (optional)</label>
          <input id="grant-expiry" name="expiresAt" type="date" className="field" />
          {err("expiresAt")}
        </div>
        <div>
          <label htmlFor="grant-note" className="label">Where you saw the evidence</label>
          <input id="grant-note" name="note" className="field" placeholder="e.g. BVSC certificate in verification, Nov 2026" />
        </div>
        <div className="sm:col-span-2 lg:col-span-3"><SubmitButton pendingLabel="Granting…">Grant accreditation</SubmitButton></div>
      </form>
    </details>
  );
}
