"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { clsx } from "@/lib/clsx";
import { speechChunks } from "@/lib/plain-summary";

type Status = "idle" | "playing" | "paused";

/**
 * "In simple words" box on an advert, with a Listen button that reads it out
 * using the phone or computer's own voice (no audio is sent anywhere). While
 * it reads, the line being spoken is highlighted so people can follow along.
 * After the simple version it reads the provider's own description.
 */
export function SimpleSummary({ title, lines, fullText }: { title: string; lines: string[]; fullText: string | null }) {
  const [supported, setSupported] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [current, setCurrent] = useState<number | null>(null);
  const [slow, setSlow] = useState(false);
  const run = useRef(0);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window);
    // Voices load after page load in some browsers.
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.getVoices();
  }, []);

  const stop = useCallback(() => {
    run.current += 1;
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    setStatus("idle");
    setCurrent(null);
  }, []);

  // Never keep talking after leaving the page.
  useEffect(() => {
    const onHide = () => stop();
    window.addEventListener("pagehide", onHide);
    return () => {
      window.removeEventListener("pagehide", onHide);
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, [stop]);

  function play(useSlow = slow) {
    const synth = window.speechSynthesis;
    synth.cancel();
    const id = ++run.current;
    const voices = synth.getVoices();
    const voice =
      voices.find((v) => v.lang === "en-GB" && /natural|google|serena|daniel|kate|libby|sonia/i.test(v.name)) ??
      voices.find((v) => v.lang === "en-GB") ??
      voices.find((v) => v.lang.startsWith("en")) ??
      null;

    // Each summary line is its own utterance so it can be highlighted.
    const queue: { text: string; line: number | null }[] = [
      { text: title, line: null },
      ...lines.map((text, index) => ({ text, line: index })),
    ];
    if (fullText) {
      queue.push({ text: "Here is what the provider says.", line: null });
      for (const chunk of speechChunks(fullText)) queue.push({ text: chunk, line: null });
    }

    queue.forEach((item, index) => {
      const utterance = new SpeechSynthesisUtterance(item.text);
      utterance.lang = "en-GB";
      if (voice) utterance.voice = voice;
      utterance.rate = useSlow ? 0.8 : 0.98;
      utterance.onstart = () => {
        if (run.current === id) setCurrent(item.line);
      };
      if (index === queue.length - 1) {
        utterance.onend = () => {
          if (run.current === id) {
            setStatus("idle");
            setCurrent(null);
          }
        };
      }
      utterance.onerror = () => {
        if (run.current === id && index === queue.length - 1) {
          setStatus("idle");
          setCurrent(null);
        }
      };
      synth.speak(utterance);
    });
    setStatus("playing");
  }

  function pauseOrResume() {
    const synth = window.speechSynthesis;
    if (status === "playing") {
      synth.pause();
      setStatus("paused");
    } else if (status === "paused") {
      synth.resume();
      setStatus("playing");
    }
  }

  function toggleSlow() {
    const next = !slow;
    setSlow(next);
    // The rate can't change mid-sentence, so start again at the new speed.
    if (status !== "idle") play(next);
  }

  return (
    <section className="mt-6 rounded-card border border-pine/20 bg-pine-light/40 p-5" aria-labelledby="simple-summary-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="simple-summary-heading" className="text-[18px] font-bold text-ink">
          In simple words
        </h2>
        {supported && (
          <div className="flex items-center gap-2">
            {status === "idle" ? (
              <button type="button" onClick={() => play()} className="btn-primary min-h-[40px] py-2">
                <SpeakerIcon />
                Listen
              </button>
            ) : (
              <>
                <button type="button" onClick={pauseOrResume} className="btn-secondary min-h-[40px] py-2" aria-label={status === "playing" ? "Pause" : "Carry on"}>
                  {status === "playing" ? <PauseIcon /> : <SpeakerIcon />}
                  {status === "playing" ? "Pause" : "Carry on"}
                </button>
                <button type="button" onClick={stop} className="btn-ghost min-h-[40px] px-3 py-2">
                  Stop
                </button>
              </>
            )}
            <button
              type="button"
              onClick={toggleSlow}
              aria-pressed={slow}
              className={clsx("chip min-h-[40px] px-3", slow && "chip-active")}
              title="Read more slowly"
            >
              Slower
            </button>
          </div>
        )}
      </div>
      <ul className="mt-3 space-y-1.5">
        {lines.map((line, index) => (
          <li
            key={index}
            className={clsx(
              "flex gap-2.5 rounded-[8px] px-2 py-1 text-[16px] leading-relaxed text-ink transition-colors duration-200",
              current === index && "bg-white shadow-raise",
            )}
          >
            <span className="mt-[0.6em] h-1.5 w-1.5 shrink-0 rounded-full bg-pine" aria-hidden="true" />
            <span>{line}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[12px] text-ink-faint">Written from the advert&apos;s details. Check anything important with the provider.</p>
    </section>
  );
}

function SpeakerIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M3.5 8h2.8L10 5v10l-3.7-3H3.5V8Z" strokeLinejoin="round" />
      <path d="M13 7.5a3.5 3.5 0 0 1 0 5M15.2 5.3a6.6 6.6 0 0 1 0 9.4" strokeLinecap="round" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden="true">
      <rect x="5" y="4.5" width="3.2" height="11" rx="1" />
      <rect x="11.8" y="4.5" width="3.2" height="11" rx="1" />
    </svg>
  );
}
