import Link from "next/link";

/** The one rule that stops most rental scams, shown wherever people make contact. */
export function ScamWarning({ compact = false, className = "" }: { compact?: boolean; className?: string }) {
  return (
    <p role="note" className={`rounded-[10px] border border-amber-300/60 bg-amber-50 px-3 py-2 text-[13px] leading-relaxed text-ink ${className}`}>
      <strong className="font-semibold">Stay safe:</strong> never pay a deposit or rent before you&apos;ve viewed the room and met the provider. RoomsNow never asks you to pay a provider.
      {!compact && <> Asked for money up front? <Link href="/safety" className="font-semibold text-pine-dark underline">Report it</Link>.</>}
    </p>
  );
}
