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

    // Cards marked [data-tilt] lean gently towards a mouse pointer (never on
    // touch screens), with a soft highlight where the pointer is.
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    let tilted: HTMLElement | null = null;
    const resetTilt = (el: HTMLElement) => {
      el.style.removeProperty("--tilt-x");
      el.style.removeProperty("--tilt-y");
      el.removeAttribute("data-tilting");
    };
    const onPointer = (event: PointerEvent) => {
      const element = event.target as Element | null;
      const target = element?.closest?.("[data-spotlight]") as HTMLElement | null;
      if (target) {
        const rect = target.getBoundingClientRect();
        target.style.setProperty("--spot-x", `${event.clientX - rect.left}px`);
        target.style.setProperty("--spot-y", `${event.clientY - rect.top}px`);
      }
      if (!finePointer) return;
      const tilt = element?.closest?.("[data-tilt]") as HTMLElement | null;
      if (tilted && tilted !== tilt) resetTilt(tilted);
      tilted = tilt;
      if (!tilt) return;
      const rect = tilt.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width - 0.5;
      const py = (event.clientY - rect.top) / rect.height - 0.5;
      tilt.setAttribute("data-tilting", "");
      tilt.style.setProperty("--tilt-x", `${(-py * 7).toFixed(2)}deg`);
      tilt.style.setProperty("--tilt-y", `${(px * 9).toFixed(2)}deg`);
      tilt.style.setProperty("--glare-x", `${((px + 0.5) * 100).toFixed(1)}%`);
      tilt.style.setProperty("--glare-y", `${((py + 0.5) * 100).toFixed(1)}%`);
    };
    if (!reduce) document.addEventListener("pointermove", onPointer, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("pointermove", onPointer);
    };
  }, []);

  useEffect(() => {
    // Fail-open: content is only ever hidden while it carries `reveal-pending`,
    // a class this effect adds and always takes away again. If React re-renders
    // an element's className, the observer misses it, or the page is restored
    // from the back/forward cache, the worst case is "no animation", never
    // "missing content".
    const root = document.documentElement;
    const pending = new Set<Element>();
    const show = (el: Element, animate: boolean) => {
      pending.delete(el);
      el.classList.remove("reveal-pending");
      el.classList.add("is-revealed");
      if (!animate) el.classList.add("reveal-static");
    };
    const showAll = () => [...pending].forEach((el) => show(el, false));
    const onScreen = (el: Element) => {
      const rect = el.getBoundingClientRect();
      return rect.top < window.innerHeight && rect.bottom > 0;
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
      document.querySelectorAll("[data-reveal]").forEach((el) => show(el, false));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && pending.has(entry.target)) {
            show(entry.target, true);
            observer.unobserve(entry.target);
          }
        }
      },
      // Starts a little before the section scrolls in, so fast scrolling never
      // shows an empty gap; any pixel counts, so tall sections never get stuck.
      { rootMargin: "0px 0px 12% 0px", threshold: 0 },
    );

    const scan = () => {
      document.querySelectorAll("[data-reveal]:not(.is-revealed)").forEach((el) => {
        if (pending.has(el) && el.classList.contains("reveal-pending")) return;
        // Already on screen (or scrolled past): show it now, no flicker.
        if (onScreen(el) || el.getBoundingClientRect().bottom <= 0) {
          show(el, false);
          observer.unobserve(el);
          return;
        }
        pending.add(el);
        el.classList.add("reveal-pending");
        observer.observe(el);
      });
    };
    scan();
    root.classList.add("motion-ready");

    // Pages stream in and client components mount later, so keep watching.
    let queued = 0;
    const mutations = new MutationObserver(() => {
      if (queued) return;
      queued = requestAnimationFrame(() => {
        queued = 0;
        scan();
      });
    });
    mutations.observe(document.body, { childList: true, subtree: true });

    // Belt and braces: anything on screen that is somehow still pending gets
    // shown on scroll/resize, and a restored or re-shown tab shows everything.
    const sweep = () => pending.forEach((el) => onScreen(el) && show(el, true));
    const onPageShow = (event: PageTransitionEvent) => event.persisted && showAll();
    const onVisible = () => document.visibilityState === "visible" && sweep();
    const safety = window.setTimeout(sweep, 1500);
    window.addEventListener("scroll", sweep, { passive: true });
    window.addEventListener("resize", sweep);
    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      observer.disconnect();
      mutations.disconnect();
      cancelAnimationFrame(queued);
      window.clearTimeout(safety);
      window.removeEventListener("scroll", sweep);
      window.removeEventListener("resize", sweep);
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVisible);
      // Never leave anything hidden behind when the page changes.
      showAll();
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
