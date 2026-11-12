"use client";

import { useState } from "react";

/** A small "Copy" button for a value like a sort code or account number. */
export function CopyText({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // Clipboard blocked: the value is on screen to copy by hand.
        }
      }}
      className="rounded-[6px] border border-line px-2 py-0.5 text-[12px] font-semibold text-pine-dark hover:bg-pine-light/60"
      aria-label={`Copy ${label.toLowerCase()}`}
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
