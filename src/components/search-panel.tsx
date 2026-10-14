"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { submitSearchQuery } from "@/lib/search-query";
import { SUPPORT_TYPES, UK_CITIES } from "@/lib/taxonomy";

/** Quick move-in choices instead of a fiddly date picker. Each maps to a "move in by" date. */
const MOVE_IN_CHOICES = [
  { label: "As soon as possible", days: 7 },
  { label: "Within 2 weeks", days: 14 },
  { label: "Within a month", days: 31 },
  { label: "Within 3 months", days: 92 },
] as const;

function isoInDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Mobile starts with a location; optional refinements remain one tap away. */
export function SearchPanel({ size = "hero" }: { size?: "hero" | "compact" }) {
  const params = useSearchParams();
  return <SearchPanelForm key={params.toString()} size={size} />;
}

function SearchPanelForm({ size }: { size: "hero" | "compact" }) {
  const router = useRouter();
  const params = useSearchParams();
  const [where, setWhere] = useState(params.get("where") ?? "");
  const [support, setSupport] = useState(params.get("support") ?? "");
  const [from, setFrom] = useState(params.get("from") ?? "");
  const [vetted, setVetted] = useState(params.get("vetted") === "1");

  const refinements = [support && "Support", from && "Move-in date", vetted && "Vetted providers"].filter(Boolean);

  const [optionsOpen, setOptionsOpen] = useState(Boolean(support || from || vetted));

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const query = submitSearchQuery(params.toString(), { where, support, from, vetted });
    router.push(`/search?${query.toString()}`);
  }

  const hero = size === "hero";

  return (
    <form
      onSubmit={submit}
      className={
        hero
          ? "grid grid-cols-1 gap-3 rounded-card border border-line bg-white p-4 shadow-raise sm:grid-cols-[1.3fr_1.1fr_0.9fr_auto] sm:items-end"
          : "grid grid-cols-1 gap-2 sm:grid-cols-[1.2fr_1fr_0.8fr_auto] sm:items-end"
      }
    >
      <div className="min-w-0">
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

      <div className="min-w-0 sm:contents">
        <button type="button" onClick={() => setOptionsOpen(!optionsOpen)} aria-expanded={optionsOpen} aria-controls={`search-options-${size}`} className="cursor-pointer py-2 text-left text-[14px] font-medium text-pine-dark sm:hidden">{refinements.length ? `Search options (${refinements.length} selected)` : "Support, move-in date and other options"}</button>
        <div id={`search-options-${size}`} className={`${optionsOpen ? "grid" : "hidden"} min-w-0 gap-3 pt-2 sm:contents`}>
      <div className="min-w-0">
        <label className="label" htmlFor="support">Support needed</label>
        <select id="support" value={support} onChange={(e) => setSupport(e.target.value)} className="field">
          <option value="">Any support</option>
          {support.includes(",") && <option value={support}>{support.split(",").map((slug) => SUPPORT_TYPES.find((type) => type.slug === slug)?.label ?? slug).join(", ")}</option>}
          {SUPPORT_TYPES.map((type) => (
            <option key={type.slug} value={type.slug}>{type.label}</option>
          ))}
        </select>
      </div>

      <div className="min-w-0">
        <label className="label" htmlFor="from">Move in</label>
        <select id="from" value={from} onChange={(e) => setFrom(e.target.value)} className="field">
          <option value="">Any time</option>
          {/* A date from a shared link that isn't one of the choices below. */}
          {from && !MOVE_IN_CHOICES.some((choice) => isoInDays(choice.days) === from) && (
            <option value={from}>By {new Date(`${from}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</option>
          )}
          {MOVE_IN_CHOICES.map((choice) => (
            <option key={choice.days} value={isoInDays(choice.days)}>{choice.label}</option>
          ))}
        </select>
      </div>

      <label htmlFor={`vetted-${size}`} className="flex cursor-pointer items-center gap-2 text-[14px] text-ink-soft sm:col-span-4 sm:row-start-2">
        <input
          id={`vetted-${size}`}
          type="checkbox"
          checked={vetted}
          onChange={(e) => setVetted(e.target.checked)}
          className="h-4 w-4 rounded-sm border-line-strong text-pine focus:ring-pine"
        />
        <span>
          Vetted providers only <span className="text-ink-faint">— CQC or BVSC checked by RoomsNow</span>
        </span>
      </label>
        </div>
      </div>
      <button type="submit" className="btn-primary h-[46px] px-6 sm:col-start-4 sm:row-start-1">Find rooms</button>
    </form>
  );
}
