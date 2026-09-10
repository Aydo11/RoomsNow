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
    <span className={compact ? "text-[12px] font-semibold" : "text-[14px] font-semibold"} aria-live="polite">
      <span aria-hidden="true">⏳</span> {label}
    </span>
  );
}
