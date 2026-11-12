"use client";

import { useEffect, useState } from "react";
import { PlanDemo } from "@/components/plan-demo";
import { clsx } from "@/lib/clsx";
import { PLAN_GUIDES, PLAN_GUIDE_KEYS, guidePrices, planPdfPath, type PlanGuideKey, type PlanPrices } from "@/lib/plan-guides";

/**
 * "See it in action": pick any plan or paid extra to watch its demo and read
 * what it includes in depth. A link to #demo-<slug> opens that one.
 */
export function PlanShowcase({ prices, initial = "PROFESSIONAL" }: { prices: PlanPrices; initial?: PlanGuideKey }) {
  const [key, setKey] = useState<PlanGuideKey>(initial);
  const g = PLAN_GUIDES[key];

  useEffect(() => {
    const fromHash = () => {
      const slug = window.location.hash.replace("#demo-", "");
      const match = PLAN_GUIDE_KEYS.find((k) => PLAN_GUIDES[k].slug === slug);
      if (match) setKey(match);
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, []);

  const groups = [...new Set(PLAN_GUIDE_KEYS.map((k) => PLAN_GUIDES[k].group))];

  return (
    <div>
      <div className="flex flex-wrap gap-x-6 gap-y-3">
        {groups.map((group) => (
          <div key={group}>
            <p className="mb-1.5 text-[11.5px] font-semibold uppercase tracking-[0.08em] text-ink-faint">{group}</p>
            <div className="flex flex-wrap gap-1.5">
              {PLAN_GUIDE_KEYS.filter((k) => PLAN_GUIDES[k].group === group).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKey(k)}
                  aria-pressed={k === key}
                  className={clsx("rounded-pill border px-3.5 py-1.5 text-[14px] font-semibold transition", k === key ? "border-ink bg-ink text-white" : "border-line bg-white text-ink-soft hover:border-line-strong hover:text-ink")}
                >
                  {PLAN_GUIDES[k].name}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div key={key} className="mt-6 grid animate-fade-in-up gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <PlanDemo kind={key} />
          <ol className="mt-4 grid gap-2 sm:grid-cols-2">
            {g.steps.map((step, i) => (
              <li key={step} className="flex gap-2.5 rounded-[12px] bg-paper-sunk/70 p-3 text-[14px]">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-pine text-[12px] font-bold text-white">{i + 1}</span>
                {step}
              </li>
            ))}
          </ol>
        </div>

        <div className="min-w-0">
          <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-pine-dark">{g.group}</p>
          <h3 className="mt-1 text-[22px] leading-snug [text-wrap:balance]">{g.headline}</h3>
          <p className="mt-2 text-[14.5px] leading-relaxed text-ink-soft">{g.whoFor}</p>

          <div className="mt-4 divide-y divide-line rounded-card border border-line bg-white">
            {guidePrices(key, prices).map((p) => (
              <div key={p.label} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 px-4 py-2.5">
                <span className="text-[14px] font-semibold">{p.label}</span>
                <span className="text-right">
                  {p.was && <s className="mr-1.5 text-[13px] text-ink-faint decoration-clay">{p.was}</s>}
                  <span className="font-display text-[18px] tabular-nums">{p.price}</span>
                  {p.note && <span className={clsx("block text-[12px]", p.was ? "font-semibold text-clay" : "text-ink-faint")}>{p.note}</span>}
                </span>
              </div>
            ))}
          </div>

          <ul className="mt-4 space-y-3">
            {g.details.map((item) => (
              <li key={item.title} className="flex gap-2.5">
                <svg viewBox="0 0 16 16" className="mt-1 h-3.5 w-3.5 shrink-0 text-pine" fill="currentColor" aria-hidden="true"><path d="M6.2 11.6 2.6 8l1-1 2.6 2.6L12.4 3.4l1 1-7.2 7.2Z" /></svg>
                <span className="text-[14px] leading-relaxed text-ink-soft"><strong className="text-ink">{item.title}.</strong> {item.body}</span>
              </li>
            ))}
          </ul>

          <div className="mt-5 flex flex-wrap gap-2">
            <a href={planPdfPath(key)} target="_blank" rel="noopener" className="btn-secondary">Download the PDF guide</a>
            <a href={`/demos/${g.slug}`} className="btn-ghost">Open full-screen demo →</a>
          </div>
        </div>
      </div>
    </div>
  );
}
