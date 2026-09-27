"use client";

import { useState } from "react";
import { clsx } from "@/lib/clsx";

/**
 * Segmented control with a sliding highlight. Both panels are pre-rendered on
 * the server and passed down as nodes, so switching tabs is just swapping
 * which one is mounted — no second data fetch, no loading state.
 */
export type PricingTab = "provider" | "referrer" | "services";

const TABS = [
  ["provider", "Providers"],
  ["referrer", "Referral agencies"],
  ["services", "Trades & suppliers"],
] as const;

export function PricingTabs({
  providerPanel,
  referrerPanel,
  servicesPanel,
  initialTab = "provider",
}: {
  providerPanel: React.ReactNode;
  referrerPanel: React.ReactNode;
  servicesPanel: React.ReactNode;
  initialTab?: PricingTab;
}) {
  const [tab, setTab] = useState<PricingTab>(initialTab);
  const index = TABS.findIndex(([value]) => value === tab);

  return (
    <div>
      <div className="relative grid w-full max-w-[600px] grid-cols-3 overflow-hidden rounded-pill border border-line bg-white p-1">
        <span
          className="pointer-events-none absolute inset-y-1 left-1 w-[calc((100%-8px)/3)] rounded-pill bg-ink transition-transform duration-300 ease-out"
          style={{ transform: `translateX(${index * 100}%)` }}
          aria-hidden="true"
        />
        {TABS.map(([value, label]) => (
          <button
            key={value}
            onClick={() => setTab(value)}
            aria-pressed={tab === value}
            className={clsx(
              "relative z-10 min-w-0 rounded-pill px-2 py-2.5 text-center text-[13px] font-medium leading-tight transition-colors duration-200 sm:px-4 sm:text-[14px]",
              tab === value ? "text-white" : "text-ink-soft hover:text-ink",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div key={tab} className="mt-8 animate-fade-in-up">
        {tab === "provider" ? providerPanel : tab === "referrer" ? referrerPanel : servicesPanel}
      </div>
    </div>
  );
}
