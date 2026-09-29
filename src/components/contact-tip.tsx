import { clsx } from "@/lib/clsx";

/**
 * The "leave your number" nudge shown wherever someone contacts a provider.
 * Rooms go quickly and providers usually ring round, so the people who leave
 * a number and follow up tend to be the ones who get offered a room.
 */
export function ContactTip({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <div className={clsx("flex gap-3 rounded-[12px] border border-pine/25 bg-pine-light/50 p-3", className)}>
      <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-pine text-white">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 4h3.5l1.5 4-2 1.5a11 11 0 0 0 6.5 6.5l1.5-2 4 1.5V19a1.5 1.5 0 0 1-1.6 1.5A16 16 0 0 1 3.5 5.6 1.5 1.5 0 0 1 5 4Z" />
        </svg>
      </span>
      <div className="min-w-0 text-[13.5px] leading-snug">
        <p className="font-semibold text-pine-dark">Leave your number for a better chance</p>
        <p className="mt-0.5 text-ink-soft">
          {compact
            ? "Providers often ring round when a room comes up. Share your number and follow up with a call."
            : "Rooms go quickly and providers often ring round when one comes up. Put your phone number in your message, say when you can talk, and give them a call too if you haven't heard back within a day."}
        </p>
      </div>
    </div>
  );
}
