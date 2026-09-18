"use client";

import { useState } from "react";
import { demoListingGallery, demoListingImage } from "@/lib/demo-listings";
import { ResilientImage } from "./resilient-image";

type Media = {
  id: string;
  type: string;
  url: string;
  caption: string | null;
  room?: { id: string; name: string } | null;
  illustrative?: boolean;
};

export function Gallery({ media, title, listingId }: { media: Media[]; title: string; listingId: string }) {
  const [active, setActive] = useState(0);
  const displayMedia: Media[] = media.length ? media : demoListingGallery(listingId);
  const currentIndex = Math.min(active, displayMedia.length - 1);
  const current = displayMedia[currentIndex];
  const fallback = demoListingImage(listingId, currentIndex);

  return (
    <div aria-label="Property media gallery">
      <div className="group relative overflow-hidden rounded-card border border-line bg-black shadow-[0_8px_30px_rgba(21,42,58,.10)]">
        {current.type === "VIDEO" ? (
          <video src={current.url} controls playsInline preload="metadata" className="aspect-video max-h-[42vh] w-full bg-black sm:max-h-none" />
        ) : current.type === "VIDEO_URL" ? (
          <div className="aspect-video max-h-[42vh] w-full sm:max-h-none">
            <iframe
              src={toEmbed(current.url)}
              title={`${title} video`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
              allowFullScreen
              className="h-full w-full"
            />
          </div>
        ) : (
          <div className="relative aspect-video max-h-[42vh] w-full sm:max-h-none">
            <ResilientImage
              src={current.url}
              fallbackSrc={fallback.url}
              fallbackLabel={current.illustrative ? undefined : "Photo unavailable — illustrative image shown"}
              alt={current.caption ?? title}
              className="object-contain"
              sizes="(min-width: 1024px) 700px, 100vw"
              priority
            />
          </div>
        )}

        {current.illustrative && (
          <span className="absolute bottom-2 left-2 rounded-pill bg-black/70 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur">
            Illustrative image
          </span>
        )}

        {displayMedia.length > 1 && (
          <>
            <button type="button" onClick={() => setActive((active - 1 + displayMedia.length) % displayMedia.length)} aria-label="Previous photo or video" className="absolute left-2 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-black/65 text-xl text-white backdrop-blur hover:bg-black/80 sm:left-4">←</button>
            <button type="button" onClick={() => setActive((active + 1) % displayMedia.length)} aria-label="Next photo or video" className="absolute right-2 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-black/65 text-xl text-white backdrop-blur hover:bg-black/80 sm:right-4">→</button>
          </>
        )}
        <span className="absolute right-3 top-3 rounded-pill bg-black/70 px-2.5 py-1 text-[12px] font-medium text-white">
          {currentIndex + 1} / {displayMedia.length}
        </span>
      </div>

      {(current.caption || current.room) && (
        <div className="flex flex-wrap items-baseline justify-between gap-2 px-1 pt-3" aria-live="polite">
          <p className="text-[14px] text-ink-soft">{current.caption ?? "Property media"}</p>
          {current.room && <span className="chip py-0.5 text-[12px]">{current.room.name}</span>}
        </div>
      )}

      {displayMedia.length > 1 && (
        <ul className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {displayMedia.map((item, index) => (
            <li key={item.id}>
              <button
                onClick={() => setActive(index)}
                aria-current={index === active}
                aria-label={`Show ${item.caption || item.room?.name || `${item.type === "IMAGE" ? "photo" : "video"} ${index + 1}`}`}
                className={`relative h-16 w-24 shrink-0 overflow-hidden rounded-[8px] border-2 bg-paper-sunk transition ${
                  index === active ? "border-pine" : "border-transparent"
                }`}
              >
                {item.type.startsWith("VIDEO") ? (
                  <span className="grid h-full w-full place-items-center bg-ink text-[12px] text-white">Video</span>
                ) : (
                  <ResilientImage
                    src={item.url}
                    fallbackSrc={demoListingImage(listingId, index).url}
                    alt={item.caption ?? `${title} — photo ${index + 1}`}
                    className="object-contain"
                    sizes="96px"
                  />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function toEmbed(url: string) {
  const youtube = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]{11})/);
  if (youtube) return `https://www.youtube.com/embed/${youtube[1]}`;
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return url;
}
