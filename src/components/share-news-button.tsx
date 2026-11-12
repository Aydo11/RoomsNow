"use client";

import { useState } from "react";

/** Share a News post: the phone's share sheet, else copy the link, else show it to copy by hand. */
export function ShareNewsButton({ url, title }: { url: string; title: string }) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<"" | "copied" | "manual">("");

  async function share() {
    setBusy(true);
    try {
      if (navigator.share) {
        try {
          await navigator.share({ title, url });
          return;
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") return;
        }
      }
      try {
        await navigator.clipboard.writeText(url);
        setStatus("copied");
      } catch {
        setStatus("manual");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button type="button" onClick={share} disabled={busy} className="inline-flex items-center gap-1 font-semibold text-pine-dark underline-offset-4 hover:underline disabled:opacity-60">
        <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 3v10M6 7l4-4 4 4M4 12v4h12v-4" />
        </svg>
        Share
      </button>
      <span role="status" aria-live="polite" className="text-ink-faint">{status === "copied" ? "Link copied" : ""}</span>
      {status === "manual" && (
        <label className="inline-flex items-center gap-2">
          <span className="sr-only">Article link</span>
          <input readOnly value={url} onFocus={(e) => e.currentTarget.select()} autoFocus className="field h-8 w-64 py-1 text-[13px]" />
        </label>
      )}
    </span>
  );
}
