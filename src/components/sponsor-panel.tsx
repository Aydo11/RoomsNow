"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { endSponsorshipAction, featureListingAction } from "@/server/actions/billing";
import type { SponsorPackage } from "@/lib/sponsor-packages";
import { money, shortDate } from "@/lib/format";
import { clsx } from "@/lib/clsx";

const PACKAGES: { key: SponsorPackage; label: string; price: number; note: string }[] = [
  { key: "WEEK", label: "7 days", price: 1900, note: "A short push while a room is empty." },
  { key: "MONTH", label: "30 days", price: 5900, note: "The usual choice. Outranks 7-day slots." },
  { key: "QUARTER", label: "90 days", price: 14900, note: "Top of the sponsored slots all quarter." },
];

export function SponsorPanel({
  listingId,
  featured,
  featuredUntil,
  impressions,
  clicks,
  includedSlots,
  usedSlots,
  live,
  paymentsEnabled,
  initialDuration,
}: {
  listingId: string;
  featured: boolean;
  featuredUntil: string | null;
  impressions: number;
  clicks: number;
  includedSlots: number;
  usedSlots: number;
  live: boolean;
  paymentsEnabled: boolean;
  initialDuration?: SponsorPackage;
}) {
  const router = useRouter();
  const [choice, setChoice] = useState<SponsorPackage>(initialDuration ?? "WEEK");
  const [result, setResult] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // Free credits only ever cover the 7-day package â choosing a longer one
  // always requires payment, even with credits still remaining.
  const hasFreeWeek = choice === "WEEK" && usedSlots < includedSlots;
  const isActive = featured && (!featuredUntil || new Date(featuredUntil) > new Date());

  if (!live) {
    return (
      <p className="card p-5 text-[15px] text-ink-soft">
        Only live adverts can be sponsored. Once this one is approved you&apos;ll be able to buy a
        slot here.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-card border border-line bg-white">
      <div className="border-b border-line bg-paper-sunk/60 p-5">
      {isActive ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[16px] text-clay">Sponsored</p>
              <p className="mt-0.5 text-[14px] text-ink-soft">
                {featuredUntil ? `Runs until ${shortDate(new Date(featuredUntil))}.` : "No end date set."}
              </p>
            </div>
            <button
              className="btn-ghost text-clay-dark"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await endSponsorshipAction(listingId);
                  router.refresh();
                })
              }
            >
              Stop sponsoring
            </button>
          </div>

          <dl className="mt-4 grid grid-cols-3 gap-4 border-t border-line pt-4 text-[14px]">
            <div>
              <dt className="text-[13px] text-ink-faint">Times shown</dt>
              <dd>{impressions.toLocaleString("en-GB")}</dd>
            </div>
            <div>
              <dt className="text-[13px] text-ink-faint">Clicks</dt>
              <dd>{clicks.toLocaleString("en-GB")}</dd>
            </div>
            <div>
              <dt className="text-[13px] text-ink-faint">Click rate</dt>
              <dd>{impressions ? `${((clicks / impressions) * 100).toFixed(1)}%` : "â"}</dd>
            </div>
          </dl>

          <p className="mt-4 text-[13px] text-ink-faint">
            Buying again extends the end date rather than replacing it.
          </p>
        </>
      ) : (
        <p className="text-[15px] leading-relaxed text-ink-soft">
          Sponsored adverts sit in up to three labelled slots at the top of the first page of
          matching searches, and get a highlighted pin on the map. They never appear on later pages,
          and paying doesn&apos;t change where your advert ranks organically, whether it gets
          verified, or how it&apos;s moderated.
        </p>
      )}
      </div>

      <div className="p-5">
      <fieldset>
        <legend className="text-[15px] font-medium text-ink">Choose how long to sponsor this advert</legend>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {PACKAGES.map((option) => (
          <button
            type="button"
            key={option.key}
            onClick={() => setChoice(option.key)}
            aria-pressed={choice === option.key}
            className={clsx(
              "relative rounded-[12px] border p-4 text-left transition-[border-color,background-color,box-shadow,transform] duration-200 hover:-translate-y-0.5",
              choice === option.key ? "border-pine bg-pine-light shadow-raise" : "border-line bg-white hover:border-line-strong",
            )}
          >
            <span className={clsx("absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full border", choice === option.key ? "border-pine bg-pine text-white" : "border-line-strong")} aria-hidden="true">
              {choice === option.key && (
                <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none">
                  <path d="m4 10.5 3.5 3.5L16 5.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
            <span className="block text-[15px] font-medium">{option.label}</span>
            <span className="mt-2 block font-display text-[25px] leading-none">
              {option.key === "WEEK" && usedSlots < includedSlots ? "Included" : money(option.price)}
            </span>
            {!(option.key === "WEEK" && usedSlots < includedSlots) && (
              <span className="mt-1 block text-[12px] text-ink-faint">{money(Math.round(option.price / (option.key === "WEEK" ? 7 : option.key === "MONTH" ? 30 : 90)))}/day</span>
            )}
            <span className="mt-3 block text-[13px] leading-relaxed text-ink-soft">{option.note}</span>
          </button>
        ))}
      </div>
      </fieldset>

      {includedSlots > 0 && (
        <p className="mt-3 text-[14px] text-pine-dark">
          Your plan includes {includedSlots} free 7-day sponsored slot{includedSlots === 1 ? "" : "s"} at a time
          {usedSlots < includedSlots ? ` â ${includedSlots - usedSlots} still free right now.` : " â all in use right now; this one will be paid."}
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
      <p className="max-w-md text-[13px] text-ink-faint">One-off payment. Sponsorship ends automatically; this does not start another subscription.</p>
      <button
        className="btn-primary"
        disabled={pending || (!hasFreeWeek && !paymentsEnabled)}
        onClick={() =>
          startTransition(async () => {
            const response = await featureListingAction(listingId, choice);
            setResult(response?.message ?? null);
            router.refresh();
          })
        }
      >
        {pending
          ? "Setting upâ¦"
          : !hasFreeWeek && !paymentsEnabled
            ? "Payments unavailable"
            : hasFreeWeek
              ? "Use free 7-day slot"
              : isActive
                ? "Extend sponsorship"
                : "Continue to payment"}
      </button>
      </div>

      {result && <p className="mt-3 text-[14px] text-ink-soft">{result}</p>}
      </div>
    </div>
  );
}
