"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SPOTLIGHT_ROTATE_MS } from "@/lib/spotlight";

export type SpotlightItem = { id: string; orgName: string; href: string; logoUrl: string | null; headline: string; body: string };

function Logo({ name, url }: { name: string; url: string | null }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element -- uploaded logos come from storage at varying sizes
    return <img src={url} alt="" className="h-14 w-14 shrink-0 rounded-card border border-line bg-white object-contain p-1 sm:h-16 sm:w-16" />;
  }
  return (
    <span aria-hidden="true" className="grid h-14 w-14 shrink-0 place-items-center rounded-card bg-pine text-[22px] font-bold text-white sm:h-16 sm:w-16">
      {name.trim().charAt(0).toUpperCase() || "R"}
    </span>
  );
}

/** One spotlight advert. Also used as the live preview on the purchase form. */
export function SpotlightCard({ item, preview = false }: { item: SpotlightItem; preview?: boolean }) {
  const inner = (
    <>
      <Logo name={item.orgName} url={item.logoUrl} />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px]">
          <span className="rounded-full bg-clay-light px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-clay">Sponsored</span>
          <span className="truncate font-medium text-ink-soft">{item.orgName}</span>
        </span>
        <span className="mt-1 block text-balance text-[18px] font-bold leading-snug text-ink sm:text-[20px]">{item.headline || "Your headline"}</span>
        <span className="mt-1 block text-[14.5px] leading-relaxed text-ink-soft">{item.body || "A short description of what you offer."}</span>
      </span>
      <span className="hidden shrink-0 self-center font-semibold text-pine-dark sm:block">Find out more <span aria-hidden="true">→</span></span>
    </>
  );
  const className = "flex items-start gap-4 rounded-card border border-clay/35 bg-white p-4 shadow-raise sm:p-5";
  return preview ? <div className={className}>{inner}</div> : (
    <Link href={item.href} className={`${className} transition-[border-color,transform] hover:-translate-y-0.5 hover:border-clay/60 focus-visible:outline-2 focus-visible:outline-offset-2`}>{inner}</Link>
  );
}

/**
 * The homepage spotlight band. One live spotlight just shows; several rotate
 * every few seconds, pausing while hovered or focused and never auto-moving
 * for people who prefer reduced motion. All slides share one grid cell so
 * the band keeps the tallest slide's height and the page never jumps.
 */
export function SpotlightCarousel({ items }: { items: SpotlightItem[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (items.length < 2 || paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % items.length), SPOTLIGHT_ROTATE_MS);
    return () => window.clearInterval(timer);
  }, [items.length, paused]);

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label="Sponsored organisations"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="grid">
        {items.map((item, i) => (
          <div
            key={item.id}
            aria-hidden={i !== index}
            inert={i !== index}
            className={`col-start-1 row-start-1 transition-opacity duration-500 motion-reduce:transition-none ${i === index ? "opacity-100" : "pointer-events-none opacity-0"}`}
          >
            <SpotlightCard item={item} />
          </div>
        ))}
      </div>
      {items.length > 1 && (
        <div className="mt-3 flex justify-center gap-2">
          {items.map((item, i) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Show ${item.orgName}`}
              aria-current={i === index}
              className={`h-2.5 rounded-full transition-[width,background-color] ${i === index ? "w-6 bg-clay" : "w-2.5 bg-line hover:bg-ink-faint"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
