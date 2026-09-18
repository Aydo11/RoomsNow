"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { confirmListingAvailabilityAction } from "@/server/actions/listings";
import { timeAgo } from "@/lib/format";
import { toast } from "./toast";

const REASON_COPY: Record<string, string> = {
  NO_AVAILABILITY: "This was paused automatically because every room was marked unavailable.",
  STALE: "This was paused automatically because nobody confirmed it was still available.",
};

/**
 * Shown on an advert's own management page — explains an automatic pause
 * (see syncListingAvailability / runListingFreshnessCheck) in plain terms
 * and gives a one-click way out of it, or, while live, a low-friction way to
 * keep the staleness clock from ever reaching that point.
 */
export function AvailabilityBanner({
  id,
  status,
  pausedReason,
  confirmedAt,
}: {
  id: string;
  status: string;
  pausedReason: string | null;
  confirmedAt: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function confirm(reactivating: boolean) {
    startTransition(async () => {
      await confirmListingAvailabilityAction(id);
      toast.success(reactivating ? "Confirmed — the advert is live again." : "Confirmed as still available.");
      router.refresh();
    });
  }

  if (pausedReason && REASON_COPY[pausedReason]) {
    return (
      <div className="card mt-4 border-clay/30 bg-clay-light/60 p-4">
        <p className="text-[14px] font-semibold text-clay-dark">Paused automatically</p>
        <p className="mt-1 text-[14px] text-ink-soft">{REASON_COPY[pausedReason]}</p>
        {pausedReason === "STALE" ? (
          <button className="btn-primary mt-3" disabled={pending} onClick={() => confirm(true)}>
            Yes, still available — bring it back
          </button>
        ) : (
          <p className="mt-3 text-[13px] text-ink-faint">
            Mark a room as available, reserved or void on the rooms list below to bring it back automatically.
          </p>
        )}
      </div>
    );
  }

  if (status === "ACTIVE") {
    return (
      <div className="mt-4 flex flex-wrap items-center gap-3 text-[13px] text-ink-faint">
        <span>Availability confirmed {timeAgo(confirmedAt)}</span>
        <button className="text-pine-dark hover:underline disabled:opacity-60" disabled={pending} onClick={() => confirm(false)}>
          Confirm still available
        </button>
      </div>
    );
  }

  return null;
}
