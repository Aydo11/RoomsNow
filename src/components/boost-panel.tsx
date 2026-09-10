"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BOOST_PACKAGES, type BoostPack } from "@/lib/boost-packages";
import { boostListingAction, purchaseBoostPackAction } from "@/server/actions/billing";
import { money } from "@/lib/format";
import { clsx } from "@/lib/clsx";
import { BoostCountdown } from "./boost-countdown";

const PACKS = Object.entries(BOOST_PACKAGES) as [BoostPack, (typeof BOOST_PACKAGES)[BoostPack]][];

export function BoostPanel({
  listingId,
  live,
  boostedUntil,
  priorityUntil,
  impressions,
  clicks,
  includedTotal,
  includedRemaining,
  purchasedRemaining,
  paymentsEnabled,
}: {
  listingId: string;
  live: boolean;
  boostedUntil: string | null;
  priorityUntil: string | null;
  impressions: number;
  clicks: number;
  includedTotal: number;
  includedRemaining: number;
  purchasedRemaining: number;
  paymentsEnabled: boolean;
}) {
  const router = useRouter();
  const [choice, setChoice] = useState<BoostPack>("THREE");
  const [result, setResult] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const active = !!boostedUntil && new Date(boostedUntil) > new Date();
  const priorityActive = !!priorityUntil && new Date(priorityUntil) > new Date();
  const totalRemaining = includedRemaining + purchasedRemaining;

  return (
    <div className="overflow-hidden rounded-card border border-pine/30 bg-white shadow-[0_1px_2px_rgba(21,42,58,.04)]">
      <div className="bg-pine px-5 py-4 text-white">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="flex items-center gap-1.5 text-[12px] font-extrabold uppercase tracking-[0.1em] text-white/75"><LightningIcon /> 24-hour visibility boost</p>
            <h3 className="mt-1 text-[22px] font-bold">Put this advert at the front</h3>
          </div>
          {active && <BoostCountdown until={boostedUntil} />}
        </div>
      </div>

      <div className="p-5">
        {active ? (
          <>
            <p className="text-[15px] leading-relaxed text-ink-soft">
              {priorityActive
                ? "This advert is in its three-hour newest-boost window."
                : "The newest-boost window has finished, so this advert now rotates hourly with other active boosts."}
            </p>
            <dl className="mt-4 grid grid-cols-3 gap-4 rounded-[12px] bg-pine-light/55 p-4 text-[14px]">
              <div><dt className="text-ink-faint">Times shown</dt><dd className="mt-1 text-[18px] font-bold">{impressions.toLocaleString("en-GB")}</dd></div>
              <div><dt className="text-ink-faint">Clicks</dt><dd className="mt-1 text-[18px] font-bold">{clicks.toLocaleString("en-GB")}</dd></div>
              <div><dt className="text-ink-faint">Click rate</dt><dd className="mt-1 text-[18px] font-bold">{impressions ? `${((clicks / impressions) * 100).toFixed(1)}%` : "—"}</dd></div>
            </dl>
          </>
        ) : (
          <>
            <p className="text-[15px] leading-relaxed text-ink-soft">
              A boost lasts exactly 24 hours. It leads the boosted lane for its first three hours, then rotates hourly with other active boosts. Use it when your own enquiry data shows people are active.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <span className="rounded-pill bg-pine-light px-3 py-1.5 text-[13px] font-semibold text-pine-dark">{includedRemaining} of {includedTotal} membership boosts left</span>
              <span className="rounded-pill bg-paper-sunk px-3 py-1.5 text-[13px] font-semibold text-ink-soft">{purchasedRemaining} purchased credits</span>
            </div>
            <button
              className="btn-primary mt-5"
              disabled={pending || !live || totalRemaining === 0}
              onClick={() => startTransition(async () => {
                const response = await boostListingAction(listingId);
                setResult(response?.message ?? null);
                router.refresh();
              })}
            >
              <span className="inline-flex items-center gap-2"><LightningIcon />{pending ? "Starting boost…" : !live ? "Advert must be live" : totalRemaining ? "Use one boost now" : "Choose a pack below"}</span>
            </button>
          </>
        )}

        <div className="mt-6 border-t border-line pt-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h4 className="text-[16px] font-bold">Buy boosts</h4>
            <span className="text-[13px] text-ink-faint">One-off payment · credits do not expire</span>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {PACKS.map(([key, pack]) => (
              <button
                key={key}
                type="button"
                aria-pressed={choice === key}
                onClick={() => setChoice(key)}
                className={clsx(
                  "rounded-[12px] border p-4 text-left transition",
                  choice === key ? "border-pine bg-pine-light shadow-raise" : "border-line hover:border-pine/40",
                )}
              >
                <span className="text-[12px] font-bold uppercase tracking-[0.08em] text-pine-dark">{pack.shortLabel}</span>
                <span className="mt-1 block text-[18px] font-bold">{pack.label}</span>
                <span className="mt-2 block font-display text-[26px]">{money(pack.amount)}</span>
                <span className="text-[12px] text-ink-faint">{money(Math.round(pack.amount / pack.credits))} each</span>
              </button>
            ))}
          </div>
          <button
            className="btn-secondary mt-4"
            disabled={pending || !paymentsEnabled}
            onClick={() => startTransition(async () => {
              const response = await purchaseBoostPackAction(choice);
              setResult(response?.message ?? null);
            })}
          >
            {paymentsEnabled ? `Buy ${BOOST_PACKAGES[choice].label}` : "Payments unavailable"}
          </button>
        </div>

        {result && <p className="mt-4 text-[14px] text-ink-soft">{result}</p>}
      </div>
    </div>
  );
}

function LightningIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
      <path d="M13.2 1.8 4.7 13.1a1 1 0 0 0 .8 1.6h5.1l-.8 7a.5.5 0 0 0 .9.4l8.6-11.3a1 1 0 0 0-.8-1.6h-5.2l.8-7a.5.5 0 0 0-.9-.4Z" />
    </svg>
  );
}
