"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type UIEvent } from "react";
import { demoListingGallery, demoListingImage } from "@/lib/demo-listings";
import { ResilientImage } from "./resilient-image";
import { videoThumbnail } from "@/lib/cover-image";

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
  const [lightboxActive, setLightboxActive] = useState<number | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const lightboxTrackRef = useRef<HTMLDivElement>(null);
  const lightboxInitialIndexRef = useRef(0);
  const displayMedia: Media[] = useMemo(
    () => media.length ? media : demoListingGallery(listingId),
    [media, listingId],
  );
  const photos = useMemo(() => displayMedia.filter((item) => item.type === "IMAGE"), [displayMedia]);
  const currentIndex = Math.min(active, displayMedia.length - 1);
  const current = displayMedia[currentIndex];

  const scrollTo = useCallback((index: number, smooth = true) => {
    const next = (index + displayMedia.length) % displayMedia.length;
    setActive(next);
    trackRef.current?.scrollTo({ left: trackRef.current.clientWidth * next, behavior: smooth ? "smooth" : "auto" });
  }, [displayMedia.length]);

  const scrollLightboxTo = useCallback((index: number, smooth = true) => {
    if (!photos.length) return;
    const next = (index + photos.length) % photos.length;
    setLightboxActive(next);
    lightboxTrackRef.current?.scrollTo({ left: lightboxTrackRef.current.clientWidth * next, behavior: smooth ? "smooth" : "auto" });
  }, [photos.length]);

  const updateIndexFromScroll = (event: UIEvent<HTMLDivElement>, count: number, update: (index: number) => void) => {
    const width = event.currentTarget.clientWidth;
    if (!width) return;
    update(Math.min(count - 1, Math.max(0, Math.round(event.currentTarget.scrollLeft / width))));
  };

  const lightboxOpen = lightboxActive !== null;

  useEffect(() => {
    if (!lightboxOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const scrollToIndex = (index: number, behavior: ScrollBehavior) => {
      const track = lightboxTrackRef.current;
      track?.scrollTo({ left: track.clientWidth * index, behavior });
    };
    const frame = requestAnimationFrame(() => scrollToIndex(lightboxInitialIndexRef.current, "auto"));
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLightboxActive(null);
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        setLightboxActive((current) => {
          if (current === null) return current;
          const direction = event.key === "ArrowLeft" ? -1 : 1;
          const next = (current + direction + photos.length) % photos.length;
          requestAnimationFrame(() => scrollToIndex(next, "smooth"));
          return next;
        });
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [lightboxOpen, photos.length]);

  const openPhoto = (item: Media) => {
    const photoIndex = photos.findIndex((photo) => photo.id === item.id);
    if (photoIndex >= 0) {
      lightboxInitialIndexRef.current = photoIndex;
      setLightboxActive(photoIndex);
    }
  };

  return (
    <div aria-label="Property media gallery">
      <div className="group relative overflow-hidden rounded-card border border-line bg-black shadow-[0_8px_30px_rgba(21,42,58,.10)]">
        <div
          ref={trackRef}
          onScroll={(event) => updateIndexFromScroll(event, displayMedia.length, setActive)}
          className="flex aspect-video max-h-[42vh] w-full snap-x snap-mandatory overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:max-h-none"
        >
          {displayMedia.map((item, index) => (
            <div key={item.id} className="relative h-full min-w-full snap-center snap-always bg-black">
              {item.type === "VIDEO" ? (
                <video src={item.url} controls playsInline preload="metadata" className="h-full w-full bg-black object-contain" />
              ) : item.type === "VIDEO_URL" ? (
                <iframe
                  src={toEmbed(item.url)}
                  title={`${title} video`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
                  allowFullScreen
                  loading="lazy"
                  className="h-full w-full"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => openPhoto(item)}
                  aria-label={`Enlarge ${item.caption ?? `${title} photo ${index + 1}`}`}
                  className="relative block h-full w-full cursor-zoom-in"
                >
                  <ResilientImage
                    src={item.url}
                    fallbackSrc={demoListingImage(listingId, index).url}
                    fallbackLabel={item.illustrative ? undefined : "Photo unavailable — illustrative image shown"}
                    alt={item.caption ?? title}
                    className="object-contain"
                    sizes="(min-width: 1024px) 700px, 100vw"
                    priority={index === 0}
                  />
                </button>
              )}

              {item.illustrative && (
                <span className="pointer-events-none absolute bottom-2 left-2 rounded-pill bg-black/70 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur">
                  Illustrative image
                </span>
              )}
            </div>
          ))}
        </div>

        {displayMedia.length > 1 && (
          <>
            <button type="button" onClick={() => scrollTo(currentIndex - 1)} aria-label="Previous photo or video" className="absolute left-2 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-black/65 text-xl text-white backdrop-blur transition hover:bg-black/80 sm:left-4">←</button>
            <button type="button" onClick={() => scrollTo(currentIndex + 1)} aria-label="Next photo or video" className="absolute right-2 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-black/65 text-xl text-white backdrop-blur transition hover:bg-black/80 sm:right-4">→</button>
          </>
        )}
        <span className="pointer-events-none absolute right-3 top-3 rounded-pill bg-black/70 px-2.5 py-1 text-[12px] font-medium text-white">
          {currentIndex + 1} / {displayMedia.length}
        </span>
        {current.type === "IMAGE" && (
          <span className="pointer-events-none absolute bottom-3 right-3 hidden rounded-pill bg-black/70 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur sm:block">
            Click to enlarge
          </span>
        )}
      </div>

      {(current.caption || current.room) && (
        <div className="flex flex-wrap items-baseline justify-between gap-2 px-1 pt-3" aria-live="polite">
          <p className="text-[14px] text-ink-soft">{current.caption ?? "Property media"}</p>
          {current.room && <span className="chip py-0.5 text-[12px]">{current.room.name}</span>}
        </div>
      )}

      {displayMedia.length > 1 && (
        <ul className="mt-3 flex snap-x gap-2 overflow-x-auto pb-1">
          {displayMedia.map((item, index) => (
            <li key={item.id} className="snap-start">
              <button
                onClick={() => scrollTo(index)}
                aria-current={index === currentIndex}
                aria-label={`Show ${item.caption || item.room?.name || `${item.type === "IMAGE" ? "photo" : "video"} ${index + 1}`}`}
                className={`relative h-16 w-24 shrink-0 overflow-hidden rounded-[8px] border-2 bg-paper-sunk transition ${
                  index === currentIndex ? "border-pine" : "border-transparent"
                }`}
              >
                {item.type === "VIDEO_URL" && videoThumbnail(item.url) ? (
                  <span className="relative block h-full w-full">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={videoThumbnail(item.url)!} alt="" loading="lazy" className="h-full w-full object-cover" />
                    <span className="absolute inset-0 grid place-items-center bg-black/25 text-[12px] font-medium text-white">▶ Video</span>
                  </span>
                ) : item.type.startsWith("VIDEO") ? (
                  <span className="grid h-full w-full place-items-center bg-ink text-[12px] text-white">Video</span>
                ) : (
                  <ResilientImage
                    src={item.url}
                    fallbackSrc={demoListingImage(listingId, index).url}
                    alt={item.caption ?? `${title} — photo ${index + 1}`}
                    className="object-cover"
                    sizes="96px"
                  />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {lightboxActive !== null && photos[lightboxActive] && (
        <div role="dialog" aria-modal="true" aria-label={`${title} enlarged photos`} className="fixed inset-0 z-[100] flex flex-col bg-black/95 text-white backdrop-blur-sm">
          <div className="flex min-h-14 items-center justify-between gap-4 px-4 py-2 sm:px-6">
            <p className="truncate text-sm font-medium">{photos[lightboxActive].caption ?? title}</p>
            <div className="flex shrink-0 items-center gap-3">
              <span className="text-sm text-white/75">{lightboxActive + 1} / {photos.length}</span>
              <button type="button" onClick={() => setLightboxActive(null)} aria-label="Close enlarged photos" className="grid h-11 w-11 place-items-center rounded-full bg-white/10 text-2xl transition hover:bg-white/20">×</button>
            </div>
          </div>

          <div
            ref={lightboxTrackRef}
            onScroll={(event) => updateIndexFromScroll(event, photos.length, setLightboxActive)}
            className="flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto scroll-smooth overscroll-contain [scrollbar-width:none] [touch-action:pan-x] [&::-webkit-scrollbar]:hidden"
          >
            {photos.map((item, index) => (
              <div key={item.id} className="relative h-full min-w-full snap-center snap-always px-2 pb-3 sm:px-16 sm:pb-6">
                <ResilientImage
                  src={item.url}
                  fallbackSrc={demoListingImage(listingId, displayMedia.findIndex((entry) => entry.id === item.id)).url}
                  alt={item.caption ?? `${title} — enlarged photo ${index + 1}`}
                  className="object-contain"
                  sizes="100vw"
                  priority={index === lightboxActive}
                />
              </div>
            ))}
          </div>

          {photos.length > 1 && (
            <>
              <button type="button" onClick={() => scrollLightboxTo(lightboxActive - 1)} aria-label="Previous enlarged photo" className="absolute left-2 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-black/60 text-2xl text-white backdrop-blur transition hover:bg-black/80 sm:left-5">←</button>
              <button type="button" onClick={() => scrollLightboxTo(lightboxActive + 1)} aria-label="Next enlarged photo" className="absolute right-2 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-black/60 text-2xl text-white backdrop-blur transition hover:bg-black/80 sm:right-5">→</button>
            </>
          )}

          <p className="px-4 pb-[max(12px,env(safe-area-inset-bottom))] text-center text-xs text-white/65 sm:text-sm">
            Swipe or scroll to see more photos
          </p>
        </div>
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
