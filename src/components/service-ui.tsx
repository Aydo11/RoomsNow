import Link from "next/link";
import { clsx } from "@/lib/clsx";
import { shortDate } from "@/lib/format";
import { QUOTE_STATUS_LABELS, type InsuranceState, type ServiceQuoteStatusValue } from "@/lib/service-marketplace";

const tones = {
  good: "bg-pine-light text-pine-dark",
  warn: "bg-clay-light text-clay",
  info: "bg-brand/10 text-brand",
  muted: "bg-paper-sunk text-ink-soft",
} as const;

function Pill({ label, tone }: { label: string; tone: keyof typeof tones }) {
  return <span className={clsx("inline-flex shrink-0 items-center rounded-pill px-2.5 py-1 text-[12px] font-medium", tones[tone])}>{label}</span>;
}

const BUSINESS: Record<string, [string, keyof typeof tones]> = {
  ONBOARDING: ["Setting up", "muted"],
  PENDING_REVIEW: ["Being checked", "info"],
  CHANGES_REQUESTED: ["Changes needed", "warn"],
  APPROVED: ["Approved", "good"],
  REJECTED: ["Not approved", "warn"],
  SUSPENDED: ["Suspended", "warn"],
};
export function BusinessStatusPill({ status }: { status: string }) {
  const [label, tone] = BUSINESS[status] ?? [status, "muted"];
  return <Pill label={label} tone={tone} />;
}

const ADVERT: Record<string, [string, keyof typeof tones]> = {
  DRAFT: ["Draft", "muted"],
  PENDING_REVIEW: ["Awaiting review", "info"],
  ACTIVE: ["Live", "good"],
  PAUSED: ["Paused", "muted"],
  REJECTED: ["Needs changes", "warn"],
  ARCHIVED: ["Archived", "muted"],
};
export function AdvertStatusPill({ status }: { status: string }) {
  const [label, tone] = ADVERT[status] ?? [status, "muted"];
  return <Pill label={label} tone={tone} />;
}

export function QuoteStatusPill({ status }: { status: ServiceQuoteStatusValue }) {
  const tone: keyof typeof tones = status === "NEW" ? "info" : status === "QUOTED" || status === "ACCEPTED" || status === "COMPLETED" ? "good" : status === "VIEWED" ? "muted" : "warn";
  return <Pill label={QUOTE_STATUS_LABELS[status]} tone={tone} />;
}

export function ServiceVerifiedBadge({ compact = false }: { compact?: boolean }) {
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 rounded-pill bg-pine-light px-2.5 py-1 text-[12px] font-medium text-pine-dark"
      title="RoomsNow has checked this business's incorporation and in-date public liability insurance. It isn't a guarantee of work."
    >
      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true" fill="currentColor">
        <path d="M8 0 9.9 1.4l2.3-.2.7 2.2 1.9 1.3-.9 2.2.9 2.2-1.9 1.3-.7 2.2-2.3-.2L8 14l-1.9-1.4-2.3.2-.7-2.2L1.2 9.3l.9-2.2-.9-2.2 1.9-1.3.7-2.2 2.3.2L8 0Zm3.2 5.3-.9-.9-3.4 3.4-1.5-1.5-.9.9 2.4 2.4 4.3-4.3Z" />
      </svg>
      {compact ? "Verified" : "Verified Service Provider"}
    </span>
  );
}

export function InsuranceStatus({ state, expiresAt }: { state: InsuranceState; expiresAt: Date | null }) {
  if (state === "missing") return <Pill label="Insurance not yet checked" tone="muted" />;
  if (state === "expired") return <Pill label={`Insurance expired ${shortDate(expiresAt)}`} tone="warn" />;
  if (state === "expiring") return <Pill label={`Insurance expires ${shortDate(expiresAt)}`} tone="warn" />;
  return <Pill label={`Insured until ${shortDate(expiresAt)}`} tone="good" />;
}

export function BoostedLabel() {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-pill bg-brand px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white" title="This business paid for placement above matching results.">
      Boosted
    </span>
  );
}

export function BusinessLogo({ src, name, size = 48 }: { src: string | null; name: string; size?: number }) {
  const letters = name.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]!.toUpperCase()).join("");
  return src ? (
    <img src={src} alt="" width={size} height={size} className="shrink-0 rounded-[10px] border border-line bg-white object-cover" style={{ width: size, height: size }} />
  ) : (
    <span aria-hidden="true" className="grid shrink-0 place-items-center rounded-[10px] bg-brand/10 font-display text-brand" style={{ width: size, height: size, fontSize: size * 0.36 }}>
      {letters || "RN"}
    </span>
  );
}

export function PaymentsNote({ className }: { className?: string }) {
  return (
    <p className={clsx("rounded-[10px] border border-line bg-paper-sunk/60 px-3.5 py-2.5 text-[13px] leading-relaxed text-ink-soft", className)}>
      RoomsNow introduces you to service businesses. Contracts, payments and guarantees are agreed directly between your organisation and the business — RoomsNow
      isn&apos;t a party to them and doesn&apos;t take payment for jobs. <Link href="/terms" className="underline underline-offset-2">Terms</Link>
    </p>
  );
}
