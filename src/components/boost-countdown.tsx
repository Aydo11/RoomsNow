"use client";

import { useEffect, useState } from "react";

function remaining(until: string) {
  const milliseconds = Math.max(0, new Date(until).getTime() - Date.now());
  const hours = Math.floor(milliseconds / 3_600_000);
  const minutes = Math.floor((milliseconds % 3_600_000) / 60_000);
  if (milliseconds === 0) return "Ending now";
  return `${hours}h ${minutes}m left`;
}

export function BoostCountdown({ until, compact = false }: { until: string; compact?: boolean }) {
  const [label, setLabel] = useState(() => remaining(until));

  useEffect(() => {
    const update = () => setLabel(remaining(until));
    update();
    const timer = window.setInterval(update, 30_000);
    return () => window.clearInterval(timer);
  }, [until]);

  return (
    <span className={`${compact ? "text-[12px]" : "text-[14px]"} inline-flex items-center gap-1.5 font-semibold`} aria-live="polite">
      <TimerIcon />
      {label}
    </span>
  );
}

function TimerIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 2h6" />
      <path d="M12 14V9" />
      <path d="m16.5 5.5 1.5-1.5" />
      <circle cx="12" cy="14" r="7" />
    </svg>
  );
}
