"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { STORY_IMAGE_MS, type StoryGroup } from "@/lib/stories";
import { viewStoryAction } from "@/server/actions/stories";

function ago(iso: string) {
  const minutes = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  return minutes < 60 ? `${minutes}m ago` : `${Math.round(minutes / 60)}h ago`;
}

function Avatar({ name, url, size = "h-12 w-12" }: { name: string; url: string | null; size?: string }) {
  // eslint-disable-next-line @next/next/no-img-element -- provider logos come from storage at varying sizes
  if (url) return <img src={url} alt="" className={`${size} shrink-0 rounded-full border-2 border-white bg-white object-contain`} />;
  return <span aria-hidden="true" className={`${size} grid shrink-0 place-items-center rounded-full border-2 border-white bg-pine text-[17px] font-bold text-white`}>{name.trim().charAt(0).toUpperCase()}</span>;
}

/** The poster for a story: the photo, or the first frame of the video. */
function Thumb({ story }: { story: StoryGroup["stories"][number] }) {
  return story.mediaType === "VIDEO"
    ? <video src={`${story.mediaUrl}#t=0.1`} muted playsInline preload="metadata" className="h-full w-full object-cover" aria-hidden="true" />
    // eslint-disable-next-line @next/next/no-img-element -- user-uploaded story media
    : <img src={story.mediaUrl} alt="" className="h-full w-full object-cover" loading="lazy" />;
}

/** "Provider stories" rail: one tile per provider, opening the full-screen viewer. */
export function StoriesRail({ groups, title = "Provider stories" }: { groups: StoryGroup[]; title?: string }) {
  const [open, setOpen] = useState<number | null>(null);
  if (!groups.length) return null;
  return (
    <section aria-label={title}>
      <h2 className="flex items-center gap-2 text-[19px]">
        <span aria-hidden="true" className="grid h-6 w-6 place-items-center rounded-full border-2 border-pine text-pine-dark">
          <svg viewBox="0 0 16 16" className="h-3 w-3" fill="currentColor"><path d="M5 3.5v9l7-4.5-7-4.5Z" /></svg>
        </span>
        {title}
        <span className="text-[13px] font-normal text-ink-faint">· live for 24 hours</span>
      </h2>
      <ul className="-mx-4 mt-3 flex snap-x gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none]">
        {groups.map((group, index) => (
          <li key={group.companyId} className="snap-start">
            <button
              type="button"
              onClick={() => setOpen(index)}
              className="group relative block h-[176px] w-[124px] overflow-hidden rounded-card bg-paper-sunk text-left ring-2 ring-pine ring-offset-2 ring-offset-white focus-visible:outline-2 sm:h-[200px] sm:w-[140px]"
              aria-label={`Watch ${group.companyName}'s stories (${group.stories.length})`}
            >
              <Thumb story={group.stories[group.stories.length - 1]} />
              <span aria-hidden="true" className="absolute inset-0 bg-linear-to-t from-black/70 via-transparent to-transparent" />
              <span className="absolute inset-x-2 bottom-2 flex flex-col items-center gap-1 text-center">
                <Avatar name={group.companyName} url={group.logoUrl} size="h-11 w-11" />
                <span className="line-clamp-2 text-[12px] font-semibold leading-tight text-white">{group.companyName}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      {open !== null && <StoryViewer groups={groups} startGroup={open} onClose={() => setOpen(null)} />}
    </section>
  );
}

/**
 * Full-screen viewer: progress bars, tap right/left (or arrow keys) to move,
 * hold to pause, Esc to close. Photos show for 6 seconds; videos play to the
 * end. After a provider's last story it moves on to the next provider.
 */
function StoryViewer({ groups, startGroup, onClose }: { groups: StoryGroup[]; startGroup: number; onClose: () => void }) {
  const [g, setG] = useState(startGroup);
  const [s, setS] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const group = groups[g];
  const story = group.stories[s];

  const next = useCallback(() => {
    setProgress(0);
    if (s < group.stories.length - 1) setS(s + 1);
    else if (g < groups.length - 1) { setG(g + 1); setS(0); }
    else onClose();
  }, [g, s, group.stories.length, groups.length, onClose]);

  const prev = useCallback(() => {
    setProgress(0);
    if (s > 0) setS(s - 1);
    else if (g > 0) { setG(g - 1); setS(groups[g - 1].stories.length - 1); }
  }, [g, s, groups]);

  useEffect(() => { void viewStoryAction(story.id); }, [story.id]);

  // Photos advance on a timer; videos report their own progress below.
  useEffect(() => {
    if (story.mediaType !== "IMAGE" || paused) return;
    const started = Date.now() - progress * STORY_IMAGE_MS;
    const timer = window.setInterval(() => {
      const done = (Date.now() - started) / STORY_IMAGE_MS;
      if (done >= 1) next(); else setProgress(done);
    }, 50);
    return () => window.clearInterval(timer);
    // progress is read once when (re)starting the timer
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story.id, story.mediaType, paused, next]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (paused) video.pause();
    else video.play().catch(() => { video.muted = true; setMuted(true); void video.play().catch(() => undefined); });
  }, [story.id, paused]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      else if (event.key === "ArrowRight") next();
      else if (event.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = overflow; };
  }, [next, prev, onClose]);

  const enquireHref = story.listing ? `/listings/${story.listing.id}?from=story#message` : `/companies/${group.slug}`;

  return (
    <div role="dialog" aria-modal="true" aria-label={`${group.companyName} stories`} className="fixed inset-0 z-[100] flex items-center justify-center bg-black">
      <div className="relative flex h-full w-full max-w-[460px] flex-col overflow-hidden bg-black sm:h-[92vh] sm:rounded-card">
        <div className="absolute inset-x-0 top-0 z-20 bg-linear-to-b from-black/70 to-transparent px-3 pb-6 pt-3">
          <div className="flex gap-1" aria-hidden="true">
            {group.stories.map((item, i) => (
              <span key={item.id} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/35">
                <span className="block h-full bg-white" style={{ width: `${i < s ? 100 : i === s ? Math.round(progress * 100) : 0}%` }} />
              </span>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-3 text-white">
            <Avatar name={group.companyName} url={group.logoUrl} size="h-10 w-10" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold">
                {group.companyName} <span className="font-normal text-white/70">· {ago(story.createdAt)}</span>
              </p>
              {group.verified && <p className="text-[12px] text-white/80">Verified provider</p>}
            </div>
            {story.mediaType === "VIDEO" && (
              <button type="button" onClick={() => { setMuted(!muted); if (videoRef.current) videoRef.current.muted = !muted; }} className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/15" aria-label={muted ? "Turn sound on" : "Mute"}>
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4Z" fill="currentColor" stroke="none" />{muted ? <path d="m17 9 5 6m0-6-5 6" /> : <path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" />}</svg>
              </button>
            )}
            <button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/15" aria-label="Close stories">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
            </button>
          </div>
        </div>

        <div
          className="relative flex-1 select-none"
          onPointerDown={() => setPaused(true)}
          onPointerUp={() => setPaused(false)}
          onPointerLeave={() => setPaused(false)}
        >
          {story.mediaType === "VIDEO" ? (
            <video
              key={story.id}
              ref={videoRef}
              src={story.mediaUrl}
              playsInline
              autoPlay
              muted={muted}
              onTimeUpdate={(event) => { const v = event.currentTarget; if (v.duration) setProgress(v.currentTime / v.duration); }}
              onEnded={next}
              className="h-full w-full object-contain"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- user-uploaded story media
            <img key={story.id} src={story.mediaUrl} alt={story.caption ?? `Story from ${group.companyName}`} className="h-full w-full object-contain" />
          )}
          <button type="button" onClick={prev} className="absolute inset-y-0 left-0 z-10 w-1/3" aria-label="Previous story" />
          <button type="button" onClick={next} className="absolute inset-y-0 right-0 z-10 w-2/3" aria-label="Next story" />
        </div>

        <div className="absolute inset-x-0 bottom-0 z-20 space-y-3 bg-linear-to-t from-black/85 via-black/50 to-transparent px-4 pb-5 pt-14 text-white">
          {story.caption && <p className="text-[16px] leading-snug">{story.caption}</p>}
          {story.listing && (
            <Link href={`/listings/${story.listing.id}?from=story`} className="block rounded-card border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-sm hover:bg-white/15">
              <span className="block text-[18px] font-bold">{story.listing.price}</span>
              <span className="block truncate text-[14px] text-white/90">{story.listing.title}</span>
              {story.listing.place && <span className="block truncate text-[13px] text-white/70">{story.listing.place}</span>}
            </Link>
          )}
          <div className={`grid gap-3 ${story.whatsapp && story.listing ? "grid-cols-2" : "grid-cols-1"}`}>
            <Link href={enquireHref} className="flex items-center justify-center gap-2 rounded-[12px] bg-white py-3 text-[16px] font-semibold text-pine-dark hover:bg-white/90">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-5A8 8 0 1 1 21 12Z" /></svg>
              Enquire
            </Link>
            {story.whatsapp && story.listing && (
              <a href={`/api/whatsapp/${story.listing.id}`} rel="nofollow" className="flex items-center justify-center gap-2 rounded-[12px] bg-[#25d366] py-3 text-[16px] font-semibold text-[#063d1c] hover:brightness-95">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.3-.3.6-.3.8-.3h.6c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.4 0 .5l-.3.5-.4.5c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.9-1.1c.2-.3.4-.2.6-.1l2 1c.3.1.5.2.5.3.1.2.1.7-.1 1.3Z" /></svg>
                WhatsApp
              </a>
            )}
          </div>
          <p className="text-center text-[11.5px] text-white/60">Never pay a deposit before you&apos;ve viewed the room.</p>
        </div>
      </div>
    </div>
  );
}
