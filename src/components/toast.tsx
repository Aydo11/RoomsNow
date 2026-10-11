"use client";

import { useEffect, useState } from "react";

type Toast = { id: number; kind: "success" | "error" | "info"; message: string };

let toasts: Toast[] = [];
let nextId = 1;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function push(kind: Toast["kind"], message: string) {
  const id = nextId++;
  toasts = [...toasts, { id, kind, message }];
  emit();
  // Auto-dismiss — errors linger a little longer since they need reading.
  setTimeout(() => dismiss(id), kind === "error" ? 5000 : 3200);
}

function dismiss(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

/**
 * Fire-and-forget feedback for actions that don't already have an inline
 * success/error slot — unarchiving, sharing a profile, revoking access. Full
 * forms keep their inline FormError/FormSuccess; this is for the rest.
 */
export const toast = {
  success: (message: string) => push("success", message),
  error: (message: string) => push("error", message),
  info: (message: string) => push("info", message),
};

const ICONS: Record<Toast["kind"], React.ReactNode> = {
  success: (
    <svg viewBox="0 0 16 16" className="h-4 w-4 shrink-0 text-pine" fill="currentColor" aria-hidden="true">
      <path d="M6.2 11.6 2.6 8l1-1 2.6 2.6L12.4 3.4l1 1-7.2 7.2Z" />
    </svg>
  ),
  error: (
    <svg viewBox="0 0 16 16" className="h-4 w-4 shrink-0 text-clay" fill="currentColor" aria-hidden="true">
      <path d="M8 1.5A6.5 6.5 0 1 0 8 14.5 6.5 6.5 0 0 0 8 1.5ZM7.25 4.5h1.5v5h-1.5v-5Zm0 6.25h1.5V12h-1.5v-1.25Z" />
    </svg>
  ),
  info: (
    <svg viewBox="0 0 16 16" className="h-4 w-4 shrink-0 text-ink-soft" fill="currentColor" aria-hidden="true">
      <path d="M8 1.5A6.5 6.5 0 1 0 8 14.5 6.5 6.5 0 0 0 8 1.5ZM7.25 6.5h1.5V12h-1.5V6.5Zm0-2.75h1.5V5.25h-1.5V3.75Z" />
    </svg>
  ),
};

/** Mounted once, near the root layout. Positioned above the mobile tab bar. */
export function Toaster() {
  const [items, setItems] = useState<Toast[]>(toasts);

  useEffect(() => {
    const listener = () => setItems([...toasts]);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-20 z-100 flex flex-col items-center gap-2 px-4 lg:bottom-6"
      aria-live="polite"
    >
      {items.map((item) => (
        <div key={item.id} className="toast w-full max-w-sm">
          {ICONS[item.kind]}
          <p className="min-w-0 flex-1 text-ink">{item.message}</p>
          <button
            onClick={() => dismiss(item.id)}
            className="pointer-events-auto -mr-1 -mt-0.5 shrink-0 rounded-full p-1 text-ink-faint hover:bg-paper-sunk hover:text-ink"
            aria-label="Dismiss"
          >
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
