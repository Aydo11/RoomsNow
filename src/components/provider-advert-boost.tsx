"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BoostCountdown } from "./boost-countdown";
import { SuccessCelebration } from "./success-celebration";
import { boostListingAction } from "@/server/actions/billing";

export function ProviderAdvertBoost({
  listingId,
  boostedUntil,
  initiallyActive,
  canBoost,
}: {
  listingId: string;
  boostedUntil: string | null;
  initiallyActive: boolean;
  canBoost: boolean;
}) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(initiallyActive);
  const [message, setMessage] = useState<string | null>(null);
  const [celebrating, setCelebrating] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const update = () => setActive(!!boostedUntil && new Date(boostedUntil).getTime() > Date.now());
    update();
    const timer = window.setInterval(update, 30_000);
    return () => window.clearInterval(timer);
  }, [boostedUntil]);

  function shockAdvertCard() {
    const card = rootRef.current?.closest<HTMLElement>("[data-advert-card]");
    if (!card) return;
    card.classList.remove("advert-boost-shock");
    // Restart the effect even if this card was animated very recently.
    void card.offsetWidth;
    card.classList.add("advert-boost-shock");
    window.setTimeout(() => card.classList.remove("advert-boost-shock"), 1900);
  }

  return (
    <div ref={rootRef} className="flex flex-wrap items-center gap-3">
      {celebrating && (
        <SuccessCelebration
          kind="boost"
          onDone={() => {
            setCelebrating(false);
            setMessage(null);
            router.refresh();
          }}
        />
      )}
      {active && boostedUntil && (
        <div className="inline-flex flex-wrap items-center gap-2 rounded-[10px] bg-pine-light px-3 py-2 text-pine-dark">
          <span className="inline-flex items-center gap-1.5 text-[13px] font-bold">
            <LightningIcon /> Boosted
          </span>
          <BoostCountdown until={boostedUntil} compact />
        </div>
      )}
      {active ? (
        <Link href={`/provider/adverts/${listingId}#boost`} className="btn-secondary inline-flex items-center gap-2">
          Manage boost
        </Link>
      ) : canBoost ? (
        <button
          type="button"
          className="btn-primary inline-flex items-center gap-2"
          disabled={pending}
          onClick={() => startTransition(async () => {
            const response = await boostListingAction(listingId);
            setMessage(response?.message ?? null);
            if (response?.ok) {
              shockAdvertCard();
              setCelebrating(true);
            }
          })}
        >
          <LightningIcon /> {pending ? "Starting boost…" : "Boost for 24 hours"}
        </button>
      ) : (
        <Link href={`/provider/adverts/${listingId}#boost`} className="btn-primary inline-flex items-center gap-2">
          <LightningIcon /> Get boosts
        </Link>
      )}
      {message && !celebrating && <span className="text-[13px] text-ink-soft">{message}</span>}
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
