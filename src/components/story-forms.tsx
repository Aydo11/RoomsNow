"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { postStoryAction } from "@/server/actions/stories";
import { STORY_CAPTION_MAX } from "@/lib/stories";
import { Field, FormError, FormSuccess, SubmitButton } from "./ui";

/** Provider posts a story: pick a photo or short video, add a caption, optionally link an advert. */
export function PostStoryForm({ adverts, allowVideo }: { adverts: Array<{ id: string; title: string }>; allowVideo: boolean }) {
  const [state, action] = useActionState(postStoryAction, { ok: false });
  const [preview, setPreview] = useState<{ url: string; video: boolean } | null>(null);
  const [caption, setCaption] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state.ok) return;
    formRef.current?.reset();
    setCaption("");
    setPreview(null);
  }, [state]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview.url); }, [preview]);

  return (
    <form ref={formRef} action={action} className="card space-y-5 p-5 sm:p-6">
      <h2 className="text-[18px]">Post a story</h2>
      <FormSuccess message={state.ok ? state.message : undefined} />
      <FormError message={state.errors?.form} />
      <div className="grid gap-5 sm:grid-cols-[160px_1fr]">
        <div className="relative grid aspect-[9/16] w-[160px] place-items-center overflow-hidden rounded-card border border-dashed border-line bg-paper-sunk text-center text-[13px] text-ink-faint">
          {preview ? (
            preview.video
              ? <video src={preview.url} muted autoPlay loop playsInline className="h-full w-full object-cover" />
              // eslint-disable-next-line @next/next/no-img-element -- local preview of the chosen file
              : <img src={preview.url} alt="Preview" className="h-full w-full object-cover" />
          ) : <span className="px-3">Your photo or video shows here</span>}
        </div>
        <div className="space-y-4">
          <Field label={allowVideo ? "Photo or video" : "Photo"} name="media" error={state.errors?.media} hint={allowVideo ? "A vertical phone video works best. Photos JPG/PNG/WebP up to 8 MB, videos MP4/MOV up to 20 MB." : "JPG, PNG or WebP up to 8 MB. Video stories come with the Professional plan and above."} required>
            <input
              id="media"
              name="media"
              type="file"
              required
              accept={allowVideo ? "image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm" : "image/jpeg,image/png,image/webp"}
              className="field"
              onChange={(event) => {
                const file = event.target.files?.[0];
                setPreview(file ? { url: URL.createObjectURL(file), video: file.type.startsWith("video/") } : null);
              }}
            />
          </Field>
          <Field label="Caption" name="caption" error={state.errors?.caption} hint={`${caption.length}/${STORY_CAPTION_MAX}. For example "Double room free now, bills included, viewings this week".`}>
            <textarea id="caption" name="caption" maxLength={STORY_CAPTION_MAX} value={caption} onChange={(event) => setCaption(event.target.value)} className="field min-h-[80px]" />
          </Field>
          <Field label="Link to an advert (optional)" name="listingId" error={state.errors?.listingId} hint="Viewers can enquire on that advert straight from the story, and WhatsApp you if it's switched on.">
            <select id="listingId" name="listingId" className="field" defaultValue="">
              <option value="">No advert, just my profile</option>
              {adverts.map((advert) => <option key={advert.id} value={advert.id}>{advert.title}</option>)}
            </select>
          </Field>
          <SubmitButton pendingLabel="Uploading…">Post story</SubmitButton>
          <p className="text-[13px] text-ink-faint">Stories go live straight away on the homepage and search, and disappear after 24 hours.</p>
        </div>
      </div>
    </form>
  );
}
