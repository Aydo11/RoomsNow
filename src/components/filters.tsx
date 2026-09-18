"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { ACCOMMODATION_TYPES, GENDER_ARRANGEMENTS, REFERRAL_ROUTES, SUPPORT_TYPES } from "@/lib/taxonomy";

export function Filters() {
  const router = useRouter();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);

  const get = (key: string) => params.get(key) ?? "";
  const has = (key: string, value: string) => (params.get(key) ?? "").split(",").includes(value);

  function update(key: string, value: string | null) {
    const next = new URLSearchParams(params.toString());
    if (value === null || value === "") next.delete(key);
    else next.set(key, value);
    next.delete("page");
    router.push(`/search?${next.toString()}`);
  }

  function toggleMulti(key: string, value: string) {
    const current = (params.get(key) ?? "").split(",").filter(Boolean);
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    update(key, next.join(","));
  }

  const activeCount = ["support", "type", "gender", "wheelchair", "furnished", "ensuite", "selfContained", "petsAllowed", "referral", "verified", "maxRent", "minRent", "radius", "bbox"]
    .filter((key) => params.get(key)).length;

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className="btn-secondary w-full lg:hidden"
        aria-expanded={open}
        aria-controls="filters"
      >
        {open ? "Hide filters" : "Filters"}
        {activeCount > 0 && <span className="rounded-pill bg-pine px-1.5 text-[12px] text-white">{activeCount}</span>}
      </button>

      <div id="filters" className={`${open ? "block" : "hidden"} space-y-6 lg:block`}>
        <FilterBlock title="Distance">
          <label className="label" htmlFor="radius">
            Within {get("radius") || 15} miles of the place you searched
          </label>
          <select
            id="radius"
            className="field"
            value={get("radius") || "15"}
            onChange={(e) => update("radius", e.target.value)}
            disabled={Boolean(params.get("bbox"))}
          >
            {[1, 3, 5, 10, 15, 25, 50, 100].map((miles) => (
              <option key={miles} value={miles}>{miles} miles</option>
            ))}
          </select>
          {params.get("bbox") && (
            <button className="btn-ghost mt-2 w-full" onClick={() => update("bbox", null)}>
              Searching a map area — clear it
            </button>
          )}
        </FilterBlock>

        <FilterBlock title="Support offered">
          <div className="flex flex-wrap gap-1.5">
            {SUPPORT_TYPES.map((type) => (
              <button
                key={type.slug}
                onClick={() => toggleMulti("support", type.slug)}
                className={has("support", type.slug) ? "chip chip-active" : "chip"}
                aria-pressed={has("support", type.slug)}
              >
                {type.label}
              </button>
            ))}
          </div>
        </FilterBlock>

        <FilterBlock title="Accommodation type">
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(ACCOMMODATION_TYPES).map(([value, label]) => (
              <button
                key={value}
                onClick={() => toggleMulti("type", value)}
                className={has("type", value) ? "chip chip-active" : "chip"}
                aria-pressed={has("type", value)}
              >
                {label}
              </button>
            ))}
          </div>
        </FilterBlock>

        <FilterBlock title="Referral route">
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(REFERRAL_ROUTES).map(([value, label]) => (
              <button
                key={value}
                onClick={() => toggleMulti("referral", value)}
                className={has("referral", value) ? "chip chip-active" : "chip"}
                aria-pressed={has("referral", value)}
              >
                {label}
              </button>
            ))}
          </div>
        </FilterBlock>

        <FilterBlock title="Who it's for">
          <label className="label" htmlFor="gender">Gender arrangement</label>
          <select id="gender" className="field" value={get("gender")} onChange={(e) => update("gender", e.target.value)}>
            <option value="">Any</option>
            {Object.entries(GENDER_ARRANGEMENTS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <label className="label mt-3" htmlFor="minAge">Age</label>
          <input
            id="minAge"
            type="number"
            min={16}
            max={120}
            placeholder="Your age"
            className="field"
            defaultValue={get("minAge")}
            onBlur={(e) => update("minAge", e.target.value)}
          />
        </FilterBlock>

        <FilterBlock title="Rent">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="minRent">From (£/wk)</label>
              <input
                id="minRent"
                type="number"
                min={0}
                step={5}
                className="field"
                defaultValue={get("minRent")}
                onBlur={(e) => update("minRent", e.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="maxRent">To (£/wk)</label>
              <input
                id="maxRent"
                type="number"
                min={0}
                step={5}
                className="field"
                defaultValue={get("maxRent")}
                onBlur={(e) => update("maxRent", e.target.value)}
              />
            </div>
          </div>
        </FilterBlock>

        <FilterBlock title="Features">
          <div className="space-y-2">
            {[
              ["ensuite", "Ensuite"],
              ["selfContained", "Self-contained"],
              ["furnished", "Furnished"],
              ["wheelchair", "Step-free access"],
              ["petsAllowed", "Pets allowed"],
              ["verified", "Verified providers only"],
            ].map(([key, label]) => (
              <label key={key} className="flex items-center gap-2.5 text-[15px]">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-line-strong text-pine focus:ring-pine"
                  checked={get(key) === "1"}
                  onChange={(e) => update(key, e.target.checked ? "1" : null)}
                />
                {label}
              </label>
            ))}
          </div>
        </FilterBlock>

        {activeCount > 0 && (
          <button
            className="btn-ghost w-full"
            onClick={() => {
              const next = new URLSearchParams();
              const where = params.get("where");
              if (where) next.set("where", where);
              router.push(`/search?${next.toString()}`);
            }}
          >
            Clear {activeCount} filter{activeCount === 1 ? "" : "s"}
          </button>
        )}
      </div>
    </>
  );
}

function FilterBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-line pb-6 last:border-0">
      <h3 className="mb-3 text-[15px] font-medium text-ink">{title}</h3>
      {children}
    </section>
  );
}

export function SortSelect() {
  const router = useRouter();
  const params = useSearchParams();
  return (
    <label className="flex items-center gap-2 text-[14px] text-ink-soft">
      Sort
      <select
        className="field w-auto py-1.5"
        value={params.get("sort") ?? "featured"}
        onChange={(e) => {
          const next = new URLSearchParams(params.toString());
          next.set("sort", e.target.value);
          router.push(`/search?${next.toString()}`);
        }}
      >
        <option value="featured">Most relevant</option>
        <option value="newest">Newest first</option>
        <option value="rent">Lowest rent</option>
        <option value="rent-desc">Highest rent</option>
        <option value="available">Available soonest</option>
      </select>
    </label>
  );
}

export function ViewToggle({ view }: { view: "list" | "map" }) {
  const router = useRouter();
  const params = useSearchParams();
  function set(next: "list" | "map") {
    const query = new URLSearchParams(params.toString());
    query.set("view", next);
    router.push(`/search?${query.toString()}`);
  }
  return (
    <div className="inline-flex rounded-[10px] border border-line bg-white p-0.5">
      {(["list", "map"] as const).map((option) => (
        <button
          key={option}
          onClick={() => set(option)}
          aria-pressed={view === option}
          className={`rounded-[8px] px-3 py-1.5 text-[14px] capitalize ${
            view === option ? "bg-ink text-white" : "text-ink-soft hover:text-ink"
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
