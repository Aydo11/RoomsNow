"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * "Recently viewed" rooms, kept only in this browser. Nothing is sent to the
 * server, and the rail simply doesn't render until someone has opened an
 * advert.
 */
type RecentListing = { id: string; title: string; place: string; rent: string; image: string | null; at: number };

const KEY = "roomsnow-recently-viewed";
const MAX = 8;

function read(): RecentListing[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item.id === "string") : [];
  } catch {
    return [];
  }
}

/** Drop this on an advert page to remember it. Renders nothing. */
export function RecordRecentlyViewed(props: Omit<RecentListing, "at">) {
  const { id, title, place, rent, image } = props;
  useEffect(() => {
    try {
      const next = [{ id, title, place, rent, image, at: Date.now() }, ...read().filter((item) => item.id !== id)].slice(0, MAX);
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* private mode or storage full: nothing to remember, nothing breaks */
    }
  }, [id, title, place, rent, image]);
  return null;
}

export function RecentlyViewed({ excludeId, className = "" }: { excludeId?: string; className?: string }) {
  const [items, setItems] = useState<RecentListing[]>([]);
  useEffect(() => {
    setItems(read().filter((item) => item.id !== excludeId));
  }, [excludeId]);

  if (!items.length) return null;

  const clear = () => {
    try { localStorage.removeItem(KEY); } catch { /* ignore */ }
    setItems([]);
  };

  return (
    <section aria-labelledby="recently-viewed-heading" className={`animate-fade-in-up ${className}`}>
      <div className="flex items-end justify-between gap-4">
        <div>
          <span className="text-[12px] font-semibold tracking-[0.08em] text-pine-dark">PICK UP WHERE YOU LEFT OFF</span>
          <h2 id="recently-viewed-heading" className="mt-1 text-[22px]">Recently viewed</h2>
        </div>
        <button type="button" onClick={clear} className="text-[13px] font-medium text-ink-soft hover:text-ink hover:underline">Clear</button>
      </div>
      <ul className="recent-rail mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2">
        {items.map((item) => (
          <li key={item.id} className="w-[220px] shrink-0 snap-start">
            <Link href={`/listings/${item.id}`} className="card interactive-card group block h-full overflow-hidden">
              <span className="relative block h-28 overflow-hidden bg-paper-sunk">
                {item.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.image} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]" />
                ) : (
                  <span className="grid h-full place-items-center bg-gradient-to-br from-pine-light to-paper-sunk text-pine-dark">
                    <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M3 11 12 4l9 7v9H3v-9Z" /><path d="M9 20v-6h6v6" /></svg>
                  </span>
                )}
              </span>
              <span className="block p-3">
                <span className="line-clamp-1 block text-[14px] font-semibold text-ink group-hover:text-pine-dark">{item.title}</span>
                <span className="mt-0.5 line-clamp-1 block text-[12.5px] text-ink-soft">{item.place}</span>
                <span className="mt-1.5 block text-[13px] font-semibold text-pine-dark">{item.rent}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
