"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";

/**
 * Mobile navigation sheet.
 *
 * The sheet is portalled to <body>. The sticky header uses backdrop-filter,
 * which makes it the containing block for fixed-position children, and on
 * iOS Safari the old in-header dropdown let the page show through it. Rendering
 * outside the header gives an opaque, full-height sheet with its own backdrop.
 */
export function MobileMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const sheet = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => setMounted(true), []);

  const close = useCallback((restoreFocus = false) => {
    setOpen(false);
    if (restoreFocus) button.current?.focus();
  }, []);

  // Close whenever the route changes.
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    sheet.current?.querySelector<HTMLElement>("nav a, nav button, nav select")?.focus({ preventScroll: true });
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") close(true);
      if (event.key !== "Tab" || !sheet.current) return;
      // Keep keyboard focus inside the sheet while it's open.
      const items = Array.from(sheet.current.querySelectorAll<HTMLElement>("a, button, select, input"));
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  return (
    <div>
      <button
        ref={button}
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        title="Menu"
        aria-expanded={open}
        aria-controls="mobile-menu-sheet"
        onClick={() => setOpen((value) => !value)}
        className="grid h-11 w-11 place-items-center rounded-[10px] border border-line bg-paper-card text-ink transition-colors hover:border-line-strong"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
        </svg>
      </button>

      {mounted &&
        open &&
        createPortal(
          <div className="fixed inset-0 z-[60]">
            <button type="button" aria-label="Close menu" tabIndex={-1} onClick={() => close()} className="mobile-menu-backdrop absolute inset-0 h-full w-full cursor-default bg-[#07101c]/55" />
            <div
              id="mobile-menu-sheet"
              ref={sheet}
              role="dialog"
              aria-modal="true"
              aria-label="Menu"
              onClick={(event) => {
                if ((event.target as HTMLElement).closest("a, form button")) setOpen(false);
              }}
              className="mobile-menu-sheet absolute inset-y-0 right-0 flex w-[min(24rem,100vw)] flex-col bg-paper-card shadow-float"
            >
              <div className="flex h-16 shrink-0 items-center justify-between border-b border-line px-4">
                <span className="font-display text-[17px] font-bold text-ink">Menu</span>
                <button type="button" onClick={() => close(true)} aria-label="Close menu" className="grid h-11 w-11 place-items-center rounded-[10px] border border-line text-ink hover:bg-paper-sunk">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
                </button>
              </div>
              <nav aria-label="Mobile navigation" className="flex-1 overflow-y-auto overscroll-contain px-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3">
                {children}
              </nav>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
