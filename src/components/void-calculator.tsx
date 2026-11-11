"use client";

import Link from "next/link";
import { useState } from "react";
import { voidCalculator } from "@/lib/void-cost";

const gbp = (n: number) => `£${Math.round(n).toLocaleString("en-GB")}`;

/** Public calculator: how much empty rooms are costing, then list them free. */
export function VoidCalculator() {
  const [rooms, setRooms] = useState(3);
  const [rent, setRent] = useState(150);
  const [bills, setBills] = useState(25);
  const [weeks, setWeeks] = useState(6);
  const result = voidCalculator({ rooms, weeklyRent: rent, weeklyBills: bills, weeksEmpty: weeks });

  const field = (id: string, label: string, hint: string, value: number, set: (n: number) => void, prefix?: string) => (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      <div className="flex items-center gap-2">
        {prefix && <span className="text-[18px] font-semibold text-ink-soft">{prefix}</span>}
        <input id={id} type="number" inputMode="numeric" min={0} value={Number.isFinite(value) ? value : ""} onChange={(e) => set(e.target.valueAsNumber)} className="field text-[18px]" />
      </div>
      <p className="mt-1 text-[13px] text-ink-faint">{hint}</p>
    </div>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
      <div className="card space-y-5 p-6">
        {field("vc-rooms", "Empty rooms right now", "Across all your properties.", rooms, setRooms)}
        {field("vc-rent", "Rent per room, per week", "Including any Housing Benefit or service charge you'd receive.", rent, setRent, "£")}
        {field("vc-bills", "Bills per room, per week", "Energy, council tax, water, internet: they keep running while a room is empty.", bills, setBills, "£")}
        {field("vc-weeks", "Weeks they've been empty", "Roughly, on average.", weeks, setWeeks)}
      </div>

      <div className="rounded-card bg-[#17202e] p-6 text-white sm:p-8" aria-live="polite">
        <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#ffd56b]">Your empty rooms are costing you</p>
        <p className="mt-2 font-display text-[52px] leading-none tabular-nums sm:text-[64px]">{gbp(result.monthly)}</p>
        <p className="mt-1 text-[16px] text-[#c6d3e1]">every month</p>
        <dl className="mt-6 grid grid-cols-3 gap-3">
          {[["Per week", result.weekly], ["Per year", result.yearly], ["Lost so far", result.soFar]].map(([label, value]) => (
            <div key={label as string} className="rounded-[12px] bg-[#243247] p-3">
              <dt className="text-[12px] text-[#9fb2c8]">{label}</dt>
              <dd className="mt-1 text-[19px] font-bold tabular-nums">{gbp(value as number)}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-6 text-[15px] leading-relaxed text-[#c6d3e1]">
          Referrers, support workers and councils search RoomsNow every day for rooms they can place into now. Listing is free and takes a few minutes.
        </p>
        <Link href="/register?type=PROVIDER&src=void-calculator" className="mt-5 inline-flex rounded-[10px] bg-[#ffd56b] px-6 py-3.5 text-[16px] font-bold text-[#17202e] hover:brightness-95">
          List your empty rooms free →
        </Link>
      </div>
    </div>
  );
}
