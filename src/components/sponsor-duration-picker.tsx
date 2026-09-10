"use client";

import { useState } from "react";
import Link from "next/link";
import { SPONSOR_PACKAGES, type SponsorPackage } from "@/lib/sponsor-packages";
import { money } from "@/lib/format";
import { clsx } from "@/lib/clsx";

const NOTES: Record<SponsorPackage, string> = {
  WEEK: "Fill a short vacancy",
  MONTH: "Most popular",
  QUARTER: "Best value",
};

const ORDER: SponsorPackage[] = ["WEEK", "MONTH", "QUARTER"];

export function SponsorDurationPicker({ provider, livePayments }: { provider: boolean; livePayments: boolean }) {
  const [choice, setChoice] = useState<SponsorPackage>("MONTH");

  const continueHref = provider ? `/provider/adverts?sponsor=${choice}` : "/register?type=PROVIDER";

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-faint">Choose a duration</p>
          <h3 className="mt-1 text-[20px]">One-off payment, no subscription</h3>
        </div>
        <p className="text-[13px] text-ink-faint">Every package uses the same fair hourly rotation; the duration only changes how long the advert stays sponsored.</p>
      </div>

      <fieldset className="mt-5">
        <legend className="sr-only">Choose how long to sponsor an advert</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          {ORDER.map((key) => {
            const pkg = SPONSOR_PACKAGES[key];
            const selected = choice === key;
            return (
              <button
                type="button"
                key={key}
                onClick={() => setChoice(key)}
                aria-pressed={selected}
                className={clsx(
                  "relative rounded-[12px] border p-5 text-left transition-[border-color,background-color,box-shadow,transform] duration-200 hover:-translate-y-0.5",
                  selected ? "border-pine bg-pine-light/40 shadow-raise" : "border-line bg-white hover:border-line-strong",
                )}
              >
                {key === "MONTH" && (
                  <span className="absolute -top-3 right-3 rounded-pill bg-pine px-2.5 py-1 text-[11px] font-semibold text-white">
                    Popular
                  </span>
                )}
                <span className={clsx("absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full border", selected ? "border-pine bg-pine text-white" : "border-line-strong")} aria-hidden="true">
                  {selected && (
                    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none">
                      <path d="m4 10.5 3.5 3.5L16 5.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                <p className="text-[15px] font-medium">{pkg.label}</p>
                <p className="mt-2 font-display text-[30px] leading-none">{money(pkg.amount)}</p>
                <p className="mt-2 text-[13px] text-ink-faint">{money(Math.round(pkg.amount / pkg.days))}/day</p>
                <p className="mt-3 text-[14px] text-ink-soft">{NOTES[key]}</p>
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5">
        <p className="max-w-[60ch] text-[13px] text-ink-faint">
          {livePayments ? "Payment is taken securely through Stripe Checkout." : "Online payments are being configured."} Select the advert first, then choose its duration.
        </p>
        <Link href={continueHref} className="btn-primary">
          {provider ? `Choose an advert for ${SPONSOR_PACKAGES[choice].label}` : "Create a provider account"}
        </Link>
      </div>
    </div>
  );
}
