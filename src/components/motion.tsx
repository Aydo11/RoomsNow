"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Site-wide motion, kept out of the way of the actual pages:
 *
 * - `[data-reveal]` elements ease in the first time they scroll into view.
 *   Nothing is hidden until this script runs, anything already on screen is
 *   shown straight away, and reduced-motion users never see it at all.
 * - `[data-spotlight]` elements get a soft glow that follows the pointer.
 * - The header gains a shadow once the page has scrolled.
 */
export function MotionEffects() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const onScroll = () => {
      const scrolled = window.scrollY > 8;
      if (scrolled !== root.hasAttribute("data-scrolled")) root.toggleAttribute("data-scrolled", scrolled);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    const onPointer = (event: PointerEvent) => {
      const target = (event.target as Element | null)?.closest?.("[data-spotlight]") as HTMLElement | null;
      if (!target) return;
      const rect = target.getBoundingClientRect();
      target.style.setProperty("--spot-x", `${event.clientX - rect.left}px`);
      target.style.setProperty("--spot-y", `${event.clientY - rect.top}px`);
    };
    if (!reduce) document.addEventListener("pointermove", onPointer, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("pointermove", onPointer);
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const reveal = (el: Element) => el.classList.add("is-revealed");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
      document.querySelectorAll("[data-reveal]").forEach(reveal);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            reveal(entry.target);
            entry.target.removeAttribute("data-reveal-watched");
            observer.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );

    const watched = new Set<Element>();
    const scan = () => {
      document.querySelectorAll("[data-reveal]:not(.is-revealed)").forEach((el) => {
        if (watched.has(el)) return;
        // Already on screen: show it now so nothing above the fold flickers.
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) el.classList.add("is-revealed", "reveal-static");
        else {
          watched.add(el);
          el.setAttribute("data-reveal-watched", "");
          observer.observe(el);
        }
      });
    };
    scan();
    root.classList.add("motion-ready");

    // Pages stream in and client components mount later, so keep watching.
    const mutations = new MutationObserver(() => scan());
    mutations.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      mutations.disconnect();
      // A client-side route change replaces the observer, but React can reuse
      // elements. Never leave an element hidden with no observer watching it.
      watched.forEach((el) => el.removeAttribute("data-reveal-watched"));
    };
  }, [pathname]);

  return null;
}

/** Thin progress bar at the very top while the next page loads. */
export function RouteProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const timer = useRef<number | null>(null);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      // Captured before next/link calls preventDefault on its own clicks.
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
      const url = new URL(link.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.search === location.search) return;
      setState("loading");
    };
    const onSubmit = (event: SubmitEvent) => {
      const form = event.target as HTMLFormElement | null;
      if (form?.method?.toLowerCase() === "get") setState("loading");
    };
    document.addEventListener("click", onClick, true);
    document.addEventListener("submit", onSubmit);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("submit", onSubmit);
    };
  }, []);

  useEffect(() => {
    setState((current) => (current === "loading" ? "done" : current));
  }, [pathname, searchParams]);

  useEffect(() => {
    if (timer.current) window.clearTimeout(timer.current);
    if (state === "done") timer.current = window.setTimeout(() => setState("idle"), 450);
    // Never leave a bar hanging if a navigation was cancelled.
    if (state === "loading") timer.current = window.setTimeout(() => setState("idle"), 12000);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [state]);

  return <div aria-hidden="true" className="route-progress" data-state={state} />;
}

/** Floating button that appears once the reader is well down a long page. */
export function BackToTop() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 900);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <button
      type="button"
      className="back-to-top print:hidden"
      data-show={show ? "" : undefined}
      tabIndex={show ? 0 : -1}
      aria-hidden={!show}
      aria-label="Back to top"
      onClick={() => {
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
        document.getElementById("main")?.focus({ preventScroll: true });
      }}
    >
      <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M10 15.5v-11M5 9l5-5 5 5" />
      </svg>
    </button>
  );
}

/**
 * Counts up to a number the first time it's seen. The real value is in the
 * markup from the start, so search engines, screen readers and no-JS
 * visitors always get the right figure.
 */
export function CountUp({ value, className, duration = 1100 }: { value: number; className?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(value);

  useEffect(() => {
    const el = ref.current;
    if (!el || value <= 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
    let frame = 0;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      observer.disconnect();
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        setShown(Math.round(value * eased));
        if (t < 1) frame = requestAnimationFrame(tick);
      };
      setShown(0);
      frame = requestAnimationFrame(tick);
    }, { threshold: 0.4 });
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value, duration]);

  return (
    <span ref={ref} className={className} style={{ fontVariantNumeric: "tabular-nums" }}>
      <span aria-hidden="true">{shown.toLocaleString("en-GB")}</span>
      <span className="sr-only">{value.toLocaleString("en-GB")}</span>
    </span>
  );
}
