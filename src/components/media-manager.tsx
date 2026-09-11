"use client";

import { useEffect, useRef, useState, useTransition, useActionState } from "react";
import {
  deleteMediaAction,
  reorderMediaAction,
  setPrimaryMediaAction,
  submitListingAction,
  updateMediaDetailsAction,
  uploadListingMediaAction,
} from "@/server/actions/listings";
import { Field, FormError, FormSuccess, SubmitButton } from "./ui";
import { clsx } from "@/lib/clsx";
import { demoListingImage } from "@/lib/demo-listings";
import { ResilientImage } from "./resilient-image";

type Item = { id: string; url: string; type: string; caption: string | null; roomId: string | null; isPrimary: boolean };
type Room = { id: string; name: string };

export function MediaManager({ listingId, status, media, rooms, permanentStorage }: {
  listingId: string;
  status: string;
  media: Item[];
  rooms: Room[];
  permanentStorage: boolean;
}) {
  const [state, action] = useActionState(uploadListingMediaAction, { ok: false });
  const [items, setItems] = useState(media);
  const [dragging, setDragging] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => setItems(media), [media]);

  // Once an upload completes, clear the form (selected files, caption, video
  // URL) so the file picker is ready for the next batch and doesn't look like
  // it's still holding the files that were just added.
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  function persistOrder(next: Item[]) {
    setItems(next);
    startTransition(() => reorderMediaAction(listingId, next.map((item) => item.id)));
  }

  function move(sourceId: string, targetId: string) {
    if (sourceId === targetId) return;
    const next = [...items];
    const from = next.findIndex((item) => item.id === sourceId);
    const to = next.findIndex((item) => item.id === targetId);
    if (from < 0 || to < 0) return;
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    persistOrder(next);
  }

  function step(itemId: string, direction: -1 | 1) {
    const from = items.findIndex((item) => item.id === itemId);
    const to = from + direction;
    if (from < 0 || to < 0 || to >= items.length) return;
    const next = [...items];
    [next[from], next[to]] = [next[to], next[from]];
    persistOrder(next);
  }

  function updateLocal(id: string, patch: Partial<Item>) {
    setSavedId(null);
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  return (
    <div className="space-y-6">
      <form ref={formRef} action={action} className="card space-y-5 p-4 sm:p-6">
        <input type="hidden" name="listingId" value={listingId} />
        <FormError message={state.errors?.form} />
        <FormSuccess message={state.ok ? state.message : undefined} />

        {!permanentStorage && (
          <div className="rounded-[10px] border border-amber-300 bg-amber-50 px-4 py-3 text-[13px] leading-relaxed text-amber-950">
            <strong className="font-semibold">Temporary photo storage is active.</strong>{" "}
            Photos can disappear when Render restarts or redeploys. Illustrative images will be shown instead until permanent object storage is connected.
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label="Add photos or a short video"
            name="files"
            hint="Up to 12 files. Photos: 8MB each. Video: 20MB. These upload as soon as you choose them — no extra button to press."
            error={state.errors?.files}
          >
            <input
              id="files"
              name="files"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif,video/mp4,video/quicktime,video/webm"
              multiple
              className="field file:mr-3 file:rounded-md file:border-0 file:bg-pine-light file:px-3 file:py-1.5 file:text-pine-dark"
              onChange={(event) => {
                if (event.target.files && event.target.files.length > 0) formRef.current?.requestSubmit();
              }}
            />
          </Field>
          <Field label="YouTube or Vimeo walkthrough" name="videoUrl" hint="Best for longer videos. Press “Add video link” once you've pasted this." error={state.errors?.videoUrl}>
            <input id="videoUrl" name="videoUrl" type="url" inputMode="url" placeholder="https://" className="field" />
          </Field>
          <Field label="Caption" name="caption" hint="Describe what is shown (160 characters max). Applies to files chosen above; you can also caption each item individually below.">
            <input id="caption" name="caption" maxLength={160} placeholder="Bright first-floor bedroom" className="field" />
          </Field>
          <Field label="Room or area" name="roomId" hint="Optional — connect media to a particular room.">
            <select id="roomId" name="roomId" className="field" defaultValue="">
              <option value="">Whole property / shared area</option>
              {rooms.map((room) => <option key={room.id} value={room.id}>{room.name}</option>)}
            </select>
          </Field>
        </div>
        <SubmitButton pendingLabel="Uploading…">Add video link</SubmitButton>
      </form>

      {items.length > 0 ? (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item, index) => (
            <li key={item.id} draggable onDragStart={() => setDragging(item.id)} onDragEnd={() => setDragging(null)} onDragOver={(event) => event.preventDefault()} onDrop={() => dragging && move(dragging, item.id)} className={clsx("card overflow-hidden", item.isPrimary && "ring-2 ring-pine", dragging === item.id && "opacity-60")}>
              <div className="relative aspect-[4/3] bg-paper-sunk">
                {item.type === "IMAGE" ? (
                  <ResilientImage
                    src={item.url}
                    fallbackSrc={demoListingImage(listingId, index).url}
                    fallbackLabel="Photo unavailable"
                    alt={item.caption ?? "Property photo"}
                    className="h-full w-full object-cover"
                  />
                ) : item.type === "VIDEO" ? (
                  <video src={item.url} controls playsInline preload="metadata" className="h-full w-full bg-black object-contain" />
                ) : (
                  <span className="grid h-full place-items-center px-3 text-center text-[13px] text-ink-soft">Linked walkthrough video</span>
                )}
                <span className="absolute left-2 top-2 rounded-pill bg-black/70 px-2 py-1 text-[11px] font-medium text-white">{item.type === "IMAGE" ? `Photo ${index + 1}` : "Video"}</span>
              </div>

              <div className="space-y-3 p-3">
                <label className="block text-[12px] font-medium text-ink-soft">
                  Caption
                  <input value={item.caption ?? ""} maxLength={160} onChange={(event) => updateLocal(item.id, { caption: event.target.value })} className="field mt-1" aria-label={`Caption for media ${index + 1}`} />
                </label>
                <label className="block text-[12px] font-medium text-ink-soft">
                  Room or area
                  <select value={item.roomId ?? ""} onChange={(event) => updateLocal(item.id, { roomId: event.target.value || null })} className="field mt-1" aria-label={`Room for media ${index + 1}`}>
                    <option value="">Whole property / shared area</option>
                    {rooms.map((room) => <option key={room.id} value={room.id}>{room.name}</option>)}
                  </select>
                </label>

                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" className="btn-secondary px-3 py-2 text-[13px]" disabled={pending} onClick={() => startTransition(async () => {
                    await updateMediaDetailsAction(listingId, item.id, item.caption ?? "", item.roomId);
                    setSavedId(item.id);
                  })}>{savedId === item.id ? "Saved" : "Save details"}</button>
                  <button type="button" className="btn-ghost px-2.5 py-2" aria-label="Move earlier" disabled={pending || index === 0} onClick={() => step(item.id, -1)}>←</button>
                  <button type="button" className="btn-ghost px-2.5 py-2" aria-label="Move later" disabled={pending || index === items.length - 1} onClick={() => step(item.id, 1)}>→</button>
                </div>

                <div className="flex items-center justify-between gap-2 border-t border-line pt-3">
                  {item.isPrimary ? <span className="text-[12px] font-medium text-pine-dark">Main photo</span> : item.type === "IMAGE" ? (
                    <button type="button" className="text-[12px] text-ink-soft hover:text-ink" disabled={pending} onClick={() => startTransition(() => setPrimaryMediaAction(listingId, item.id))}>Make main photo</button>
                  ) : <span />}
                  <button type="button" className="text-[12px] text-clay-dark hover:underline" disabled={pending} onClick={() => {
                    if (window.confirm("Remove this photo or video?")) startTransition(() => deleteMediaAction(listingId, item.id));
                  }}>Remove</button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="card border-dashed p-8 text-center">
          <p className="text-[16px] text-ink">Add clear photos of the outside, shared spaces and each room.</p>
          <p className="mt-1 text-[14px] text-ink-faint">The first photo becomes the search card image. Until then, the public advert uses a clearly labelled illustrative image.</p>
        </div>
      )}

      {(status === "DRAFT" || status === "REJECTED") && (
        <div className="card flex flex-col items-start justify-between gap-4 p-5 sm:flex-row sm:items-center">
          <p className="text-[15px] text-ink-soft">Happy with it? Send it to our team — most adverts are reviewed within a working day.</p>
          <button type="button" className="btn-primary w-full sm:w-auto" disabled={pending} onClick={() => startTransition(() => submitListingAction(listingId).catch(() => {}))}>Submit your advertisement</button>
        </div>
      )}
    </div>
  );
}
