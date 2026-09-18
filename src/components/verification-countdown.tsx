"use client";

import { useEffect, useState } from "react";
import { clsx } from "@/lib/clsx";

function formatDuration(ms: number) {
  const totalMinutes = Math.max(0, Math.floor(ms / 60_000));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/**
 * Live countdown to — or elapsed time past — a provider's 90-day
 * verification deadline. Ticks once a minute; day/hour granularity is all
 * that's meaningful for a 90-day window, so there's no reason to re-render
 * every second. Deadline is passed as an ISO string (a Date can't cross the
 * server/client boundary as a prop) and the diff is computed client-side so
 * it reflects the viewer's own clock rather than going stale between
 * dashboard visits.
 */
export function VerificationCountdown({ deadlineAt }: { deadlineAt: string }) {
  const deadline = new Date(deadlineAt).getTime();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const diff = deadline - now;
  const overdue = diff <= 0;

  return (
    <span
      className={clsx(
        "inline-flex shrink-0 items-center gap-1.5 rounded-pill px-2.5 py-1 text-[12px] font-semibold",
        overdue ? "bg-clay/15 text-clay" : "bg-pine-light text-pine-dark",
      )}
      title={
        overdue
          ? "Time since your 90-day verification window closed"
          : "Time left in your 90-day verification window"
      }
    >
      <ClockIcon />
      {overdue ? `${formatDuration(Math.abs(diff))} overdue` : `${formatDuration(diff)} left to verify`}
    </span>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
