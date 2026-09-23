"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { SUPPORT_TYPES } from "@/lib/taxonomy";

/**
 * Filters for the client list. A plain GET form, so every filtered view is a
 * shareable, bookmarkable URL and works without JavaScript; with JavaScript,
 * selects apply as soon as they change and the name search applies as you
 * pause typing.
 */
export function ClientFilters({
  status,
  q,
  support,
  dateBy,
  from,
  to,
  sort,
}: {
  status: string;
  q: string;
  support: string;
  dateBy: string;
  from: string;
  to: string;
  sort: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const router = useRouter();

  const apply = () => {
    const form = formRef.current;
    if (!form) return;
    const data = new FormData(form);
    const next = new URLSearchParams();
    for (const [key, value] of data.entries()) {
      const v = String(value).trim();
      if (!v) continue;
      if (key === "status" && v === "ALL") continue;
      if (key === "sort" && v === "updated") continue;
      if (key === "dateBy" && v === "created") continue;
      next.set(key, v);
    }
    router.replace(`/referrals/clients${next.toString() ? `?${next}` : ""}`, { scroll: false });
  };

  return (
    <form
      ref={formRef}
      action="/referrals/clients"
      method="get"
      role="search"
      className="card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))]"
      onSubmit={(event) => {
        event.preventDefault();
        apply();
      }}
    >
      <input type="hidden" name="status" value={status} />
      <div className="sm:col-span-2 lg:col-span-1">
        <label className="label" htmlFor="client-q">Search by name</label>
        <input
          id="client-q"
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Name, area or email"
          className="field"
          autoComplete="off"
          onChange={() => {
            clearTimeout(timer.current);
            timer.current = setTimeout(apply, 350);
          }}
        />
      </div>

      <div>
        <label className="label" htmlFor="client-support">Support need</label>
        <select id="client-support" name="support" defaultValue={support} className="field" onChange={apply}>
          <option value="">Any</option>
          {SUPPORT_TYPES.map((type) => (
            <option key={type.slug} value={type.slug}>{type.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="label" htmlFor="client-sort">Sort by</label>
        <select id="client-sort" name="sort" defaultValue={sort} className="field" onChange={apply}>
          <option value="updated">Recently updated</option>
          <option value="newest">Newest added</option>
          <option value="oldest">Oldest added</option>
          <option value="name">First name A–Z</option>
          <option value="surname">Surname A–Z</option>
        </select>
      </div>

      <div>
        <label className="label" htmlFor="client-dateby">Dates</label>
        <select id="client-dateby" name="dateBy" defaultValue={dateBy} className="field" onChange={apply}>
          <option value="created">Date added</option>
          <option value="updated">Last updated</option>
        </select>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3 sm:col-span-2 lg:col-span-4">
        <div className="grid w-full grid-cols-2 gap-3 sm:max-w-[440px]">
          <div className="min-w-0">
            <label className="label" htmlFor="client-from">From</label>
            <input id="client-from" name="from" type="date" defaultValue={from} className="field" onChange={apply} />
          </div>
          <div className="min-w-0">
            <label className="label" htmlFor="client-to">To</label>
            <input id="client-to" name="to" type="date" defaultValue={to} className="field" onChange={apply} />
          </div>
        </div>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => {
            formRef.current
              ?.querySelectorAll<HTMLInputElement | HTMLSelectElement>("input:not([type=hidden]), select")
              .forEach((el) => {
                el.value = el instanceof HTMLSelectElement ? el.options[0].value : "";
              });
            apply();
          }}
        >
          Clear filters
        </button>
      </div>

      <noscript>
        <button type="submit" className="btn-secondary">Apply filters</button>
      </noscript>
    </form>
  );
}
