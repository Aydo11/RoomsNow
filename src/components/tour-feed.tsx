"use client";

/* eslint-disable @next/next/no-img-element -- advert media comes from several storage hosts */
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toggleSaveAction } from "@/server/actions/engagement";
import type { TourMedia, TourSlide } from "@/server/tour";
import { toast } from "./toast";
import { clsx } from "@/lib/clsx";

type Props = {
  slides: TourSlide[];
  /** Where the close button goes. */
  backHref: string;
  /** Shown in the top bar, e.g. "Rooms in Birmingham" or "Matches for Sam". */
  heading: string;
  signedIn: boolean;
  loginHref: string;
  /** Referral mode: the main action refers this client instead of messaging the provider. */
  refer?: { clientId?: string; clientName?: string } | null;
  /** The next page of results, if there is one. */
  moreHref?: string | null;
  /** A broader search to suggest on the end screen. */
  widenHref?: string | null;
};

const HINT_KEY = "roomsnow:tour-hint-seen";

/**
 * Tour mode: a full-screen feed of rooms. Swipe (or scroll, or use the arrow
 * keys) up and down between adverts, and left and right through each advert's
 * photos. Built on CSS scroll snapping, so it moves with the phone's own
 * momentum and stays smooth on low-end devices.
 */
export function TourFeed({ slides, backHref, heading, signedIn, loginHref, refer, moreHref, widenHref }: Props) {
  const router = useRouter();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [sheetFor, setSheetFor] = useState<TourSlide | null>(null);
  const [muted, setMuted] = useState(true);
  const [showHint, setShowHint] = useState(false);
  const [saved, setSaved] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(slides.map((slide) => [slide.id, slide.saved])),
  );
  const total = slides.length;
  const hasVideo = slides.some((slide) => slide.media.some((item) => item.kind !== "image"));

  // Full-screen: stop the page underneath from scrolling while the tour is open.
  useEffect(() => {
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    try {
      if (!window.localStorage.getItem(HINT_KEY) && total > 1) setShowHint(true);
    } catch {
      if (total > 1) setShowHint(true);
    }
  }, [total]);

  // Track which slide is on screen.
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(Number((entry.target as HTMLElement).dataset.index));
        }
      },
      { root: scroller, threshold: 0.6 },
    );
    scroller.querySelectorAll("[data-index]").forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [total]);

  useEffect(() => {
    if (active > 0 && showHint) {
      setShowHint(false);
      try {
        window.localStorage.setItem(HINT_KEY, "1");
      } catch {
        // Hint just shows again next time.
      }
    }
  }, [active, showHint]);

  const goTo = useCallback((index: number) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const target = scroller.querySelector<HTMLElement>(`[data-index="${index}"]`);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.target instanceof HTMLElement && ["INPUT", "TEXTAREA", "SELECT"].includes(event.target.tagName)) return;
      if (event.key === "Escape") {
        if (sheetFor) setSheetFor(null);
        else router.push(backHref);
        return;
      }
      if (sheetFor) return;
      if (["ArrowDown", "PageDown", "j"].includes(event.key)) {
        event.preventDefault();
        goTo(Math.min(active + 1, total));
      } else if (["ArrowUp", "PageUp", "k"].includes(event.key)) {
        event.preventDefault();
        goTo(Math.max(active - 1, 0));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, total, sheetFor, goTo, router, backHref]);

  const toggleSave = useCallback(
    async (id: string, force?: boolean) => {
      if (!signedIn) {
        toast.info("Sign in to save rooms.");
        return;
      }
      const current = saved[id];
      if (force && current) return;
      setSaved((all) => ({ ...all, [id]: !current }));
      try {
        const result = await toggleSaveAction(id);
        setSaved((all) => ({ ...all, [id]: result.saved }));
        if (result.saved) toast.success("Saved. Find it under Saved adverts.");
      } catch {
        setSaved((all) => ({ ...all, [id]: current }));
        toast.error("Couldn't save that just now.");
      }
    },
    [saved, signedIn],
  );

  return (
    <div className="tour-root fixed inset-0 z-[70] bg-[#05080d] text-white" role="dialog" aria-modal="true" aria-label={`Tour mode: ${heading}`}>
      <style>{TOUR_CSS}</style>

      {/* Top bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 bg-gradient-to-b from-black/70 via-black/25 to-transparent px-3 pb-10 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-5">
        <div className="pointer-events-auto mx-auto flex max-w-[560px] items-center gap-2">
          <Link
            href={backHref}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/10 backdrop-blur-md transition hover:bg-white/20 active:scale-90"
            aria-label="Close tour"
          >
            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="m5 5 10 10M15 5 5 15" strokeLinecap="round" />
            </svg>
          </Link>
          <div className="min-w-0 flex-1 text-center">
            <p className="truncate text-[14px] font-semibold">{heading}</p>
            <p className="text-[12px] tabular-nums text-white/70">
              {active < total ? `${active + 1} of ${total}` : `All ${total} seen`}
            </p>
          </div>
          {hasVideo ? (
            <button
              type="button"
              onClick={() => setMuted((value) => !value)}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/10 backdrop-blur-md transition hover:bg-white/20 active:scale-90"
              aria-label={muted ? "Turn sound on" : "Turn sound off"}
            >
              <SoundIcon muted={muted} />
            </button>
          ) : (
            <span className="h-10 w-10 shrink-0" aria-hidden="true" />
          )}
        </div>
        {/* Progress through the feed */}
        <div className="pointer-events-none mx-auto mt-3 h-[3px] max-w-[560px] overflow-hidden rounded-full bg-white/15" aria-hidden="true">
          <div
            className="h-full rounded-full bg-white/85 transition-[width] duration-500 ease-out"
            style={{ width: `${total ? (Math.min(active + 1, total) / total) * 100 : 100}%` }}
          />
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="tour-scroller h-full snap-y snap-mandatory overflow-y-scroll overscroll-contain"
      >
        {slides.map((slide, index) => (
          <Slide
            key={slide.id}
            slide={slide}
            index={index}
            active={index === active}
            near={Math.abs(index - active) <= 1}
            muted={muted}
            saved={Boolean(saved[slide.id])}
            onToggleSave={toggleSave}
            onDetails={() => setSheetFor(slide)}
            refer={refer}
            signedIn={signedIn}
            loginHref={loginHref}
          />
        ))}
        <EndSlide index={total} total={total} backHref={backHref} moreHref={moreHref} widenHref={widenHref} active={active === total} />
      </div>

      {showHint && (
        <div className="tour-hint pointer-events-none absolute inset-x-0 top-[42%] z-20 flex justify-center">
          <span className="flex items-center gap-2 rounded-full bg-black/55 px-4 py-2 text-[13px] font-medium backdrop-blur-md">
            <svg viewBox="0 0 20 20" className="tour-hint-arrow h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M10 16V4m0 0-5 5m5-5 5 5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Swipe up for the next room
          </span>
        </div>
      )}

      {/* Desktop: step buttons, since there's no swipe */}
      <div className="absolute right-5 top-24 z-20 hidden flex-col gap-2 lg:flex">
        <StepButton label="Previous room" disabled={active === 0} onClick={() => goTo(active - 1)} direction="up" />
        <StepButton label="Next room" disabled={active >= total} onClick={() => goTo(active + 1)} direction="down" />
      </div>

      <DetailsSheet
        slide={sheetFor}
        onClose={() => setSheetFor(null)}
        refer={refer}
        signedIn={signedIn}
        loginHref={loginHref}
        saved={sheetFor ? Boolean(saved[sheetFor.id]) : false}
        onToggleSave={toggleSave}
      />
    </div>
  );
}

function Slide({
  slide,
  index,
  active,
  near,
  muted,
  saved,
  onToggleSave,
  onDetails,
  refer,
  signedIn,
  loginHref,
}: {
  slide: TourSlide;
  index: number;
  active: boolean;
  near: boolean;
  muted: boolean;
  saved: boolean;
  onToggleSave: (id: string, force?: boolean) => void;
  onDetails: () => void;
  refer?: Props["refer"];
  signedIn: boolean;
  loginHref: string;
}) {
  const carouselRef = useRef<HTMLDivElement>(null);
  const [mediaIndex, setMediaIndex] = useState(0);
  const [burst, setBurst] = useState(0);
  const lastTap = useRef(0);

  function onCarouselScroll() {
    const node = carouselRef.current;
    if (!node) return;
    setMediaIndex(Math.round(node.scrollLeft / Math.max(node.clientWidth, 1)));
  }

  function stepMedia(delta: number) {
    const node = carouselRef.current;
    if (!node) return;
    const next = Math.max(0, Math.min(slide.media.length - 1, mediaIndex + delta));
    node.scrollTo({ left: next * node.clientWidth, behavior: "smooth" });
  }

  // Double-tap the media to save, like on video apps.
  function onMediaTap() {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      onToggleSave(slide.id, true);
      setBurst((value) => value + 1);
      lastTap.current = 0;
    } else {
      lastTap.current = now;
    }
  }

  const referHref = refer
    ? `/referrals/new?${new URLSearchParams({ ...(refer.clientId ? { clientId: refer.clientId } : {}), listingId: slide.id }).toString()}`
    : null;

  return (
    <section
      data-index={index}
      data-active={active ? "true" : "false"}
      className="tour-slide relative h-[100dvh] w-full snap-start snap-always overflow-hidden"
      aria-roledescription="slide"
      aria-label={`${index + 1}: ${slide.title}`}
    >
      {/* Media carousel */}
      <div
        ref={carouselRef}
        onScroll={onCarouselScroll}
        onClick={onMediaTap}
        className="tour-scroller flex h-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain"
      >
        {slide.media.map((item, mediaPosition) => (
          <div key={mediaPosition} className="relative h-full w-full shrink-0 snap-center">
            <MediaView item={item} show={near} playing={active && mediaPosition === mediaIndex} muted={muted} title={slide.title} />
          </div>
        ))}
      </div>

      {burst > 0 && (
        <span key={burst} className="tour-burst pointer-events-none absolute left-1/2 top-1/2 z-10 text-white" aria-hidden="true">
          <HeartIcon filled className="h-24 w-24 drop-shadow-[0_6px_24px_rgba(0,0,0,0.45)]" />
        </span>
      )}

      {slide.media.length > 1 && (
        <>
          <div className="pointer-events-none absolute inset-x-0 top-[calc(max(0.75rem,env(safe-area-inset-top))+4.75rem)] z-10 flex justify-center gap-1.5" aria-hidden="true">
            {slide.media.map((_, dot) => (
              <span
                key={dot}
                className={clsx("h-1.5 rounded-full transition-all duration-300", dot === mediaIndex ? "w-5 bg-white" : "w-1.5 bg-white/45")}
              />
            ))}
          </div>
          <div className="absolute inset-y-0 left-2 z-10 hidden items-center sm:flex">
            <MediaStep label="Previous photo" disabled={mediaIndex === 0} onClick={() => stepMedia(-1)} direction="left" />
          </div>
          <div className="absolute inset-y-0 right-24 z-10 hidden items-center sm:flex">
            <MediaStep label="Next photo" disabled={mediaIndex >= slide.media.length - 1} onClick={() => stepMedia(1)} direction="right" />
          </div>
        </>
      )}

      {/* Readability gradient */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[62%] bg-gradient-to-t from-black/90 via-black/45 to-transparent" aria-hidden="true" />

      {/* Action rail */}
      <div className="absolute bottom-[max(1.5rem,calc(env(safe-area-inset-bottom)+1rem))] right-3 z-30 flex flex-col items-center gap-4 sm:right-6">
        <RailButton label={saved ? "Saved" : "Save"} onClick={() => onToggleSave(slide.id)} pressed={saved}>
          <HeartIcon filled={saved} className={clsx("h-7 w-7 transition-transform duration-300", saved && "tour-pop text-[#ff5a7a]")} />
        </RailButton>
        {referHref ? (
          slide.referred ? (
            <RailButton label="Referred" disabled>
              <CheckIcon className="h-7 w-7" />
            </RailButton>
          ) : (
            <RailLink href={signedIn ? referHref : loginHref} label="Refer">
              <ReferIcon className="h-7 w-7" />
            </RailLink>
          )
        ) : (
          <RailLink href={signedIn ? `/listings/${slide.id}#message` : loginHref} label="Message">
            <MessageIcon className="h-7 w-7" />
          </RailLink>
        )}
        <RailButton label="Share" onClick={() => void share(slide)}>
          <ShareIcon className="h-7 w-7" />
        </RailButton>
        <RailButton label="Details" onClick={onDetails}>
          <InfoIcon className="h-7 w-7" />
        </RailButton>
      </div>

      {/* Caption */}
      <div className="tour-caption pointer-events-none absolute inset-x-0 bottom-0 z-20 px-4 pb-[max(1.5rem,calc(env(safe-area-inset-bottom)+1rem))] pr-24 sm:px-8 sm:pr-32">
        <div className="pointer-events-auto max-w-[560px]">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] font-medium text-white/85">
            <span className="truncate">{slide.company.name}</span>
            {slide.company.verified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[11px] backdrop-blur">
                <CheckIcon className="h-3 w-3" /> Verified
              </span>
            )}
            {slide.company.response && <span className="text-[12px] text-white/65">{slide.company.response}</span>}
          </p>
          <h2 className="mt-1.5 line-clamp-2 text-[21px] font-bold leading-tight text-white [text-shadow:0_1px_8px_rgba(0,0,0,0.35)] sm:text-[24px]">{slide.title}</h2>
          <p className="mt-1.5 text-[15px] font-semibold text-white">
            {slide.rent}
            <span className="font-normal text-white/75"> · {slide.location}</span>
          </p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {slide.match && (
              <span className="rounded-full bg-white px-2.5 py-1 text-[12px] font-bold text-[#0F4F87]">{slide.match.score}% {slide.match.label.toLowerCase()}</span>
            )}
            <Chip>{slide.typeLabel}</Chip>
            {slide.roomsAvailable > 0 && (
              <Chip>
                {slide.roomsAvailable} room{slide.roomsAvailable === 1 ? "" : "s"} available
              </Chip>
            )}
            {slide.supports.slice(0, 2).map((support) => (
              <Chip key={support}>{support}</Chip>
            ))}
          </div>
          {(slide.summary || slide.description) && (
            <button type="button" onClick={onDetails} className="mt-2.5 block w-full text-left text-[14px] leading-snug text-white/85">
              <span className="line-clamp-2">{slide.summary || slide.description}</span>
              <span className="mt-0.5 inline-block font-semibold text-white">More</span>
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

function MediaView({ item, show, playing, muted, title }: { item: TourMedia; show: boolean; playing: boolean; muted: boolean; title: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [youtubeStarted, setYoutubeStarted] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (playing) void video.play().catch(() => undefined);
    else video.pause();
  }, [playing]);

  useEffect(() => {
    if (!playing) setYoutubeStarted(false);
  }, [playing]);

  // Only nearby slides load their media, which keeps long feeds light on data.
  if (!show) return <div className="h-full w-full bg-[#0b1119]" />;

  if (item.kind === "video") {
    return (
      <video
        ref={videoRef}
        src={item.url}
        muted={muted}
        loop
        playsInline
        preload="metadata"
        className="h-full w-full bg-black object-contain"
        aria-label={`Video tour of ${title}`}
      />
    );
  }

  if (item.kind === "youtube") {
    if (youtubeStarted && playing) {
      return (
        <iframe
          src={`https://www.youtube.com/embed/${item.id}?autoplay=1&mute=${muted ? 1 : 0}&playsinline=1&rel=0&modestbranding=1`}
          title={`Video tour of ${title}`}
          allow="autoplay; encrypted-media; picture-in-picture"
          className="h-full w-full bg-black"
        />
      );
    }
    const thumb = `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`;
    return (
      <button type="button" onClick={(event) => { event.stopPropagation(); setYoutubeStarted(true); }} className="relative block h-full w-full" aria-label={`Play video tour of ${title}`}>
        <Backdrop src={thumb} />
        <img src={thumb} alt="" className="relative h-full w-full object-contain" />
        <span className="absolute left-1/2 top-1/2 grid h-16 w-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-black/55 backdrop-blur-md transition active:scale-90">
          <svg viewBox="0 0 24 24" className="ml-1 h-7 w-7" fill="currentColor" aria-hidden="true">
            <path d="M7 4.5v15l12.5-7.5L7 4.5Z" />
          </svg>
        </span>
      </button>
    );
  }

  return (
    <>
      <Backdrop src={item.url} />
      <img src={item.url} alt={item.caption ?? `Photo of ${title}`} className="relative h-full w-full object-cover sm:object-contain" draggable={false} />
      {item.caption && (
        <span className="absolute left-4 top-[calc(max(0.75rem,env(safe-area-inset-top))+6rem)] max-w-[70%] rounded-full bg-black/45 px-2.5 py-1 text-[11px] text-white/85 backdrop-blur">
          {item.caption}
        </span>
      )}
    </>
  );
}

/** Blurred copy of the photo behind it, so landscape photos fill a portrait screen. */
function Backdrop({ src }: { src: string }) {
  return <img src={src} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-60 blur-2xl" draggable={false} />;
}

function EndSlide({
  index,
  total,
  backHref,
  moreHref,
  widenHref,
  active,
}: {
  index: number;
  total: number;
  backHref: string;
  moreHref?: string | null;
  widenHref?: string | null;
  active: boolean;
}) {
  return (
    <section
      data-index={index}
      data-active={active ? "true" : "false"}
      className="tour-slide relative grid h-[100dvh] w-full snap-start snap-always place-items-center bg-gradient-to-b from-[#0b1a2c] to-[#05080d] px-6"
    >
      <div className="tour-caption max-w-sm text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-white/10">
          <CheckIcon className="h-8 w-8" />
        </span>
        <h2 className="mt-5 text-[26px] font-bold leading-tight text-white">
          {total === 0 ? "No rooms to tour yet" : `You've seen all ${total} room${total === 1 ? "" : "s"}`}
        </h2>
        <p className="mt-2 text-[15px] leading-relaxed text-white/70">
          {moreHref
            ? "There are more rooms for this search. Keep going, or go back to the list."
            : "New rooms are added all the time. Try a wider area or fewer filters to see more."}
        </p>
        <div className="mt-6 flex flex-col gap-2.5">
          {moreHref && (
            <Link href={moreHref} className="rounded-full bg-white px-5 py-3 text-[15px] font-semibold text-[#0b1a2c] transition active:scale-95">
              See more rooms
            </Link>
          )}
          {widenHref && (
            <Link href={widenHref} className={clsx("rounded-full px-5 py-3 text-[15px] font-semibold transition active:scale-95", moreHref ? "bg-white/10 text-white" : "bg-white text-[#0b1a2c]")}>
              Widen the search
            </Link>
          )}
          <Link href={backHref} className="rounded-full px-5 py-3 text-[15px] font-medium text-white/80 transition hover:text-white">
            Back to the list
          </Link>
        </div>
      </div>
    </section>
  );
}

function DetailsSheet({
  slide,
  onClose,
  refer,
  signedIn,
  loginHref,
  saved,
  onToggleSave,
}: {
  slide: TourSlide | null;
  onClose: () => void;
  refer?: Props["refer"];
  signedIn: boolean;
  loginHref: string;
  saved: boolean;
  onToggleSave: (id: string) => void;
}) {
  const [shown, setShown] = useState<TourSlide | null>(slide);
  const [open, setOpen] = useState(false);
  const [drag, setDrag] = useState(0);
  const startY = useRef<number | null>(null);

  // Keep the content during the closing animation.
  useEffect(() => {
    if (slide) {
      setShown(slide);
      const frame = requestAnimationFrame(() => setOpen(true));
      return () => cancelAnimationFrame(frame);
    }
    setOpen(false);
    const timer = window.setTimeout(() => setShown(null), 320);
    return () => window.clearTimeout(timer);
  }, [slide]);

  if (!shown) return null;
  const referHref = refer
    ? `/referrals/new?${new URLSearchParams({ ...(refer.clientId ? { clientId: refer.clientId } : {}), listingId: shown.id }).toString()}`
    : null;

  const facts: [string, string][] = [
    ["Type", shown.typeLabel],
    ["Rooms available", shown.roomsAvailable > 0 ? String(shown.roomsAvailable) : "Ask the provider"],
    ["Available from", shown.availableFrom ? new Date(shown.availableFrom).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "Now"],
    ["Bills", shown.billsIncluded ? "Included" : "Not included"],
    ["Housing Benefit", shown.housingBenefit ? "Accepted" : "Ask the provider"],
  ];

  return (
    <div className="absolute inset-0 z-40" aria-hidden={!open}>
      <button
        type="button"
        aria-label="Close details"
        onClick={onClose}
        className={clsx("absolute inset-0 bg-black/55 transition-opacity duration-300", open ? "opacity-100" : "opacity-0")}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Details: ${shown.title}`}
        className="tour-sheet absolute inset-x-0 bottom-0 mx-auto max-h-[82dvh] max-w-[620px] overflow-hidden rounded-t-[22px] bg-paper-card text-ink shadow-[0_-20px_60px_rgba(0,0,0,0.45)]"
        style={{
          transform: open ? `translateY(${drag}px)` : "translateY(100%)",
          transition: startY.current === null ? "transform 320ms cubic-bezier(0.16, 1, 0.3, 1)" : "none",
        }}
      >
        <div
          className="flex cursor-grab touch-none justify-center pb-2 pt-3"
          onPointerDown={(event) => {
            startY.current = event.clientY;
            (event.target as HTMLElement).setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            if (startY.current === null) return;
            setDrag(Math.max(0, event.clientY - startY.current));
          }}
          onPointerUp={() => {
            const shouldClose = drag > 90;
            startY.current = null;
            setDrag(0);
            if (shouldClose) onClose();
          }}
        >
          <span className="h-1.5 w-11 rounded-full bg-line-strong" />
        </div>
        <div className="max-h-[calc(82dvh-28px)] overflow-y-auto px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-7">
          <p className="text-[13px] text-ink-faint">
            {shown.company.name}
            {shown.company.verified ? " · Verified provider" : ""}
          </p>
          <h2 className="mt-1 text-[22px] font-bold leading-tight">{shown.title}</h2>
          <p className="mt-1 text-[16px] font-semibold text-pine-dark">{shown.rent}</p>
          <p className="text-[14px] text-ink-soft">{shown.location}</p>
          {shown.match && (
            <p className="mt-2 inline-flex rounded-full bg-pine-light px-3 py-1 text-[13px] font-semibold text-pine-dark">
              {shown.match.score}% match · {shown.match.label}
            </p>
          )}

          <dl className="mt-4 grid grid-cols-2 gap-2">
            {facts.map(([label, value]) => (
              <div key={label} className="rounded-[12px] bg-paper-sunk px-3 py-2.5">
                <dt className="text-[12px] text-ink-faint">{label}</dt>
                <dd className="text-[14px] font-medium">{value}</dd>
              </div>
            ))}
          </dl>

          {shown.supports.length > 0 && (
            <div className="mt-4">
              <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-faint">Support</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {shown.supports.map((support) => (
                  <span key={support} className="rounded-full bg-pine-light px-2.5 py-1 text-[13px] text-pine-dark">
                    {support}
                  </span>
                ))}
              </div>
            </div>
          )}

          {(shown.description || shown.summary) && (
            <div className="mt-4">
              <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-faint">About this home</p>
              <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-ink-soft">{shown.description || shown.summary}</p>
            </div>
          )}

          {shown.company.response && <p className="mt-4 text-[13px] text-ink-faint">{shown.company.response}</p>}

          <div className="sticky bottom-0 -mx-5 mt-5 grid grid-cols-2 gap-2 bg-paper-card px-5 pb-1 pt-3 sm:-mx-7 sm:px-7">
            <button type="button" onClick={() => onToggleSave(shown.id)} className={clsx("btn-secondary justify-center", saved && "border-pine text-pine-dark")}>
              <HeartIcon filled={saved} className="h-4 w-4" />
              {saved ? "Saved" : "Save"}
            </button>
            {referHref ? (
              shown.referred ? (
                <span className="btn-secondary justify-center opacity-70">Already referred</span>
              ) : (
                <Link href={signedIn ? referHref : loginHref} className="btn-primary justify-center">
                  Refer {refer?.clientName ? refer.clientName.split(" ")[0] : "a client"}
                </Link>
              )
            ) : (
              <Link href={signedIn ? `/listings/${shown.id}#message` : loginHref} className="btn-primary justify-center">
                Message provider
              </Link>
            )}
            <Link href={`/listings/${shown.id}`} className="btn-ghost col-span-2 justify-center">
              View the full advert
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

async function share(slide: TourSlide) {
  const url = `${window.location.origin}/listings/${slide.id}`;
  try {
    if (navigator.share) {
      await navigator.share({ title: slide.title, text: `${slide.title} on RoomsNow`, url });
      return;
    }
    await navigator.clipboard.writeText(url);
    toast.success("Link copied.");
  } catch {
    // Share sheet dismissed.
  }
}

function Chip({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-white/15 px-2.5 py-1 text-[12px] font-medium text-white backdrop-blur">{children}</span>;
}

function RailButton({
  label,
  onClick,
  pressed,
  disabled,
  children,
}: {
  label: string;
  onClick?: () => void;
  pressed?: boolean;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick?.();
      }}
      aria-pressed={pressed}
      disabled={disabled}
      className="group flex flex-col items-center gap-1 text-[11px] font-semibold text-white/90 disabled:opacity-70"
    >
      <span className="grid h-12 w-12 place-items-center rounded-full bg-black/30 backdrop-blur-md transition duration-150 group-hover:bg-black/45 group-active:scale-90">
        {children}
      </span>
      <span className="[text-shadow:0_1px_4px_rgba(0,0,0,0.6)]">{label}</span>
    </button>
  );
}

function RailLink({ href, label, children }: { href: string; label: string; children: ReactNode }) {
  return (
    <Link href={href} onClick={(event) => event.stopPropagation()} className="group flex flex-col items-center gap-1 text-[11px] font-semibold text-white/90">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-black/30 backdrop-blur-md transition duration-150 group-hover:bg-black/45 group-active:scale-90">
        {children}
      </span>
      <span className="[text-shadow:0_1px_4px_rgba(0,0,0,0.6)]">{label}</span>
    </Link>
  );
}

function StepButton({ label, disabled, onClick, direction }: { label: string; disabled: boolean; onClick: () => void; direction: "up" | "down" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="grid h-11 w-11 place-items-center rounded-full bg-white/10 backdrop-blur-md transition hover:bg-white/20 active:scale-90 disabled:opacity-30"
    >
      <svg viewBox="0 0 20 20" className={clsx("h-5 w-5", direction === "down" && "rotate-180")} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="m5 12 5-5 5 5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

function MediaStep({ label, disabled, onClick, direction }: { label: string; disabled: boolean; onClick: () => void; direction: "left" | "right" }) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      disabled={disabled}
      aria-label={label}
      className="grid h-10 w-10 place-items-center rounded-full bg-black/35 backdrop-blur-md transition hover:bg-black/55 active:scale-90 disabled:pointer-events-none disabled:opacity-0"
    >
      <svg viewBox="0 0 20 20" className={clsx("h-5 w-5", direction === "right" && "rotate-180")} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="m12 5-5 5 5 5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

function HeartIcon({ filled, className }: { filled?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M12 20.5s-7.5-4.6-7.5-10.1A4.2 4.2 0 0 1 12 7.8a4.2 4.2 0 0 1 7.5 2.6c0 5.5-7.5 10.1-7.5 10.1Z" strokeLinejoin="round" />
    </svg>
  );
}

function MessageIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M4.5 6.5A2.5 2.5 0 0 1 7 4h10a2.5 2.5 0 0 1 2.5 2.5v7A2.5 2.5 0 0 1 17 16h-6l-4.5 3.5V16H7a2.5 2.5 0 0 1-2.5-2.5v-7Z" strokeLinejoin="round" />
    </svg>
  );
}

function ReferIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="9" cy="8" r="3.5" />
      <path d="M3 19.5a6 6 0 0 1 10.5-4M15.5 12.5h6m0 0-2.5-2.5m2.5 2.5L19 15" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ShareIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M12 3.5v11M8 7.5l4-4 4 4M6 11.5v7a1.5 1.5 0 0 0 1.5 1.5h9a1.5 1.5 0 0 0 1.5-1.5v-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.5M12 7.8v.2" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
      <path d="m5 12.5 4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SoundIcon({ muted }: { muted: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4v-5Z" strokeLinejoin="round" />
      {muted ? <path d="m16 9.5 5 5m0-5-5 5" strokeLinecap="round" /> : <path d="M16 9a4.5 4.5 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11" strokeLinecap="round" />}
    </svg>
  );
}

/**
 * Motion for the tour. Kept here rather than in globals.css so the feature is
 * self-contained. Everything is skipped for people who ask for reduced motion.
 */
const TOUR_CSS = `
.tour-scroller { scrollbar-width: none; -webkit-overflow-scrolling: touch; }
.tour-scroller::-webkit-scrollbar { display: none; }
@media (prefers-reduced-motion: no-preference) {
  .tour-scroller { scroll-behavior: smooth; }
  .tour-slide .tour-caption { opacity: 0; transform: translateY(18px); transition: opacity 450ms ease, transform 550ms cubic-bezier(0.16, 1, 0.3, 1); }
  .tour-slide[data-active="true"] .tour-caption { opacity: 1; transform: none; transition-delay: 80ms; }
  .tour-slide img { transition: transform 1200ms cubic-bezier(0.16, 1, 0.3, 1); }
  .tour-slide[data-active="false"] img:not([aria-hidden]) { transform: scale(1.04); }
  .tour-pop { animation: tour-pop 420ms cubic-bezier(0.2, 1.6, 0.4, 1); }
  .tour-burst { animation: tour-burst 850ms cubic-bezier(0.2, 1.4, 0.4, 1) forwards; }
  .tour-hint { animation: tour-fade-in 500ms 600ms ease both; }
  .tour-hint-arrow { animation: tour-nudge 1.4s ease-in-out infinite; }
}
.tour-burst { transform: translate(-50%, -50%); }
@keyframes tour-pop { 0% { transform: scale(1); } 40% { transform: scale(1.35); } 100% { transform: scale(1); } }
@keyframes tour-burst {
  0% { opacity: 0; transform: translate(-50%, -50%) scale(0.4); }
  25% { opacity: 1; transform: translate(-50%, -50%) scale(1.15); }
  60% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
  100% { opacity: 0; transform: translate(-50%, -80%) scale(0.9); }
}
@keyframes tour-fade-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
@keyframes tour-nudge { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
`;
