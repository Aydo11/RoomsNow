"use client";

import { useState, useTransition } from "react";
import { toggleSaveAction } from "@/server/actions/engagement";

export function SaveButton({ listingId, saved: initial }: { listingId: string; saved: boolean }) {
  const [saved, setSaved] = useState(initial);
  const [pops, setPops] = useState(0);
  const [pending, startTransition] = useTransition();

  return (
    <button
      className={saved ? "btn-secondary w-full border-pine text-pine-dark" : "btn-secondary w-full"}
      aria-pressed={saved}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await toggleSaveAction(listingId);
          setSaved(result.saved);
          if (result.saved) setPops((n) => n + 1);
        })
      }
    >
      <svg key={pops} viewBox="0 0 24 24" className={pops > 0 ? "heart-pop h-4 w-4" : "h-4 w-4"} fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.7">
        <path d="M12 20s-7-4.4-7-9.4A3.9 3.9 0 0 1 12 7a3.9 3.9 0 0 1 7 3.6c0 5-7 9.4-7 9.4Z" />
      </svg>
      {saved ? "Saved" : "Save advert"}
    </button>
  );
}
