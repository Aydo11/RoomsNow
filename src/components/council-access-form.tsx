"use client";

import { useActionState } from "react";
import { grantCouncilAccessAction, type CouncilAccessState } from "@/server/actions/council";

export function CouncilAccessForm() {
  const [state, action, pending] = useActionState<CouncilAccessState, FormData>(grantCouncilAccessAction, { ok: false });
  return (
    <form action={action} className="card grid gap-4 p-5 sm:grid-cols-2">
      <div>
        <label className="label" htmlFor="council-email">
          Their RoomsNow email
        </label>
        <input id="council-email" name="email" type="email" required className="field" placeholder="name@birmingham.gov.uk" />
      </div>
      <div>
        <label className="label" htmlFor="council-name">
          Council name
        </label>
        <input id="council-name" name="councilName" required className="field" placeholder="Birmingham City Council" />
      </div>
      <div className="sm:col-span-2">
        <label className="label" htmlFor="council-areas">
          Areas covered
        </label>
        <input id="council-areas" name="areas" required className="field" placeholder="Birmingham, Sutton Coldfield, B" />
        <p className="mt-1 text-[12px] text-ink-faint">Towns or areas, and postcode prefixes (B = every B postcode, B21 = just B21). Separate with commas.</p>
      </div>
      <div className="flex items-center gap-3 sm:col-span-2">
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Saving…" : "Give council view"}
        </button>
        {state.message && <p className={state.ok ? "text-[14px] text-pine-dark" : "text-[14px] text-clay"}>{state.message}</p>}
      </div>
    </form>
  );
}
