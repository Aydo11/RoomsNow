"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ACCOMMODATION_TYPES, supportLabel } from "@/lib/taxonomy";

type Facets = {
  types: { value: string; count: number }[];
  cities: { city: string; count: number }[];
  verified: number;
  wheelchair: number;
  petsAllowed: number;
};

/**
 * Counts next to each refinement, so nobody has to guess which filter will
 * empty a result set. Also shows what's currently applied, with one-tap removal.
 */
export function RefineBar({ facets, total }: { facets: Facets; total: number }) {
  const router = useRouter();
  const params = useSearchParams();

  function set(key: string, value: string | null) {
    const next = new URLSearchParams(params.toString());
    if (value === null) next.delete(key);
    else next.set(key, value);
    next.delete("page");
    router.push(`/search?${next.toString()}`);
  }

  const applied: { key: string; label: string }[] = [];
  const add = (key: string, label: string) => applied.push({ key, label });

  if (params.get("q")) add("q", `“${params.get("q")}”`);
  if (params.get("where")) add("where", params.get("where")!);
  if (params.get("bbox")) add("bbox", "This map area");
  if (params.get("verified")) add("verified", "Verified providers");
  if (params.get("wheelchair")) add("wheelchair", "Wheelchair accessible");
  if (params.get("petsAllowed")) add("petsAllowed", "Pets allowed");
  if (params.get("ensuite")) add("ensuite", "En-suite");
  if (params.get("selfContained")) add("selfContained", "Self-contained");
  if (params.get("maxRent")) add("maxRent", `Up to £${params.get("maxRent")}/wk`);
  if (params.get("minAge")) add("minAge", `Age ${params.get("minAge")}`);
  if (params.get("resident") === "woman") add("resident", "Homes open to women");
  if (params.get("resident") === "man") add("resident", "Homes open to men");
  if (params.get("hb")) add("hb", "Accepts Housing Benefit");
  if ((params.get("referral") ?? "").includes("SELF_REFERRAL")) add("referral", "You can apply yourself");
  for (const slug of (params.get("support") ?? "").split(",").filter(Boolean)) {
    add("support", supportLabel(slug));
  }

  const topCities = facets.cities.filter((c) => c.city !== params.get("where"));

  return (
    <div className="mt-4 space-y-3">
      {applied.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {applied.map((item) => (
            <button
              key={`${item.key}-${item.label}`}
              onClick={() => set(item.key, null)}
              className="chip chip-active"
              aria-label={`Remove filter ${item.label}`}
            >
              {item.label} <span aria-hidden="true" className="ml-1">✕</span>
            </button>
          ))}
          <button
            onClick={() => router.push("/search")}
            className="text-[13px] text-ink-faint hover:text-ink"
          >
            Clear all
          </button>
        </div>
      )}

      {total > PAGE_HINT && (
        <div className="flex flex-wrap items-center gap-2 text-[13px]">
          <span className="text-ink-faint">Narrow it down:</span>
          {topCities.slice(0, 5).map((city) => (
            <button key={city.city} onClick={() => set("where", city.city)} className="chip">
              {city.city} <span className="ml-1 text-ink-faint">{city.count}</span>
            </button>
          ))}
          {facets.types.slice(0, 3).map((type) => (
            <button
              key={type.value}
              onClick={() => set("type", type.value)}
              className="chip"
            >
              {ACCOMMODATION_TYPES[type.value as keyof typeof ACCOMMODATION_TYPES] ?? type.value}{" "}
              <span className="ml-1 text-ink-faint">{type.count}</span>
            </button>
          ))}
          {facets.verified > 0 && !params.get("verified") && (
            <button onClick={() => set("verified", "1")} className="chip">
              Verified only <span className="ml-1 text-ink-faint">{facets.verified}</span>
            </button>
          )}
          {facets.wheelchair > 0 && !params.get("wheelchair") && (
            <button onClick={() => set("wheelchair", "1")} className="chip">
              Wheelchair accessible <span className="ml-1 text-ink-faint">{facets.wheelchair}</span>
            </button>
          )}
          {facets.petsAllowed > 0 && !params.get("petsAllowed") && (
            <button onClick={() => set("petsAllowed", "1")} className="chip">
              Pets allowed <span className="ml-1 text-ink-faint">{facets.petsAllowed}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** Below this many results, refinement suggestions are noise. */
const PAGE_HINT = 12;
