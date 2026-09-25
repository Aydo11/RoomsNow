"use client";

import { useEffect, useState } from "react";
import { clsx } from "@/lib/clsx";
import { toast } from "./toast";

/**
 * "Share card": a ready-made image of the advert (photo, rent, area, link)
 * plus one-tap sharing to WhatsApp and Facebook, a download for Instagram,
 * and copy link. Links carry ?source=share so visits can be counted.
 */
export function ShareCardButton({
  listingId,
  title,
  autoOpen = false,
  variant = "secondary",
}: {
  listingId: string;
  title: string;
  autoOpen?: boolean;
  variant?: "secondary" | "ghost";
}) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (autoOpen) setOpen(true);
  }, [autoOpen]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={clsx(variant === "ghost" ? "btn-ghost" : "btn-secondary w-full")}>
        <CardIcon />
        Share card
      </button>
      {open && <ShareSheet listingId={listingId} title={title} onClose={() => setOpen(false)} />}
    </>
  );
}

function ShareSheet({ listingId, title, onClose }: { listingId: string; title: string; onClose: () => void }) {
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [canShareFiles, setCanShareFiles] = useState(false);
  const imagePath = `/share-card/${listingId}?format=square`;
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const link = `${origin}/listings/${listingId}?source=share`;
  const message = `${title} – available now on RoomsNow`;

  useEffect(() => {
    const probe = new File([""], "card.png", { type: "image/png" });
    setCanShareFiles(typeof navigator !== "undefined" && Boolean(navigator.canShare?.({ files: [probe] })));
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const previous = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = previous;
    };
  }, [onClose]);

  async function shareImage() {
    setBusy(true);
    try {
      const blob = await fetch(imagePath).then((response) => response.blob());
      const file = new File([blob], "roomsnow-room.png", { type: "image/png" });
      await navigator.share({ files: [file], title, text: `${message}\n${link}` });
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) toast.error("Couldn't share the image. Try Download instead.");
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Link copied.");
    } catch {
      toast.error("Couldn't copy the link.");
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label="Share card">
      <button type="button" aria-label="Close" onClick={onClose} className="share-fade absolute inset-0 bg-black/55" />
      <div className="share-rise relative max-h-[92dvh] w-full max-w-[460px] overflow-y-auto rounded-t-[22px] bg-paper-card p-5 shadow-float sm:rounded-[22px]">
        <style>{SHARE_CSS}</style>
        <div className="flex items-center justify-between">
          <h2 className="text-[18px] font-bold text-ink">Share this room</h2>
          <button type="button" onClick={onClose} className="btn-ghost -mr-2 px-3" aria-label="Close">
            ✕
          </button>
        </div>
        <div className="relative mt-3 aspect-square overflow-hidden rounded-[14px] bg-paper-sunk">
          {!loaded && <div className="skeleton absolute inset-0" />}
          {/* eslint-disable-next-line @next/next/no-img-element -- generated card */}
          <img src={imagePath} alt={`Share card for ${title}`} className={clsx("h-full w-full transition-opacity duration-300", loaded ? "opacity-100" : "opacity-0")} onLoad={() => setLoaded(true)} />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {canShareFiles && (
            <button type="button" onClick={() => void shareImage()} disabled={busy} className="btn-primary col-span-2">
              Share image
            </button>
          )}
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`${message}\n${link}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary"
          >
            WhatsApp
          </a>
          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary"
          >
            Facebook
          </a>
          <a href={imagePath} download="roomsnow-room.png" className="btn-secondary">
            Download image
          </a>
          <button type="button" onClick={() => void copyLink()} className="btn-secondary">
            Copy link
          </button>
        </div>
        <p className="mt-3 text-[12px] leading-relaxed text-ink-faint">
          For Instagram, download the image and post it with the link in your bio or story. Links shared on WhatsApp and Facebook show this card as the preview.
        </p>
      </div>
    </div>
  );
}

function CardIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="3" y="3" width="14" height="14" rx="2.5" />
      <path d="m3.5 13 4-4 3 3 2-2 4 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const SHARE_CSS = `
@media (prefers-reduced-motion: no-preference) {
  .share-fade { animation: share-fade 200ms ease both; }
  .share-rise { animation: share-rise 320ms cubic-bezier(0.16, 1, 0.3, 1) both; }
}
@keyframes share-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes share-rise { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: none; } }
`;
