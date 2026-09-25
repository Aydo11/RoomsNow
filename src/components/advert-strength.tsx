import Link from "next/link";
import { clsx } from "@/lib/clsx";
import type { AdvertStrength } from "@/lib/advert-strength";

const BAND = {
  "needs-work": { label: "Needs work", bar: "bg-clay", chip: "bg-clay-light text-clay" },
  good: { label: "Good", bar: "bg-pine/70", chip: "bg-pine-light text-pine-dark" },
  excellent: { label: "Excellent", bar: "bg-pine", chip: "bg-pine text-white" },
} as const;

/** The full card on a provider's advert page: score, bar, next steps and every check. */
export function AdvertStrengthCard({ strength }: { strength: AdvertStrength }) {
  const band = BAND[strength.band];
  const next = strength.todo.slice(0, 3);
  return (
    <section aria-labelledby="advert-strength-heading" className="card mt-4 overflow-hidden">
      <div className="p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="advert-strength-heading" className="text-[13px] font-semibold uppercase tracking-[0.08em] text-ink-faint">
              Advert strength
            </h2>
            <p className="mt-1 flex items-baseline gap-3">
              <span className="font-display text-[34px] font-bold leading-none tabular-nums text-ink">{strength.score}%</span>
              <span className={clsx("rounded-pill px-2.5 py-1 text-[12px] font-semibold", band.chip)}>{band.label}</span>
            </p>
          </div>
          {strength.score < 100 && (
            <p className="max-w-[36ch] text-[13px] leading-relaxed text-ink-soft">
              Complete adverts are easier for referrers to trust and match. Each step below shows how much it adds.
            </p>
          )}
        </div>

        <div
          className="mt-4 h-2.5 overflow-hidden rounded-pill bg-paper-sunk"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={strength.score}
          aria-label={`Advert strength ${strength.score}%`}
        >
          <div className={clsx("h-full rounded-pill transition-[width] duration-700", band.bar)} style={{ width: `${Math.max(strength.score, 3)}%` }} />
        </div>

        {next.length > 0 ? (
          <ul className="mt-5 grid gap-2.5 md:grid-cols-3">
            {next.map((check) => (
              <li key={check.key}>
                <Link
                  href={check.href}
                  className="group flex h-full flex-col rounded-[12px] border border-line bg-paper-sunk/50 p-4 transition-colors hover:border-pine/50 hover:bg-pine-light/40"
                >
                  <span className="flex items-start justify-between gap-2">
                    <span className="text-[14px] font-semibold text-ink group-hover:text-pine-dark">{check.label}</span>
                    <span className="shrink-0 rounded-pill bg-pine-light px-2 py-0.5 text-[12px] font-semibold tabular-nums text-pine-dark">
                      +{check.points - check.earned}%
                    </span>
                  </span>
                  <span className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">{check.why}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-[14px] text-pine-dark">
            Everything&apos;s in place. This advert has all the details referrers look for.
          </p>
        )}
      </div>

      <details className="group border-t border-line">
        <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden px-5 py-3 text-[13px] font-medium text-ink-soft hover:text-ink sm:px-6">
          <span className="group-open:hidden">See every check</span>
          <span className="hidden group-open:inline">Hide checks</span>
        </summary>
        <ul className="divide-y divide-line border-t border-line">
          {strength.checks.map((check) => {
            const done = check.earned >= check.points;
            return (
              <li key={check.key} className="flex items-center gap-3 px-5 py-2.5 text-[14px] sm:px-6">
                <span
                  aria-hidden="true"
                  className={clsx(
                    "grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-bold",
                    done ? "bg-pine text-white" : check.earned > 0 ? "bg-pine-light text-pine-dark" : "bg-paper-sunk text-ink-faint",
                  )}
                >
                  {done ? "✓" : ""}
                </span>
                <span className={clsx("min-w-0 flex-1", done ? "text-ink-soft" : "text-ink")}>
                  {done ? DONE_LABEL[check.key] ?? check.label : check.label}
                </span>
                <span className="shrink-0 text-[12px] tabular-nums text-ink-faint">
                  {check.earned}/{check.points}
                </span>
              </li>
            );
          })}
        </ul>
      </details>
    </section>
  );
}

/** Past-tense labels for finished checks, so the list reads as progress. */
const DONE_LABEL: Record<string, string> = {
  photos: "Photos added",
  video: "Video tour added",
  description: "Property described",
  summary: "Summary added",
  rent: "Weekly rent added",
  availability: "Available-from date added",
  ages: "Age range set",
  accessibility: "Accessibility details added",
  support: "Support described",
  referrals: "Referral process explained",
  rules: "House rules added",
};

/** A compact bar for lists of adverts. */
export function AdvertStrengthBar({ strength }: { strength: AdvertStrength }) {
  const band = BAND[strength.band];
  return (
    <span className="inline-flex items-center gap-2" title={`Advert strength: ${strength.score}% (${band.label})`}>
      <span className="h-1.5 w-16 overflow-hidden rounded-pill bg-paper-sunk" aria-hidden="true">
        <span className={clsx("block h-full rounded-pill", band.bar)} style={{ width: `${Math.max(strength.score, 4)}%` }} />
      </span>
      <span className="text-[12px] tabular-nums text-ink-faint">{strength.score}% strength</span>
    </span>
  );
}
