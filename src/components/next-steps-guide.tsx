"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { clsx } from "@/lib/clsx";
import { NEXT_STEPS, SUMMARY_LANGUAGES, type NextStepId } from "@/lib/next-steps";
import type { SummaryLanguage } from "@/lib/plain-summary-i18n";

const LANG_KEY = "roomsnow:summary-lang";

/**
 * The "What happens next" steps, in the same six languages as the advert
 * summaries, with the step the person has reached marked. Each step can be
 * read out loud with the device's own voice (nothing is sent anywhere).
 */
export function NextStepsGuide({ current = null, compact = false }: { current?: NextStepId | null; compact?: boolean }) {
  const [lang, setLang] = useState<SummaryLanguage>("en");
  const [supported, setSupported] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [speaking, setSpeaking] = useState<string | null>(null);
  const run = useRef(0);

  const text = NEXT_STEPS[lang];
  const meta = SUMMARY_LANGUAGES.find((item) => item.code === lang) ?? SUMMARY_LANGUAGES[0];

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(LANG_KEY) as SummaryLanguage | null;
      if (saved && saved in NEXT_STEPS) setLang(saved);
    } catch {
      // English it is.
    }
    const ok = "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
    setSupported(ok);
    if (!ok) return;
    const load = () => setVoices(window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.addEventListener?.("voiceschanged", load);
    return () => window.speechSynthesis.removeEventListener?.("voiceschanged", load);
  }, []);

  const stop = useCallback(() => {
    run.current += 1;
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    setSpeaking(null);
  }, []);

  useEffect(() => {
    const onHide = () => stop();
    window.addEventListener("pagehide", onHide);
    return () => {
      window.removeEventListener("pagehide", onHide);
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, [stop]);

  const prefix = meta.speech.split("-")[0].toLowerCase();
  const matching = voices.filter((v) => v.lang.toLowerCase().replace("_", "-").startsWith(prefix));
  const voice =
    (lang === "en" ? matching.find((v) => v.lang === "en-GB") : matching.find((v) => /natural|google|premium|enhanced/i.test(v.name))) ??
    matching[0] ??
    null;
  const canListen = supported && (lang === "en" || Boolean(voice));

  function speak(key: string, lines: string[]) {
    const synth = window.speechSynthesis;
    synth.cancel();
    const id = ++run.current;
    lines.forEach((line, index) => {
      const utterance = new SpeechSynthesisUtterance(line);
      utterance.lang = voice?.lang ?? meta.speech;
      if (voice) utterance.voice = voice;
      utterance.rate = 0.95;
      const finish = () => {
        if (run.current === id && index === lines.length - 1) setSpeaking(null);
      };
      utterance.onend = finish;
      utterance.onerror = finish;
      synth.speak(utterance);
    });
    setSpeaking(key);
  }

  function chooseLanguage(code: SummaryLanguage) {
    stop();
    setLang(code);
    try {
      window.localStorage.setItem(LANG_KEY, code);
    } catch {
      // Not remembered.
    }
  }

  const currentIndex = current ? text.steps.findIndex((step) => step.id === current) : -1;

  return (
    <section aria-labelledby="next-steps-heading">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div lang={lang} dir={meta.dir}>
          <h2 id="next-steps-heading" className={clsx("font-bold text-ink", compact ? "text-[19px]" : "text-[26px]")}>
            {text.heading}
          </h2>
          <p className="mt-1 text-[15px] text-ink-soft">{text.intro}</p>
        </div>
        {canListen &&
          (speaking === "all" ? (
            <button type="button" onClick={stop} className="btn-secondary min-h-[40px] py-2">
              Stop
            </button>
          ) : (
            <button
              type="button"
              onClick={() => speak("all", [text.heading, ...text.steps.flatMap((step) => [step.title, ...step.points])])}
              className="btn-primary min-h-[40px] py-2"
            >
              <SpeakerIcon />
              Listen to all
            </button>
          ))}
      </div>

      <div className="-mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1 pb-1" role="group" aria-label="Language">
        {SUMMARY_LANGUAGES.map((item) => (
          <button
            key={item.code}
            type="button"
            lang={item.code}
            onClick={() => chooseLanguage(item.code)}
            aria-pressed={lang === item.code}
            className={clsx("chip shrink-0 px-3", lang === item.code && "chip-active")}
          >
            {item.label}
          </button>
        ))}
      </div>

      <ol className="mt-4 space-y-3" lang={lang} dir={meta.dir}>
        {text.steps.map((step, index) => {
          const here = index === currentIndex;
          const done = currentIndex > -1 && index < currentIndex && step.id !== "problems";
          return (
            <li
              key={step.id}
              id={`step-${step.id}`}
              className={clsx(
                "scroll-mt-24 rounded-card border bg-white p-4 sm:p-5",
                here ? "border-pine shadow-raise ring-1 ring-pine/30" : "border-line",
              )}
            >
              <div className="flex items-start gap-3">
                <span
                  className={clsx(
                    "grid h-8 w-8 shrink-0 place-items-center rounded-full text-[14px] font-bold tabular-nums",
                    here ? "bg-pine text-white" : done ? "bg-pine-light text-pine-dark" : "bg-paper-sunk text-ink-soft",
                  )}
                  aria-hidden="true"
                >
                  {done ? "✓" : index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-[17px] font-semibold leading-snug text-ink">{step.title}</h3>
                    <div className="flex items-center gap-2">
                      {here && <span className="chip chip-active px-2.5 py-0.5 text-[12px]">{text.youAreHere}</span>}
                      {canListen && (
                        <button
                          type="button"
                          onClick={() => (speaking === step.id ? stop() : speak(step.id, [step.title, ...step.points]))}
                          className="btn-ghost min-h-[36px] px-2.5 py-1 text-[13px]"
                          aria-label={speaking === step.id ? "Stop reading" : `Listen: ${step.title}`}
                        >
                          <SpeakerIcon />
                          {speaking === step.id ? "Stop" : "Listen"}
                        </button>
                      )}
                    </div>
                  </div>
                  <ul className={clsx("mt-2 space-y-1.5 text-[15.5px] leading-relaxed text-ink-soft", meta.dir === "rtl" && "text-[16.5px] leading-loose")}>
                    {step.points.map((point) => (
                      <li key={point} className="flex gap-2.5">
                        <span className="mt-[0.65em] h-1.5 w-1.5 shrink-0 rounded-full bg-pine" aria-hidden="true" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      {supported && !canListen && (
        <p className="mt-3 text-[13px] text-ink-soft">
          This phone doesn&apos;t have a voice for {meta.label} yet. You can add one in your phone&apos;s language or text-to-speech settings.
        </p>
      )}
      <p className="mt-4 text-[12.5px] leading-relaxed text-ink-faint">
        General guidance, not legal advice. Rules can differ between councils and providers. Your provider or support worker can tell you what applies to you.
      </p>
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
