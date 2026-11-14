"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BOOST_PACKAGES, type BoostPack } from "@/lib/boost-packages";
import { boostListingAction, purchaseBoostPackAction } from "@/server/actions/billing";
import { money } from "@/lib/format";
import { clsx } from "@/lib/clsx";
import { BoostBalance, LightningIcon } from "./boost-panel";
import { BoostCountdown } from "./boost-countdown";
import { SuccessCelebration } from "./success-celebration";

const PACKS = Object.entries(BOOST_PACKAGES) as [BoostPack, (typeof BOOST_PACKAGES)[BoostPack]][];

type Advert = { id: string; title: string; boostedUntil: string | null; sponsored: boolean };

/** Boost packs and per-advert boost/sponsor actions, on the Membership page. */
export function MembershipBoosts({
  adverts,
  includedTotal,
  includedRemaining,
  purchasedRemaining,
  paymentsEnabled,
  purchased,
}: {
  adverts: Advert[];
  includedTotal: number;
  includedRemaining: number;
  purchasedRemaining: number;
  paymentsEnabled: boolean;
  purchased: boolean;
}) {
  const router = useRouter();
  const [choice, setChoice] = useState<BoostPack>("THREE");
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [celebrating, setCelebrating] = useState(false);
  const [pending, startTransition] = useTransition();
  const total = includedRemaining + purchasedRemaining;

  return (
    <div className="card p-5">
      {purchased && <SuccessCelebration kind="boost-purchase" clearQueryParam="boost_pack" />}
      {celebrating && <SuccessCelebration kind="boost" onDone={() => { setCelebrating(false); router.refresh(); }} />}

      <BoostBalance total={total} included={includedRemaining} includedTotal={includedTotal} purchased={purchasedRemaining} />

      <div className="mt-5 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-[16px] font-bold">Buy boosts</h3>
        <span className="text-[13px] text-ink-faint">One-off payment · credits never expire · each boost lasts 24 hours</span>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {PACKS.map(([key, pack]) => (
          <button
            key={key}
            type="button"
            aria-pressed={choice === key}
            onClick={() => setChoice(key)}
            className={clsx("rounded-[12px] border p-4 text-left transition", choice === key ? "border-pine bg-pine-light shadow-raise" : "border-line hover:border-pine/40")}
          >
            <span className="text-[12px] font-bold uppercase tracking-[0.08em] text-pine-dark">{pack.shortLabel}</span>
            <span className="mt-1 block text-[18px] font-bold">{pack.label}</span>
            <span className="mt-2 block font-display text-[26px]">{money(pack.amount)}</span>
            <span className="text-[12px] text-ink-faint">{money(Math.round(pack.amount / pack.credits))} each</span>
          </button>
        ))}
      </div>
      <button
        className="btn-primary mt-4"
        disabled={pending || !paymentsEnabled}
        onClick={() => startTransition(async () => {
          const response = await purchaseBoostPackAction(choice, "membership");
          setResult(response?.message ?? null);
        })}
      >
        {paymentsEnabled ? `Buy ${BOOST_PACKAGES[choice].label} for ${money(BOOST_PACKAGES[choice].amount)}` : "Payments unavailable"}
      </button>

      <div className="mt-6 border-t border-line pt-5">
        <h3 className="text-[16px] font-bold">Your live adverts</h3>
        {adverts.length === 0 ? (
          <p className="mt-2 text-[14px] text-ink-soft">No live adverts yet. <Link href="/provider/adverts" className="font-semibold text-pine-dark underline">Go to adverts</Link></p>
        ) : (
          <ul className="mt-3 divide-y divide-line rounded-[12px] border border-line">
            {adverts.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14.5px] font-semibold text-ink">{a.title}</span>
                  <span className="mt-0.5 flex flex-wrap gap-2 text-[12.5px] text-ink-soft">
                    {a.boostedUntil ? <BoostCountdown until={a.boostedUntil} compact /> : <span>Not boosted</span>}
                    {a.sponsored && <span className="font-semibold text-pine-dark">Sponsored</span>}
                  </span>
                </span>
                <span className="flex shrink-0 flex-wrap gap-2">
                  <button
                    className="btn-primary min-h-0 px-3! py-1.5! text-[13px]!"
                    disabled={pending || !!a.boostedUntil || total === 0}
                    onClick={() => {
                      setBusy(a.id);
                      startTransition(async () => {
                        const response = await boostListingAction(a.id);
                        setResult(response?.message ?? null);
                        setBusy(null);
                        if (response?.ok) setCelebrating(true);
                      });
                    }}
                  >
                    <span className="inline-flex items-center gap-1.5"><LightningIcon />{busy === a.id ? "Starting…" : a.boostedUntil ? "Boosted" : total ? "Boost now" : "Buy boosts first"}</span>
                  </button>
                  <Link href={`/provider/adverts/${a.id}#sponsored`} className="btn-secondary min-h-0 px-3! py-1.5! text-[13px]!">
                    {a.sponsored ? "Manage sponsor" : "Sponsor"}
                  </Link>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {result && <p className="mt-4 text-[14px] text-ink-soft" role="status">{result}</p>}
    </div>
  );
}
