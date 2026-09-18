import Link from "next/link";
import type { VerificationStatus } from "@prisma/client";
import { clsx } from "@/lib/clsx";

/**
 * The provider dashboard's nudge to get verified. Tone escalates the longer
 * an account has gone unverified, but this never blocks or hides anything —
 * it's persuasion, not enforcement. If a hard requirement (e.g. delisting
 * unverified adverts after some period) is wanted later, that's a separate,
 * more consequential decision worth making deliberately.
 *
 * The caller only renders this when status !== "APPROVED", but `status`
 * accepts the full enum (rather than a narrowed union) so no assumption
 * about caller-side narrowing is baked into the type.
 */
export function VerificationBanner({
  status,
  daysSinceSignup,
  reviewNote,
}: {
  status: VerificationStatus;
  daysSinceSignup: number;
  reviewNote?: string | null;
}) {
  if (status === "APPROVED") return null;

  if (status === "PENDING") {
    return (
      <div className="card mb-6 flex flex-wrap items-center justify-between gap-4 border-pine/25 bg-pine-light/30 p-5">
        <div>
          <h2 className="text-[18px]">Verification in progress</h2>
          <p className="mt-1 max-w-[60ch] text-[14px] text-ink-soft">
            Thanks for submitting your documents. Our team checks these manually, so it can take a
            few working days — we&apos;ll email you as soon as there&apos;s a decision.
          </p>
        </div>
        <Link href="/provider/settings" className="btn-secondary shrink-0">View status</Link>
      </div>
    );
  }

  if (status === "REJECTED") {
    return (
      <div className="card mb-6 flex flex-wrap items-center justify-between gap-4 border-clay/30 bg-clay-light/40 p-5">
        <div>
          <h2 className="text-[18px]">Verification needs another look</h2>
          <p className="mt-1 max-w-[60ch] text-[14px] text-ink-soft">
            {reviewNote || "Your last verification submission wasn't approved. Review your details and resubmit when you're ready."}
          </p>
        </div>
        <Link href="/provider/settings" className="btn-secondary shrink-0">Resubmit verification</Link>
      </div>
    );
  }

  const overdue = daysSinceSignup >= 90;

  return (
    <div
      className={clsx(
        "card mb-6 flex flex-wrap items-center justify-between gap-4 p-5",
        overdue && "border-clay/35 bg-clay-light/40",
      )}
    >
      <div>
        <h2 className="text-[18px]">
          {overdue ? "Still not verified after 90+ days — get seen" : "Get verified to win more leads"}
        </h2>
        <p className="mt-1 max-w-[60ch] text-[14px] text-ink-soft">
          {overdue
            ? "You've been advertising on RoomsNow for a while now. Verified providers get a badge that stands out in search, appear in the “verified only” filter, and build more trust with the people and referrers browsing your adverts — verifying now means you stop missing out on that extra visibility."
            : "Verified providers get a badge that stands out in search results, appear in the “verified only” filter, and build more trust with the people and referrers browsing your adverts — which means more enquiries. Our team checks your documents manually, and most reviews are quick."}
        </p>
      </div>
      <Link href="/provider/settings" className="btn-secondary shrink-0">Start verification</Link>
    </div>
  );
}
