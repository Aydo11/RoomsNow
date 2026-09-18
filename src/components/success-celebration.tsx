"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type CelebrationKind = "boost" | "boost-purchase" | "membership";

const COPY: Record<CelebrationKind, { eyebrow: string; title: string; message: string }> = {
  boost: {
    eyebrow: "BOOST IGNITED",
    title: "Your advert is taking off",
    message: "It now leads the boosted lane and has 24 hours of extra visibility.",
  },
  "boost-purchase": {
    eyebrow: "BOOSTS ADDED",
    title: "Ready for lift-off",
    message: "Your new boost credits are ready to use on any live advert.",
  },
  membership: {
    eyebrow: "MEMBERSHIP UPGRADE",
    title: "A stronger plan is on its way",
    message: "Payment is complete. Your new access will appear as soon as Stripe confirms it.",
  },
};

const PARTICLES = [
  [-128, -58, 0], [-96, -112, 90], [-48, -138, 180], [12, -146, 270], [70, -126, 45],
  [118, -82, 135], [142, -20, 225], [124, 48, 315], [82, 100, 70], [24, 124, 160],
  [-42, 118, 250], [-96, 86, 340], [-136, 30, 110], [-146, -18, 200],
] as const;

export function SuccessCelebration({
  kind,
  onDone,
  clearQueryParam,
}: {
  kind: CelebrationKind;
  onDone?: () => void;
  clearQueryParam?: string;
}) {
  const [visible, setVisible] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const copy = COPY[kind];

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setVisible(false);
      if (clearQueryParam && searchParams.has(clearQueryParam)) {
        const next = new URLSearchParams(searchParams.toString());
        next.delete(clearQueryParam);
        next.delete("session_id");
        router.replace(next.size ? `${pathname}?${next.toString()}` : pathname, { scroll: false });
      }
      onDone?.();
    }, 3400);
    return () => window.clearTimeout(timer);
  }, [clearQueryParam, onDone, pathname, router, searchParams]);

  if (!visible) return null;

  return (
    <div className="celebration-layer" role="status" aria-live="polite" aria-atomic="true">
      <div className="celebration-halo" aria-hidden="true" />
      <div className="celebration-particles" aria-hidden="true">
        {PARTICLES.map(([x, y, rotate], index) => (
          <span
            key={`${x}-${y}`}
            className={index % 3 === 0 ? "celebration-particle celebration-particle-star" : "celebration-particle"}
            style={{ "--x": `${x}px`, "--y": `${y}px`, "--r": `${rotate}deg`, "--delay": `${index * 34}ms` } as CSSProperties}
          />
        ))}
      </div>

      <div className="celebration-card">
        <div className={`celebration-icon celebration-icon-${kind}`} aria-hidden="true">
          {kind === "boost" ? <LightningIcon /> : kind === "boost-purchase" ? <RocketIcon /> : <MembershipIcon />}
        </div>
        <p className="text-[11px] font-extrabold tracking-[0.14em] text-pine-dark">{copy.eyebrow}</p>
        <p className="mt-1 font-display text-[23px] font-bold leading-tight text-ink">{copy.title}</p>
        <p className="mt-2 max-w-[34ch] text-[14px] leading-relaxed text-ink-soft">{copy.message}</p>
      </div>
    </div>
  );
}

function LightningIcon() {
  return (
    <svg viewBox="0 0 48 48" fill="none" className="h-12 w-12" aria-hidden="true">
      <path d="M27.2 3.8 9.8 26.4c-.9 1.2-.1 3 1.4 3h10.2l-1.8 14.8c-.2 1.7 2 2.5 3 .9l15.7-23.4c.8-1.2-.1-2.8-1.5-2.8H27l3.2-13.6c.4-1.8-1.9-2.9-3-1.5Z" fill="currentColor" />
    </svg>
  );
}

function RocketIcon() {
  return (
    <svg viewBox="0 0 48 48" fill="none" className="h-12 w-12" aria-hidden="true">
      <path d="M29.5 6.3c5.1-3 9.8-2.5 12.2-2-0.1 2.6-.9 7.2-4.6 11.8l-9.8 12.2-8.8-8.8L29.5 6.3Z" fill="currentColor" />
      <path d="m18.7 18.9-8.4 1.3-5.8 5.7 12.2 1.2m11.9.9-1.3 8.5-5.7 5.7L20.4 30" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="32" cy="12.6" r="3.4" fill="white" />
      <path d="M14.7 33.3c-4.4.8-7.2 3.6-8.1 8 4.5-.8 7.3-3.5 8.1-8Z" fill="#F5A623" />
    </svg>
  );
}

function MembershipIcon() {
  return (
    <svg viewBox="0 0 48 48" fill="none" className="h-12 w-12" aria-hidden="true">
      <path d="m24 4.5 5.7 11.6 12.8 1.9-9.3 9 2.2 12.7L24 33.8l-11.4 5.9L14.8 27l-9.3-9 12.8-1.9L24 4.5Z" fill="currentColor" />
      <path d="m18.6 24 3.5 3.5 7.8-8" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
