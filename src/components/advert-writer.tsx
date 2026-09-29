"use client";

import { useEffect, useState, useTransition, type RefObject } from "react";
import { writeAdvertCopyAction, type AdvertWriterResult } from "@/server/actions/advert-writer";
import { FEATURE_LABELS, WRITER_TONES, type WriterTone } from "@/lib/advert-writer";
import { toast } from "./toast";
import { clsx } from "@/lib/clsx";

type Copy = { title: string; summary: string; description: string };
type FieldName = keyof Copy;

const FIELDS: FieldName[] = ["title", "summary", "description"];

/** Everything the provider has entered so far, read straight from the form. */
function readFacts(form: HTMLFormElement) {
  const data = new FormData(form);
  const value = (name: string) => String(data.get(name) ?? "").trim();
  const number = (name: string) => {
    const raw = value(name);
    return raw === "" ? undefined : Number(raw);
  };
  return {
    propertyName: value("propertyName"),
    city: value("city"),
    area: value("area"),
    postcode: value("postcode"),
    accommodationType: value("accommodationType"),
    bedrooms: number("bedrooms"),
    roomCount: number("roomCount"),
    weeklyRentFrom: number("weeklyRentFrom"),
    weeklyRentTo: number("weeklyRentTo"),
    availableFrom: value("availableFrom"),
    genderArrangement: value("genderArrangement"),
    minAge: number("minAge"),
    maxAge: number("maxAge"),
    features: Object.keys(FEATURE_LABELS).filter((name) => data.get(name) === "on"),
    accessibilityNotes: value("accessibilityNotes"),
    supportTypes: data.getAll("supportTypes").map(String),
    supportDescription: value("supportDescription"),
    supportAvailability: value("supportAvailability"),
    supportProvider: value("supportProvider"),
    referralRoutes: data.getAll("referralRoutes").map(String),
    referralProcess: value("referralProcess"),
    houseRules: value("houseRules"),
  };
}

function fieldOf(form: HTMLFormElement, name: FieldName) {
  const field = form.elements.namedItem(name);
  return field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement ? field : null;
}

/** Reveals new copy a little at a time, like it's being typed. */
function useTypewriter(text: string, speed = 3) {
  const [shown, setShown] = useState(text.length);
  useEffect(() => {
    if (!text || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(text.length);
      return;
    }
    setShown(0);
    let frame = 0;
    let count = 0;
    const tick = () => {
      count = Math.min(text.length, count + speed + Math.floor(text.length / 400));
      setShown(count);
      if (count < text.length) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [text, speed]);
  return text.slice(0, shown);
}

export function AdvertWriter({
  formRef,
  onDescriptionChange,
  onRevealTitle,
}: {
  formRef: RefObject<HTMLFormElement | null>;
  /** Keeps the character counter in step when the description is filled in. */
  onDescriptionChange: (length: number) => void;
  /** Called after applying, so the form can point the provider at the new title. */
  onRevealTitle?: () => void;
}) {
  const [notes, setNotes] = useState("");
  const [tone, setTone] = useState<WriterTone>("warm");
  const [result, setResult] = useState<Extract<AdvertWriterResult, { ok: true }> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [undo, setUndo] = useState<Copy | null>(null);
  const [pending, start] = useTransition();

  const typedDescription = useTypewriter(result?.description ?? "");
  const typing = Boolean(result && typedDescription.length < result.description.length);

  function write() {
    const form = formRef.current;
    if (!form) return;
    setError(null);
    start(async () => {
      const response = await writeAdvertCopyAction({ ...readFacts(form), notes, tone });
      if (!response.ok) {
        setError(response.message);
        return;
      }
      setResult(response);
      setUndo(null);
    });
  }

  function apply(fields: FieldName[]) {
    const form = formRef.current;
    if (!form || !result) return;
    const previous: Copy = { title: "", summary: "", description: "" };
    for (const name of FIELDS) previous[name] = fieldOf(form, name)?.value ?? "";
    for (const name of fields) {
      const field = fieldOf(form, name);
      if (field) field.value = result[name];
    }
    if (fields.includes("description")) onDescriptionChange(result.description.length);
    setUndo(previous);
    toast.success(fields.length === 3 ? "Title, summary and description added. Edit anything you like." : "Added to your advert.");
    if (fields.includes("title")) onRevealTitle?.();
  }

  function restore() {
    const form = formRef.current;
    if (!form || !undo) return;
    for (const name of FIELDS) {
      const field = fieldOf(form, name);
      if (field) field.value = undo[name];
    }
    onDescriptionChange(undo.description.length);
    setUndo(null);
    toast.success("Put back what you had before.");
  }

  return (
    <section aria-labelledby="advert-writer-heading" className="advert-writer relative overflow-hidden rounded-card p-[1.5px]">
      <div className="relative rounded-[13px] bg-paper-card p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span aria-hidden="true" className={clsx("writer-spark grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-gradient-to-br from-pine to-[#70baff] text-white shadow-raise", pending && "is-working")}>
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M12 2.5l1.9 5.1 5.1 1.9-5.1 1.9L12 16.5l-1.9-5.1L5 9.5l5.1-1.9L12 2.5Zm6.5 11 .9 2.4 2.4.9-2.4.9-.9 2.4-.9-2.4-2.4-.9 2.4-.9.9-2.4ZM5.5 15l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7.7-1.8Z" /></svg>
          </span>
          <div className="min-w-0">
            <h2 id="advert-writer-heading" className="text-[19px]">Write my advert for me</h2>
            <p className="mt-0.5 max-w-[60ch] text-[14px] leading-relaxed text-ink-soft">
              We&apos;ll turn everything you&apos;ve filled in into a title, summary and description. It only uses your details and never shows the full address.
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <label htmlFor="advert-writer-notes" className="label">Anything else worth mentioning? (optional)</label>
          <textarea
            id="advert-writer-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="Rough notes are fine, e.g. newly decorated, big garden, 5 mins to bus stop, quiet street, staff office on site"
            className="field"
          />
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[13px] text-ink-faint">Tone:</span>
            {(Object.entries(WRITER_TONES) as Array<[WriterTone, string]>).map(([key, label]) => (
              <button
                key={key}
                type="button"
                aria-pressed={tone === key}
                onClick={() => setTone(key)}
                className={clsx("chip", tone === key && "chip-active")}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button type="button" onClick={write} disabled={pending} className="btn-primary">
              {pending ? "Writing…" : result ? "Write another version" : "Write my advert"}
            </button>
            {error && <p role="alert" className="text-[14px] text-clay">{error}</p>}
          </div>
        </div>

        {pending && (
          <div className="mt-5 space-y-2.5" role="status" aria-live="polite">
            <span className="sr-only">Writing your advert…</span>
            <div className="skeleton h-5 w-2/3" />
            <div className="skeleton h-4 w-5/6" />
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-4 w-11/12" />
            <div className="skeleton h-4 w-3/4" />
          </div>
        )}

        {result && !pending && (
          <div className="mt-5 animate-fade-in-up rounded-[12px] border border-line bg-paper p-4 sm:p-5" aria-live="polite">
            <p className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-pine-dark">Suggested advert</p>
            <dl className="mt-3 space-y-4">
              <div>
                <dt className="flex items-center justify-between gap-2 text-[12.5px] text-ink-faint">
                  Title
                  <button type="button" onClick={() => apply(["title"])} className="text-[13px] font-medium text-pine-dark hover:underline">Use</button>
                </dt>
                <dd className="mt-1 font-display text-[18px] font-semibold text-ink">{result.title}</dd>
              </div>
              {result.summary && (
                <div>
                  <dt className="flex items-center justify-between gap-2 text-[12.5px] text-ink-faint">
                    One-line summary
                    <button type="button" onClick={() => apply(["summary"])} className="text-[13px] font-medium text-pine-dark hover:underline">Use</button>
                  </dt>
                  <dd className="mt-1 text-[15px] text-ink-soft">{result.summary}</dd>
                </div>
              )}
              <div>
                <dt className="flex items-center justify-between gap-2 text-[12.5px] text-ink-faint">
                  Description
                  <button type="button" onClick={() => apply(["description"])} className="text-[13px] font-medium text-pine-dark hover:underline">Use</button>
                </dt>
                <dd className={clsx("mt-1 whitespace-pre-line text-[15px] leading-relaxed text-ink", typing && "writer-caret")}>{typedDescription}</dd>
              </div>
            </dl>
            <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-4">
              <button type="button" onClick={() => apply(FIELDS)} className="btn-primary">Use all of it</button>
              {undo && <button type="button" onClick={restore} className="btn-ghost">Undo</button>}
              <p className="text-[12.5px] text-ink-faint">
                {result.source === "ai" ? "Written with AI from your details." : "Written from your details."} Check it&apos;s accurate before publishing.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
