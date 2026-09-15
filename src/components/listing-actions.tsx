"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleSaveAction } from "@/server/actions/engagement";
import { toast } from "./toast";
import { clsx } from "@/lib/clsx";

type ListingActionProps = {
  listingId: string;
  title: string;
  saved?: boolean;
  canSave?: boolean;
};

export function ListingCardActions({ listingId, title, saved = false, canSave = false }: ListingActionProps) {
  return (
    <div className="absolute bottom-3 right-3 z-20 flex gap-2">
      <SaveListingIcon listingId={listingId} title={title} saved={saved} canSave={canSave} />
      <ShareListingButton listingId={listingId} title={title} compact />
    </div>
  );
}

export function ShareListingButton({ listingId, title, compact = false }: { listingId: string; title: string; compact?: boolean }) {
  const [sharing, setSharing] = useState(false);

  async function share() {
    const url = `${window.location.origin}/listings/${listingId}`;
    setSharing(true);
    try {
      if (navigator.share) {
        await navigator.share({ title, text: `View ${title} on RoomsNow`, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Advert link copied.");
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        toast.error("The link could not be shared. Please try again.");
      }
    } finally {
      setSharing(false);
    }
  }

  return (
    <button
      type="button"
      className={compact ? clsx(iconButtonBase, iconButtonResting) : "btn-secondary w-full"}
      aria-label={compact ? `Share ${title}` : undefined}
      title={compact ? "Share advert" : undefined}
      disabled={sharing}
      onClick={share}
    >
      <ShareIcon />
      {!compact && "Share advert"}
    </button>
  );
}

export function SaveListingIcon({ listingId, title, saved: initial, canSave }: ListingActionProps) {
  const router = useRouter();
  const [saved, setSaved] = useState(Boolean(initial));
  const [pending, startTransition] = useTransition();

  function toggle() {
    if (!canSave) {
      router.push(`/login?next=${encodeURIComponent(`/listings/${listingId}`)}`);
      return;
    }
    startTransition(async () => {
      try {
        const result = await toggleSaveAction(listingId);
        setSaved(result.saved);
        toast.success(result.saved ? "Advert saved." : "Advert removed from saved.");
      } catch {
        toast.error("Your saved adverts could not be updated.");
      }
    });
  }

  return (
    <button
      type="button"
      className={clsx(
        iconButtonBase,
        saved
          ? "border-brand bg-blue-50 text-brand hover:bg-blue-100 hover:text-brand"
          : iconButtonResting,
      )}
      aria-label={saved ? `Remove ${title} from saved adverts` : `Save ${title}`}
      aria-pressed={saved}
      title={saved ? "Remove from saved" : "Save advert"}
      disabled={pending}
      onClick={toggle}
    >
      <HeartIcon filled={saved} />
    </button>
  );
}

const iconButtonBase = "grid h-10 w-10 shrink-0 place-items-center rounded-full border shadow-card transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:opacity-60";
const iconButtonResting = "border-white/80 bg-white/95 text-ink hover:bg-blue-50 hover:text-brand";

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M12 20s-7-4.4-7-9.4A3.9 3.9 0 0 1 12 7a3.9 3.9 0 0 1 7 3.6c0 5-7 9.4-7 9.4Z" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="18" cy="5" r="2.5" />
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="19" r="2.5" />
      <path d="m8.2 10.8 7.6-4.4M8.2 13.2l7.6 4.4" />
    </svg>
  );
}
