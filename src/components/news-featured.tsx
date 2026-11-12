"use client";

import { useEffect, useState, type ReactNode } from "react";

/** The Featured slot: rotates through up to three stories, with dots to pick one. Stays put for reduced motion. */
export function NewsFeatured({ slides }: { slides: ReactNode[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (slides.length < 2 || paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % slides.length), 6000);
    return () => window.clearInterval(timer);
  }, [slides.length, paused]);

  return (
    <div className="relative h-full min-h-[340px] sm:min-h-[460px]" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
      {slides.map((slide, i) => (
        <div key={i} className={`absolute inset-0 transition-opacity duration-700 ${i === index ? "opacity-100" : "pointer-events-none opacity-0"}`} aria-hidden={i !== index} inert={i !== index || undefined}>
          {slide}
        </div>
      ))}
      {slides.length > 1 && (
        <div className="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Show featured story ${i + 1}`}
              aria-current={i === index || undefined}
              className={`h-1 w-7 rounded-full transition-colors ${i === index ? "bg-white" : "bg-white/40 hover:bg-white/70"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
