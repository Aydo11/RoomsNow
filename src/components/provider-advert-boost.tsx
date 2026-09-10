"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BoostCountdown } from "./boost-countdown";

export function ProviderAdvertBoost({
  listingId,
  boostedUntil,
  initiallyActive,
}: {
  listingId: string;
  boostedUntil: string | null;
  initiallyActive: boolean;
}) {
  const [active, setActive] = useState(initiallyActive);

  useEffect(() => {
    const update = () => setActive(!!boostedUntil && new Date(boostedUntil).getTime() > Date.now());
    update();
    const timer = window.setInterval(update, 30_000);
    return () => window.clearInterval(timer);
  }, [boostedUntil]);

  return (
    <div className="flex flex-wrap items-center gap-3">
      {active && boostedUntil && (
        <div className="inline-flex flex-wrap items-center gap-2 rounded-[10px] bg-pine-light px-3 py-2 text-pine-dark">
          <span className="inline-flex items-center gap-1.5 text-[13px] font-bold">
            <LightningIcon /> Boosted
          </span>
          <BoostCountdown until={boostedUntil} compact />
        </div>
      )}
      <Link
        href={`/provider/adverts/${listingId}#boost`}
        className={`${active ? "btn-secondary" : "btn-primary"} inline-flex items-center gap-2`}
      >
        {!active && <LightningIcon />}
        {active ? "Manage boost" : "Boost for 24 hours"}
      </Link>
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
