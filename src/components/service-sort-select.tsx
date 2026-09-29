"use client";

import { useRouter, useSearchParams } from "next/navigation";

const OPTIONS = [
  ["recommended", "Recommended"],
  ["rating", "Highest rated"],
  ["response", "Fastest response"],
  ["price_low", "Lowest price"],
  ["price_high", "Highest price"],
  ["newest", "Newest"],
] as const;

/** Sort dropdown for the results toolbar. Changing it reloads with the new order and page 1. */
export function ServiceSortSelect({ value }: { value: string }) {
  const router = useRouter();
  const params = useSearchParams();
  return (
    <label className="flex items-center gap-2 text-[14px] text-ink-soft">
      <span className="whitespace-nowrap">Sort by</span>
      <select
        id="service-sort"
        value={value}
        onChange={(event) => {
          const next = new URLSearchParams(params.toString());
          if (event.target.value === "recommended") next.delete("sort");
          else next.set("sort", event.target.value);
          next.delete("page");
          router.push(`/services${next.toString() ? `?${next.toString()}` : ""}`);
        }}
        className="field h-10 w-auto py-0 pr-8"
      >
        {OPTIONS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
      </select>
    </label>
  );
}
