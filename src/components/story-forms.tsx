"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { adminPostStoryAction, postStoryAction } from "@/server/actions/stories";
import { STORY_CAPTION_MAX, STORY_IMAGE_MAX_MB, STORY_VIDEO_MAX_MB, storyFileProblem } from "@/lib/stories";
import { Field, FormError, FormSuccess, SubmitButton } from "./ui";

type Picked = { url: string; video: boolean; name: string; size: string };

/** Provider posts a story: pick a photo or short video, add a caption, optionally link an advert. */
export function PostStoryForm({ adverts, allowVideo, official = false }: { adverts: Array<{ id: string; title: string }>; allowVideo: boolean; official?: boolean }) {
  const [state, action, pending] = useActionState(official ? adminPostStoryAction : postStoryAction, { ok: false });
  const [picked, setPicked] = useState<Picked | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!state.ok) return;
    formRef.current?.reset();
    setCaption("");
    setPicked(null);
  }, [state]);
  useEffect(() => () => { if (picked) URL.revokeObjectURL(picked.url); }, [picked]);

  function choose(file: File | undefined) {
    setProblem(null);
    if (!file) return setPicked(null);
    const issue = storyFileProblem(file, allowVideo);
    if (issue) {
      setProblem(issue);
      setPicked(null);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    setPicked({ url: URL.createObjectURL(file), video: file.type.startsWith("video/"), name: file.name, size: `${(file.size / 1024 / 1024).toFixed(1)} MB` });
  }

  const mediaError = problem ?? state.errors?.media;

  return (
    <form ref={formRef} action={action} className="card space-y-5 p-5 sm:p-6">
      <div>
        <h2 className="text-[18px]">{official ? "Post a RoomsNow story" : "Post a story"}</h2>
        <p className="mt-1 text-[14px] text-ink-soft">{official ? "Shown first to everyone on the search page as an official RoomsNow update, for 24 hours." : "Goes live straight away on the search page, then disappears after 24 hours."}</p>
      </div>
      <FormSuccess message={state.ok ? state.message : undefined} />
      <FormError message={state.errors?.form} />

      <div className="grid gap-6 sm:grid-cols-[220px_1fr]">
        {/* The whole box is the file picker, so it's one big tap target on a phone. */}
        <div>
          <label
            htmlFor="media"
            className={`relative mx-auto grid aspect-[9/16] w-full max-w-[240px] cursor-pointer place-items-center overflow-hidden rounded-card border-2 text-center transition-colors focus-within:outline-2 focus-within:outline-pine ${
              picked ? "border-pine bg-black" : mediaError ? "border-dashed border-clay bg-paper-sunk" : "border-dashed border-pine/50 bg-pine/5 hover:border-pine hover:bg-pine/10"
            }`}
          >
            {picked ? (
              picked.video
                ? <video src={picked.url} muted autoPlay loop playsInline className="h-full w-full object-cover" />
                // eslint-disable-next-line @next/next/no-img-element -- local preview of the chosen file
                : <img src={picked.url} alt="Your story preview" className="h-full w-full object-cover" />
            ) : (
              <span className="flex flex-col items-center gap-3 px-4">
                <span aria-hidden="true" className="grid h-14 w-14 place-items-center rounded-full bg-pine text-white shadow-sm">
                  <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
                </span>
                <span className="text-[16px] font-semibold text-ink">Tap to add {allowVideo ? "a photo or video" : "a photo"}</span>
                <span className="text-[13px] leading-snug text-ink-faint">
                  {allowVideo ? `Photos up to ${STORY_IMAGE_MAX_MB} MB · videos up to ${STORY_VIDEO_MAX_MB} MB` : `JPG, PNG or WebP up to ${STORY_IMAGE_MAX_MB} MB`}
                </span>
              </span>
            )}
            {pending && (
              <span className="absolute inset-0 grid place-items-center bg-black/60 text-white">
                <span className="flex flex-col items-center gap-2 px-4 text-[14px] font-semibold">
                  <svg className="h-8 w-8 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.3" /><path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg>
                  Uploading…
                  <span className="text-[12px] font-normal opacity-90">{picked?.video ? "Videos can take a minute. " : ""}Keep this page open.</span>
                </span>
              </span>
            )}
            <input
              ref={inputRef}
              id="media"
              name="media"
              type="file"
              required
              accept={allowVideo ? "image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm" : "image/jpeg,image/png,image/webp"}
              className="sr-only"
              onChange={(event) => choose(event.target.files?.[0])}
            />
          </label>
          {picked && !pending && (
            <p className="mx-auto mt-2 flex max-w-[240px] items-center justify-between gap-2 text-[13px] text-ink-soft">
              <span className="truncate">{picked.size}</span>
              <button type="button" onClick={() => inputRef.current?.click()} className="font-semibold text-pine-dark underline underline-offset-2">Change</button>
            </p>
          )}
          {mediaError && <p role="alert" className="mx-auto mt-2 max-w-[240px] text-[13px] font-medium text-clay">{mediaError}</p>}
          {!allowVideo && <p className="mx-auto mt-2 max-w-[240px] text-[12px] text-ink-faint">Video stories come with the Professional plan and above.</p>}
        </div>

        <div className="space-y-4">
          <Field label="Caption" name="caption" error={state.errors?.caption} hint={`${caption.length}/${STORY_CAPTION_MAX}. For example "Double room free now, bills included, viewings this week".`}>
            <textarea id="caption" name="caption" maxLength={STORY_CAPTION_MAX} value={caption} onChange={(event) => setCaption(event.target.value)} className="field min-h-[96px]" placeholder={official ? "What's new on RoomsNow?" : "What's available?"} />
          </Field>
          {official ? (
            <Field label="Find out more link (optional)" name="linkUrl" error={state.errors?.linkUrl} hint="A page on RoomsNow, like /advertise/homepage or /pricing. Leave empty for no button.">
              <input id="linkUrl" name="linkUrl" className="field" placeholder="/pricing" inputMode="url" />
            </Field>
          ) : (
            <Field label="Link to an advert (optional)" name="listingId" error={state.errors?.listingId} hint="Viewers can enquire on that advert straight from the story, and WhatsApp you if it's switched on.">
              <select id="listingId" name="listingId" className="field" defaultValue="">
                <option value="">No advert, just my profile</option>
                {adverts.map((advert) => <option key={advert.id} value={advert.id}>{advert.title}</option>)}
              </select>
            </Field>
          )}
          <SubmitButton pendingLabel="Uploading…" disabled={!picked} className="btn-primary w-full sm:w-auto">Post story</SubmitButton>
          {!picked && <p className="text-[13px] text-ink-faint">Add a photo{allowVideo ? " or video" : ""} first.</p>}
        </div>
      </div>
    </form>
  );
}
