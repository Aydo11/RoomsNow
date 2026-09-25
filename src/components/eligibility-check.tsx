"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { clsx } from "@/lib/clsx";
import { SUPPORT_TYPES } from "@/lib/taxonomy";
import {
  EMPTY_ANSWERS,
  MAX_AGE,
  MIN_AGE,
  eligibilityQuery,
  parseAge,
  type EligibilityAnswers,
} from "@/lib/eligibility";
import { countEligibleAction } from "@/server/actions/eligibility";
import { RoomAlertSignup } from "./room-alert-signup";

const STORE_KEY = "roomsnow:eligibility";
const STEPS = 5;
const QUICK_PLACES = ["Birmingham", "Wolverhampton", "Coventry", "Manchester", "London"];

/**
 * "Am I eligible?": five short questions, one per screen, big tap targets,
 * plain words. A running count shows how many live rooms still fit, and the
 * end screen sends people to those rooms in Tour mode or as a list.
 */
export function EligibilityCheck({ smsEnabled = false }: { smsEnabled?: boolean }) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [answers, setAnswers] = useState<EligibilityAnswers>(EMPTY_ANSWERS);
  // null while the first count loads; "unknown" if counting isn't available right now.
  const [count, setCount] = useState<number | "unknown" | null>(null);
  const [counting, setCounting] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const restored = useRef(false);

  // Answers survive going to the results and coming back, in this tab only.
  useEffect(() => {
    try {
      const saved = window.sessionStorage.getItem(STORE_KEY);
      if (saved) setAnswers({ ...EMPTY_ANSWERS, ...(JSON.parse(saved) as Partial<EligibilityAnswers>) });
    } catch {
      // Starts fresh.
    }
    restored.current = true;
  }, []);

  useEffect(() => {
    if (!restored.current) return;
    try {
      window.sessionStorage.setItem(STORE_KEY, JSON.stringify(answers));
    } catch {
      // Not remembered; that's fine.
    }
  }, [answers]);

  const query = eligibilityQuery(answers);

  useEffect(() => {
    let cancelled = false;
    setCounting(true);
    const timer = window.setTimeout(async () => {
      const result = await countEligibleAction(query.replace(/^\?/, "")).catch(() => null);
      if (!cancelled) {
        setCount(result ?? "unknown");
        setCounting(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query]);

  // Move focus to each new question so screen readers announce it.
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, [step]);

  function go(next: number) {
    setDirection(next > step ? 1 : -1);
    setStep(Math.max(0, Math.min(STEPS, next)));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function update(patch: Partial<EligibilityAnswers>) {
    setAnswers((current) => ({ ...current, ...patch }));
  }

  /** Single-choice answers move on by themselves after a beat. */
  function chooseAndAdvance(patch: Partial<EligibilityAnswers>) {
    update(patch);
    window.setTimeout(() => go(step + 1), 220);
  }

  function toggleSupport(slug: string) {
    setAnswers((current) => {
      if (slug === "none") return { ...current, support: current.support.includes("none") ? [] : ["none"] };
      const without = current.support.filter((item) => item !== "none" && item !== slug);
      return { ...current, support: current.support.includes(slug) ? without : [...without, slug] };
    });
  }

  function startAgain() {
    setAnswers(EMPTY_ANSWERS);
    go(0);
  }

  const age = parseAge(answers.age);
  const ageInvalid = answers.age.trim() !== "" && age === null;

  return (
    <div className="mx-auto w-full max-w-[560px]">
      <style>{CHECK_CSS}</style>

      {step < STEPS && (
        <div className="mb-5">
          <div className="flex items-center justify-between gap-3 text-[13px] font-medium text-ink-soft">
            <span>
              Question {step + 1} of {STEPS}
            </span>
            <CountPill count={count} counting={counting} />
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-pill bg-paper-sunk" aria-hidden="true">
            <div className="h-full rounded-pill bg-pine transition-[width] duration-500 ease-out" style={{ width: `${((step + 1) / STEPS) * 100}%` }} />
          </div>
        </div>
      )}

      <div key={step} className={clsx("check-step card p-5 sm:p-7", direction === 1 ? "check-in-right" : "check-in-left")}>
        {step === 0 && (
          <Question headingRef={headingRef} title="Where do you want to live?" hint="Type a town, city or postcode.">
            <label className="sr-only" htmlFor="check-where">
              Town, city or postcode
            </label>
            <input
              id="check-where"
              className="field text-[17px]"
              placeholder="e.g. Birmingham or B21"
              autoComplete="address-level2"
              value={answers.where}
              onChange={(event) => update({ where: event.target.value })}
              onKeyDown={(event) => {
                if (event.key === "Enter") go(1);
              }}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {QUICK_PLACES.map((place) => (
                <button
                  key={place}
                  type="button"
                  onClick={() => update({ where: place })}
                  className={clsx("chip min-h-[40px] px-3.5 text-[14px]", answers.where === place && "chip-active")}
                  aria-pressed={answers.where === place}
                >
                  {place}
                </button>
              ))}
            </div>
            <Nav
              onNext={() => go(1)}
              nextLabel={answers.where.trim() ? "Next" : "Skip: anywhere in the UK"}
              secondary={null}
            />
          </Question>
        )}

        {step === 1 && (
          <Question headingRef={headingRef} title="Tell us a little about you" hint="Some homes are for certain ages, or for women or men only.">
            <label className="label text-[15px] text-ink" htmlFor="check-age">
              How old are you?
            </label>
            <input
              id="check-age"
              className={clsx("field w-32 text-[17px]", ageInvalid && "field-error")}
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={2}
              placeholder="Age"
              value={answers.age}
              onChange={(event) => update({ age: event.target.value.replace(/\D/g, "").slice(0, 2) })}
              aria-describedby={ageInvalid ? "check-age-error" : undefined}
              aria-invalid={ageInvalid}
            />
            {ageInvalid && (
              <p id="check-age-error" className="mt-1.5 text-[13px] text-clay">
                Enter an age from {MIN_AGE} to {MAX_AGE}, or leave it blank.
              </p>
            )}

            <p className="label mt-5 text-[15px] text-ink" id="check-resident-label">
              Is the room for…
            </p>
            <div className="grid gap-2 sm:grid-cols-3" role="group" aria-labelledby="check-resident-label">
              <Choice selected={answers.resident === "woman"} onClick={() => update({ resident: "woman" })}>
                A woman
              </Choice>
              <Choice selected={answers.resident === "man"} onClick={() => update({ resident: "man" })}>
                A man
              </Choice>
              <Choice selected={answers.resident === "skip"} onClick={() => update({ resident: "skip" })}>
                I&apos;d rather not say
              </Choice>
            </div>
            <Nav onBack={() => go(0)} onNext={() => go(2)} nextDisabled={ageInvalid} />
          </Question>
        )}

        {step === 2 && (
          <Question headingRef={headingRef} title="What help do you need?" hint="Pick all that fit. This helps us show homes with the right support.">
            <div className="grid gap-2 sm:grid-cols-2">
              {SUPPORT_TYPES.filter((type) => type.slug !== "other").map((type) => (
                <Choice key={type.slug} selected={answers.support.includes(type.slug)} onClick={() => toggleSupport(type.slug)} multi>
                  {type.label}
                </Choice>
              ))}
              <Choice selected={answers.support.includes("none")} onClick={() => toggleSupport("none")} multi>
                None of these / not sure
              </Choice>
            </div>

            <p className="label mt-5 text-[15px] text-ink">Anything else?</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <Choice selected={answers.stepFree} onClick={() => update({ stepFree: !answers.stepFree })} multi>
                I need step-free access
              </Choice>
              <Choice selected={answers.pets} onClick={() => update({ pets: !answers.pets })} multi>
                I have a pet
              </Choice>
            </div>
            <Nav onBack={() => go(1)} onNext={() => go(3)} />
          </Question>
        )}

        {step === 3 && (
          <Question headingRef={headingRef} title="How will you pay the rent?" hint="Most supported housing is paid for with Housing Benefit.">
            <div className="grid gap-2">
              <Choice selected={answers.rent === "hb"} onClick={() => chooseAndAdvance({ rent: "hb" })} large>
                Housing Benefit or Universal Credit
              </Choice>
              <Choice selected={answers.rent === "self"} onClick={() => chooseAndAdvance({ rent: "self" })} large>
                I&apos;ll pay it myself
              </Choice>
              <Choice selected={answers.rent === "unsure"} onClick={() => chooseAndAdvance({ rent: "unsure" })} large>
                I&apos;m not sure yet
              </Choice>
            </div>
            <Nav onBack={() => go(2)} onNext={() => go(4)} nextLabel={answers.rent ? "Next" : "Skip"} />
          </Question>
        )}

        {step === 4 && (
          <Question headingRef={headingRef} title="Is someone helping you find a home?" hint="Like a support worker, the council or a charity. Some homes only take people referred by a professional.">
            <div className="grid gap-2">
              <Choice selected={answers.helper === "yes"} onClick={() => chooseAndAdvance({ helper: "yes" })} large>
                Yes, someone is helping me
              </Choice>
              <Choice selected={answers.helper === "no"} onClick={() => chooseAndAdvance({ helper: "no" })} large>
                No, I&apos;m looking on my own
              </Choice>
            </div>
            <Nav onBack={() => go(3)} onNext={() => go(5)} nextLabel={answers.helper ? "See my rooms" : "Skip"} />
          </Question>
        )}

        {step === STEPS && (
          <Result
            headingRef={headingRef}
            count={count}
            counting={counting}
            query={query}
            answers={answers}
            onEdit={() => go(0)}
            onStartAgain={startAgain}
            onWiden={(patch) => update(patch)}
            smsEnabled={smsEnabled}
          />
        )}
      </div>

      <p className="mt-5 text-center text-[13px] leading-relaxed text-ink-faint">
        This is a guide, not a decision. Each provider checks the details with you. Your answers aren&apos;t saved or shared.
      </p>
    </div>
  );
}

function Question({
  headingRef,
  title,
  hint,
  children,
}: {
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  title: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <div>
      <h2 ref={headingRef} tabIndex={-1} className="text-[24px] font-bold leading-tight text-ink outline-none sm:text-[26px]">
        {title}
      </h2>
      <p className="mt-1.5 text-[15px] leading-relaxed text-ink-soft">{hint}</p>
      <div className="mt-5">{children}</div>
    </div>
  );
}

function Choice({
  selected,
  onClick,
  multi,
  large,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  multi?: boolean;
  large?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={clsx(
        "flex w-full items-center gap-3 rounded-[12px] border px-4 text-left text-[15px] font-medium transition duration-200 active:scale-[0.98]",
        large ? "min-h-[58px] text-[16px]" : "min-h-[50px]",
        selected ? "border-pine bg-pine-light text-pine-dark ring-1 ring-pine" : "border-line bg-white text-ink hover:border-pine/40 hover:bg-pine-light/40",
      )}
    >
      <span
        className={clsx(
          "grid h-5 w-5 shrink-0 place-items-center border-2 transition",
          multi ? "rounded-[6px]" : "rounded-full",
          selected ? "border-pine bg-pine text-white" : "border-line-strong bg-white",
        )}
        aria-hidden="true"
      >
        {selected && (
          <svg viewBox="0 0 16 16" className="check-tick h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.6">
            <path d="m3.5 8.5 3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <span>{children}</span>
    </button>
  );
}

function Nav({
  onBack,
  onNext,
  nextLabel = "Next",
  nextDisabled,
  secondary,
}: {
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  secondary?: ReactNode;
}) {
  return (
    <div className="mt-7 flex items-center justify-between gap-3">
      {onBack ? (
        <button type="button" onClick={onBack} className="btn-ghost -ml-2 px-3">
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="m12 5-5 5 5 5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back
        </button>
      ) : (
        secondary ?? <span />
      )}
      <button type="button" onClick={onNext} disabled={nextDisabled} className="btn-primary min-w-[120px]">
        {nextLabel}
      </button>
    </div>
  );
}

function CountPill({ count, counting }: { count: number | "unknown" | null; counting: boolean }) {
  if (count === null || count === "unknown") return null;
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-pill bg-pine-light px-2.5 py-1 text-[12px] font-semibold text-pine-dark transition-opacity",
        counting && "opacity-60",
      )}
      aria-live="polite"
    >
      <span key={count} className="check-count tabular-nums">
        {count.toLocaleString("en-GB")}
      </span>
      {count === 1 ? "room fits" : "rooms fit"} so far
    </span>
  );
}

function Result({
  headingRef,
  count,
  counting,
  query,
  answers,
  onEdit,
  onStartAgain,
  onWiden,
  smsEnabled,
}: {
  smsEnabled: boolean;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  count: number | "unknown" | null;
  counting: boolean;
  query: string;
  answers: EligibilityAnswers;
  onEdit: () => void;
  onStartAgain: () => void;
  onWiden: (patch: Partial<EligibilityAnswers>) => void;
}) {
  const none = count === 0;
  const realSupport = answers.support.filter((slug) => slug !== "none");
  return (
    <div className="text-center">
      <span className={clsx("mx-auto grid h-16 w-16 place-items-center rounded-full", none ? "bg-paper-sunk text-ink-soft" : "bg-pine-light text-pine-dark")}>
        {none ? (
          <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <circle cx="11" cy="11" r="6.5" />
            <path d="m16 16 4 4" strokeLinecap="round" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="check-tick h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
            <path d="m5 12.5 4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <h2 ref={headingRef} tabIndex={-1} className="mt-4 text-[26px] font-bold leading-tight text-ink outline-none sm:text-[30px]">
        {count === null || (counting && typeof count !== "number")
          ? "Finding your rooms…"
          : count === "unknown"
            ? "Your rooms are ready"
            : none
              ? "No rooms fit all your answers right now"
              : `${count.toLocaleString("en-GB")} ${count === 1 ? "room fits" : "rooms fit"} you`}
      </h2>
      <p className="mx-auto mt-2 max-w-[42ch] text-[15px] leading-relaxed text-ink-soft">
        {none
          ? "New rooms are added all the time. Try one of these, or set up an alert and we'll tell you when one comes up."
          : "These are live rooms that match what you told us. Swipe through them, or see them as a list."}
      </p>

      {none ? (
        <div className="mt-6 flex flex-col gap-2.5">
          {answers.where.trim() && (
            <button type="button" className="btn-primary" onClick={() => onWiden({ where: "" })}>
              Look anywhere in the UK
            </button>
          )}
          {realSupport.length > 0 && (
            <button type="button" className="btn-secondary" onClick={() => onWiden({ support: [] })}>
              Show homes with any kind of support
            </button>
          )}
          <RoomAlertSignup compact className="mt-2 text-left" where={answers.where} support={realSupport} smsEnabled={smsEnabled} />
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
          <Link href={`/search/tour${query}`} className="btn-primary">
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <rect x="5.5" y="2.5" width="9" height="15" rx="2" />
              <path d="m9 8 3 2-3 2V8Z" fill="currentColor" stroke="none" />
            </svg>
            Swipe through them
          </Link>
          <Link href={`/search${query}`} className="btn-secondary">
            See them as a list
          </Link>
        </div>
      )}

      <div className="mt-5 flex justify-center gap-1 text-[14px]">
        <button type="button" onClick={onEdit} className="btn-ghost px-3">
          Change my answers
        </button>
        <button type="button" onClick={onStartAgain} className="btn-ghost px-3">
          Start again
        </button>
      </div>
    </div>
  );
}

const CHECK_CSS = `
@media (prefers-reduced-motion: no-preference) {
  .check-in-right { animation: check-in-right 380ms cubic-bezier(0.16, 1, 0.3, 1) both; }
  .check-in-left { animation: check-in-left 380ms cubic-bezier(0.16, 1, 0.3, 1) both; }
  .check-count { display: inline-block; animation: check-count 320ms ease both; }
  .check-tick { animation: check-tick 260ms cubic-bezier(0.2, 1.6, 0.4, 1) both; }
}
@keyframes check-in-right { from { opacity: 0; transform: translateX(28px); } to { opacity: 1; transform: none; } }
@keyframes check-in-left { from { opacity: 0; transform: translateX(-28px); } to { opacity: 1; transform: none; } }
@keyframes check-count { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
@keyframes check-tick { from { transform: scale(0.4); } to { transform: scale(1); } }
`;
