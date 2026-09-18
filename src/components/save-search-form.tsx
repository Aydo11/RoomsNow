"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { createSavedSearchAction } from "@/server/actions/saved-searches";
import { FormError, FormSuccess, SubmitButton } from "./ui";
import type { SearchParams } from "@/server/search";

function toArray(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : value.split(",").filter(Boolean);
}

/**
 * Turns the filters someone is currently viewing on /search into a saved
 * alert. Starts as a single button (so it doesn't compete with the results
 * for attention) and expands into a small form of hidden fields mirroring
 * the current SearchParams, plus just the two things a person actually
 * chooses: a name and how often to be emailed.
 */
export function SaveSearchForm({ params, resultCount }: { params: SearchParams; resultCount: number }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(createSavedSearchAction, { ok: false });

  const support = toArray(params.support);
  const type = toArray(params.type);
  const referral = toArray(params.referral);

  if (state.ok) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <FormSuccess message={state.message} />
        <Link href="/dashboard/alerts" className="text-[13px] font-medium text-pine-dark hover:underline">
          Manage your alerts
        </Link>
      </div>
    );
  }

  if (!open) {
    return (
      <button type="button" className="btn-secondary" onClick={() => setOpen(true)}>
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
          <path d="M10 16.5a1.7 1.7 0 0 0 1.7-1.7h-3.4A1.7 1.7 0 0 0 10 16.5Z" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4.5 13.8h11a1 1 0 0 0 .7-1.7c-.9-.9-1.7-1.8-1.7-4.6a4.5 4.5 0 0 0-9 0c0 2.8-.8 3.7-1.7 4.6a1 1 0 0 0 .7 1.7Z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Save this search
      </button>
    );
  }

  return (
    <form action={action} className="card w-full max-w-md space-y-3 p-4">
      <div>
        <h3 className="text-[15px] font-semibold">Save this search as an alert</h3>
        <p className="mt-0.5 text-[13px] text-ink-soft">
          {resultCount.toLocaleString("en-GB")} live advert{resultCount === 1 ? "" : "s"} match these filters right now
          — we'll tell you when new ones do too.
        </p>
      </div>

      {params.where && <input type="hidden" name="where" value={params.where} />}
      {params.radius && <input type="hidden" name="radius" value={params.radius} />}
      {support.map((s) => (
        <input key={s} type="hidden" name="support" value={s} />
      ))}
      {type.map((t) => (
        <input key={t} type="hidden" name="type" value={t} />
      ))}
      {params.gender && <input type="hidden" name="gender" value={params.gender} />}
      {params.minAge && <input type="hidden" name="minAge" value={params.minAge} />}
      {params.wheelchair === "1" && <input type="hidden" name="wheelchair" value="1" />}
      {params.furnished === "1" && <input type="hidden" name="furnished" value="1" />}
      {params.ensuite === "1" && <input type="hidden" name="ensuite" value="1" />}
      {params.selfContained === "1" && <input type="hidden" name="selfContained" value="1" />}
      {params.petsAllowed === "1" && <input type="hidden" name="petsAllowed" value="1" />}
      {referral.map((r) => (
        <input key={r} type="hidden" name="referral" value={r} />
      ))}
      {params.verified === "1" && <input type="hidden" name="verified" value="1" />}
      {params.minRent && <input type="hidden" name="minRent" value={params.minRent} />}
      {params.maxRent && <input type="hidden" name="maxRent" value={params.maxRent} />}

      <FormError message={state.errors?.form} />

      <div>
        <label className="label" htmlFor="save-search-label">
          Name this alert
        </label>
        <input
          id="save-search-label"
          name="label"
          className="field"
          placeholder="e.g. Leeds, mental health support"
          maxLength={120}
        />
      </div>

      <div>
        <label className="label" htmlFor="save-search-frequency">
          Email me
        </label>
        <select id="save-search-frequency" name="frequency" className="field" defaultValue="INSTANT">
          <option value="INSTANT">The moment a match goes live</option>
          <option value="DAILY">Once a day, as a roundup</option>
        </select>
      </div>

      <div className="flex gap-2">
        <SubmitButton pendingLabel="Saving…">Save alert</SubmitButton>
        <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}
