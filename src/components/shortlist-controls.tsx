"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "@/lib/clsx";
import { toast } from "./toast";
import { saveShortlistNoteAction, toggleShortlistAction } from "@/server/actions/shortlist";

/** "Shortlist" toggle on a match, for building a side-by-side comparison. */
export function ShortlistButton({
  clientId,
  listingId,
  initial,
  className,
}: {
  clientId: string;
  listingId: string;
  initial: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [on, setOn] = useState(initial);
  const [pending, start] = useTransition();

  function toggle() {
    start(async () => {
      const result = await toggleShortlistAction(clientId, listingId);
      if (!result.ok) {
        toast.error(result.message ?? "Couldn't update the shortlist.");
        return;
      }
      setOn(Boolean(result.shortlisted));
      toast.success(result.shortlisted ? `Added to the shortlist (${result.count} of 5).` : "Taken off the shortlist.");
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={on}
      className={clsx(on ? "btn-secondary border-pine bg-pine-light text-pine-dark" : "btn-secondary", "w-full justify-center", className)}
    >
      <svg viewBox="0 0 20 20" className="h-4 w-4" fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M5.5 3.5h9v13l-4.5-3-4.5 3v-13Z" strokeLinejoin="round" />
      </svg>
      {on ? "Shortlisted" : "Shortlist"}
    </button>
  );
}

/** Private note on a shortlisted room; saved when the box loses focus. */
export function ShortlistNote({ clientId, listingId, initial }: { clientId: string; listingId: string; initial: string | null }) {
  const [value, setValue] = useState(initial ?? "");
  const [saved, setSaved] = useState(initial ?? "");
  const [pending, start] = useTransition();

  return (
    <div>
      <textarea
        className="field min-h-[72px] text-[14px]"
        placeholder="Your notes, e.g. near his GP, needs a viewing"
        value={value}
        maxLength={500}
        onChange={(event) => setValue(event.target.value)}
        onBlur={() => {
          if (value === saved) return;
          start(async () => {
            const result = await saveShortlistNoteAction(clientId, listingId, value);
            if (result.ok) {
              setSaved(value);
              toast.success("Note saved.");
            } else toast.error("Couldn't save the note.");
          });
        }}
        aria-label="Notes on this room"
      />
      {pending && <p className="mt-1 text-[12px] text-ink-faint">Saving…</p>}
    </div>
  );
}

/** Takes a room off from the comparison page. */
export function RemoveFromShortlist({ clientId, listingId }: { clientId: string; listingId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className="btn-ghost px-2 text-[13px]"
      onClick={() =>
        start(async () => {
          await toggleShortlistAction(clientId, listingId);
          router.refresh();
        })
      }
    >
      Remove
    </button>
  );
}

export function PrintButton({ label = "Download PDF" }: { label?: string }) {
  return (
    <button type="button" className="btn-primary" onClick={() => window.print()}>
      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M10 3v9m0 0-3.5-3.5M10 12l3.5-3.5M4 14v2.5h12V14" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {label}
    </button>
  );
}
