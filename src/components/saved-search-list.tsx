"use client";

import { useTransition } from "react";
import { deleteSavedSearchAction, updateSavedSearchFrequencyAction } from "@/server/actions/saved-searches";
import type { AlertFrequency } from "@prisma/client";

export type SavedSearchRow = {
  id: string;
  label: string;
  summary: string;
  frequency: AlertFrequency;
  lastAlertedAt: Date | null;
};

export function SavedSearchList({ searches }: { searches: SavedSearchRow[] }) {
  return (
    <div className="grid gap-3">
      {searches.map((search) => (
        <SavedSearchCard key={search.id} search={search} />
      ))}
    </div>
  );
}

function SavedSearchCard({ search }: { search: SavedSearchRow }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
      <div className="min-w-0">
        <p className="font-semibold text-ink">{search.label}</p>
        <p className="mt-0.5 text-[13px] text-ink-soft">{search.summary}</p>
        <p className="mt-1 text-[12px] text-ink-faint">
          {search.lastAlertedAt
            ? `Last matched ${search.lastAlertedAt.toLocaleDateString("en-GB")}`
            : "No matches sent yet"}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <select
          aria-label={`Alert frequency for ${search.label}`}
          className="field !w-auto py-1.5 text-[13px]"
          defaultValue={search.frequency}
          disabled={pending}
          onChange={(e) => {
            const frequency = e.target.value as AlertFrequency;
            startTransition(() => updateSavedSearchFrequencyAction(search.id, frequency));
          }}
        >
          <option value="INSTANT">Instantly</option>
          <option value="DAILY">Daily roundup</option>
          <option value="OFF">Paused</option>
        </select>
        <button
          type="button"
          className="btn-secondary"
          disabled={pending}
          onClick={() => {
            if (window.confirm(`Delete the "${search.label}" alert?`)) {
              startTransition(() => deleteSavedSearchAction(search.id));
            }
          }}
        >
          Delete
        </button>
      </div>
    </div>
  );
}
