"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { SUPPORT_TYPES, UK_CITIES } from "@/lib/taxonomy";

/**
 * The three questions that actually matter in this market: where, what support,
 * and when. Everything else is a filter on the results page.
 */
export function SearchPanel({ size = "hero" }: { size?: "hero" | "compact" }) {
  const router = useRouter();
  const params = useSearchParams();
  const [where, setWhere] = useState(params.get("where") ?? "");
  const [support, setSupport] = useState(params.get("support") ?? "");
  const [from, setFrom] = useState(params.get("from") ?? "");

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const query = new URLSearchParams();
    if (where) query.set("where", where);
    if (support) query.set("support", support);
    if (from) query.set("from", from);
    router.push(`/search?${query.toString()}`);
  }

  const hero = size === "hero";

  return (
    <form
      onSubmit={submit}
      className={
        hero
          ? "grid gap-3 rounded-card border border-line bg-white p-4 shadow-raise sm:grid-cols-[1.3fr_1.1fr_0.9fr_auto] sm:items-end"
          : "grid gap-2 sm:grid-cols-[1.2fr_1fr_0.8fr_auto] sm:items-end"
      }
    >
      <div>
        <label className="label" htmlFor="where">Where</label>
        <input
          id="where"
          list="uk-cities"
          value={where}
          onChange={(e) => setWhere(e.target.value)}
          placeholder="Town, city or postcode"
          className="field"
        />
        <datalist id="uk-cities">
          {UK_CITIES.map((city) => (
            <option key={city} value={city} />
          ))}
        </datalist>
      </div>

      <div>
        <label className="label" htmlFor="support">Support needed</label>
        <select id="support" value={support} onChange={(e) => setSupport(e.target.value)} className="field">
          <option value="">Any support</option>
          {SUPPORT_TYPES.map((type) => (
            <option key={type.slug} value={type.slug}>{type.label}</option>
          ))}
        </select>
      </div>

      <div className="min-w-0">
        <label className="label" htmlFor="from">
          Move in by <span className="font-normal text-ink-faint">(e.g. 30/09/2026)</span>
        </label>
        <input
          id="from"
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="field block min-w-0 max-w-full"
          aria-label="Move in by, for example 30 September 2026"
        />
      </div>

      <button type="submit" className="btn-primary h-[46px] px-6">Search</button>
    </form>
  );
}
