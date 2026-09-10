import { clsx } from "@/lib/clsx";
import { brand } from "@/brand.config";

/** Verification is a checked-identity marker, never a regulatory claim. */
export function VerifiedBadge({
  what = "provider",
  compact = false,
}: {
  what?: "provider" | "property";
  compact?: boolean;
}) {
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 rounded-pill bg-pine-light px-2.5 py-1 text-[12px] font-medium text-pine-dark"
      title={brand.trustNote}
      aria-label={`Verified ${what}`}
    >
      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true" fill="currentColor">
        <path d="M8 0 9.9 1.4l2.3-.2.7 2.2 1.9 1.3-.9 2.2.9 2.2-1.9 1.3-.7 2.2-2.3-.2L8 14l-1.9-1.4-2.3.2-.7-2.2L1.2 9.3l.9-2.2-.9-2.2 1.9-1.3.7-2.2 2.3.2L8 0Zm3.2 5.3-.9-.9-3.4 3.4-1.5-1.5-.9.9 2.4 2.4 4.3-4.3Z" />
      </svg>
      {compact ? "Verified" : `Verified ${what}`}
    </span>
  );
}

/** Paid placement is always labelled. */
/**
 * Paid placement is always labelled. The word stays plain — "Sponsored", not
 * "Featured" or "Recommended" — so nobody mistakes it for an endorsement.
 */
export function FeaturedBadge({ label = "Sponsored" }: { label?: string }) {
  return (
    <span className="inline-flex items-center rounded-pill border border-clay/25 bg-clay px-3 py-1 text-[12px] font-extrabold uppercase tracking-[0.08em] text-white">
      {label}
    </span>
  );
}

/**
 * Shown on every advert with benefits accepted, whatever the provider's
 * membership tier — this is an eligibility fact for the applicant, not a
 * paid placement, so it never gets folded into the sponsored/boosted lanes.
 */
export function BenefitsBadge({ label = "Benefits accepted" }: { label?: string }) {
  return (
    <span className="inline-flex items-center rounded-pill bg-pine px-3 py-1 text-[12px] font-extrabold uppercase tracking-[0.08em] text-white">
      {label}
    </span>
  );
}

const ROOM_TONE: Record<string, string> = {
  AVAILABLE: "bg-pine text-white",
  RESERVED: "bg-clay/15 text-clay",
  OCCUPIED: "bg-paper-sunk text-ink-faint",
  VOID: "bg-white text-ink-soft border border-line-strong",
  MAINTENANCE: "bg-white text-ink-faint border border-dashed border-line-strong",
  UNAVAILABLE: "bg-paper-sunk text-ink-faint",
};

/**
 * The signature element: a room-by-room availability strip. In this market the
 * question is never "is there a property" but "is there a room in it tonight".
 */
export function RoomStrip({
  rooms,
  showLabels = false,
}: {
  rooms: { name?: string; status: string }[];
  showLabels?: boolean;
}) {
  if (!rooms.length) return null;
  const available = rooms.filter((r) => r.status === "AVAILABLE").length;

  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1" role="img" aria-label={`${available} of ${rooms.length} rooms available`}>
        {rooms.slice(0, 12).map((room, i) => (
          <span
            key={i}
            title={`${room.name ?? `Room ${i + 1}`}: ${room.status.toLowerCase()}`}
            className={clsx("h-2 w-5 rounded-[2px]", ROOM_TONE[room.status] ?? "bg-paper-sunk")}
          />
        ))}
      </div>
      {showLabels && (
        <span className="text-[13px] text-ink-soft">
          {available} of {rooms.length} available
        </span>
      )}
    </div>
  );
}

export function StatusPill({ status, tone }: { status: string; tone?: "good" | "warn" | "muted" }) {
  const styles =
    tone === "good"
      ? "bg-pine-light text-pine-dark"
      : tone === "warn"
        ? "bg-clay-light text-clay"
        : "bg-paper-sunk text-ink-soft";
  return <span className={clsx("inline-flex rounded-pill px-2.5 py-1 text-[12px] font-medium", styles)}>{status}</span>;
}

export function MatchScore({ score }: { score: number }) {
  const tone = score >= 80 ? "text-pine-dark bg-pine-light" : score >= 55 ? "text-clay bg-clay-light" : "text-ink-soft bg-paper-sunk";
  return (
    <span
      className={clsx("inline-flex items-baseline gap-1 rounded-pill px-2.5 py-1", tone)}
      title="A marketplace compatibility indicator based on what you've told us. It is not an eligibility or suitability decision."
    >
      <span className="text-[13px] font-semibold">{score}%</span>
      <span className="text-[12px]">match</span>
    </span>
  );
}
