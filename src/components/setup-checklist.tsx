import Link from "next/link";
import { clsx } from "@/lib/clsx";
import { hideSetupChecklistAction } from "@/server/actions/setup-checklist";

export type SetupStep = {
  key: string;
  label: string;
  /** One line on why it matters, shown for the next step. */
  why: string;
  href: string;
  cta: string;
  done: boolean;
  /** e.g. "Waiting on our review" — shown instead of the button. */
  waiting?: string;
  optional?: boolean;
};

/**
 * "Get set up" progress card for new providers and trades. The next step
 * to do is expanded with a button; finished steps tick off. Hidden once
 * every required step is done, or when the person chooses to hide it.
 */
export function SetupChecklist({ steps, audience, title = "Get set up" }: { steps: SetupStep[]; audience: "provider" | "service"; title?: string }) {
  const required = steps.filter((step) => !step.optional);
  const doneCount = steps.filter((step) => step.done).length;
  const percent = Math.round((doneCount / steps.length) * 100);
  const next = steps.find((step) => !step.done && !step.waiting) ?? steps.find((step) => !step.done);
  // Done once every required step is ticked and nothing optional is left to start.
  if (required.every((step) => step.done) && steps.every((step) => step.done || step.waiting)) return null;

  const circumference = 2 * Math.PI * 22;
  return (
    <section aria-labelledby="setup-heading" className="setup-card card mb-6 overflow-hidden">
      <div className="flex flex-wrap items-center gap-4 border-b border-line bg-gradient-to-r from-pine-light/70 via-pine-light/30 to-transparent px-5 py-4">
        <div className="relative h-14 w-14 shrink-0" aria-hidden="true">
          <svg viewBox="0 0 52 52" className="h-14 w-14 -rotate-90">
            <circle cx="26" cy="26" r="22" fill="none" stroke="rgb(var(--color-line))" strokeWidth="5" />
            <circle
              cx="26" cy="26" r="22" fill="none" stroke="rgb(var(--color-pine))" strokeWidth="5" strokeLinecap="round"
              className="setup-ring"
              style={{ strokeDasharray: circumference, strokeDashoffset: circumference * (1 - percent / 100), ["--ring-from" as string]: circumference }}
            />
          </svg>
          <span className="absolute inset-0 grid place-items-center font-display text-[14px] font-bold text-pine-dark">{percent}%</span>
        </div>
        <div className="min-w-0 flex-1">
          <h2 id="setup-heading" className="text-[18px]">{title}</h2>
          <p className="text-[14px] text-ink-soft">
            {doneCount} of {steps.length} done
            {next ? <> · Next: <span className="font-medium text-ink">{next.label}</span></> : null}
          </p>
        </div>
        <form action={hideSetupChecklistAction}>
          <input type="hidden" name="audience" value={audience} />
          <button type="submit" className="text-[13px] font-medium text-ink-soft hover:text-ink hover:underline">Hide</button>
        </form>
      </div>

      <ol className="divide-y divide-line">
        {steps.map((step, index) => {
          const isNext = step === next;
          return (
            <li key={step.key} className={clsx("flex items-start gap-3 px-5 py-3.5", isNext && "bg-paper-sunk/40")}>
              <span
                aria-hidden="true"
                className={clsx(
                  "mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full text-[12px] font-semibold",
                  step.done ? "setup-tick bg-pine text-white" : isNext ? "setup-next border-2 border-pine text-pine-dark" : "border border-line-strong text-ink-faint",
                )}
                style={step.done ? { animationDelay: `${index * 90}ms` } : undefined}
              >
                {step.done ? (
                  <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m5 10.5 3.2 3.2L15 7" /></svg>
                ) : index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className={clsx("text-[15px]", step.done ? "text-ink-soft line-through decoration-ink-faint/40" : "font-medium text-ink")}>
                  {step.label}
                  {step.optional && <span className="ml-2 rounded-pill bg-paper-sunk px-2 py-0.5 align-middle text-[11px] font-medium text-ink-soft no-underline">Optional</span>}
                  <span className="sr-only">{step.done ? " (done)" : step.waiting ? ` (${step.waiting})` : " (to do)"}</span>
                </p>
                {isNext && !step.done && <p className="mt-0.5 max-w-[60ch] text-[13.5px] leading-relaxed text-ink-soft">{step.why}</p>}
                {!step.done && step.waiting && <p className="mt-0.5 text-[13px] text-clay">{step.waiting}</p>}
              </div>
              {!step.done && !step.waiting && (
                <Link href={step.href} className={clsx("shrink-0 whitespace-nowrap", isNext ? "btn-primary min-h-9 px-3.5 py-1.5 text-[14px]" : "text-[13.5px] font-medium text-pine-dark hover:underline")}>
                  {step.cta}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
