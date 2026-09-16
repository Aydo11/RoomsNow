import { timeAgo } from "@/lib/format";
import type { ReferralTimelineEntry } from "@/lib/referral-timeline";

/** Renders a merged referral timeline — same list markup the old status-only "History" block used. */
export function ReferralTimeline({ entries }: { entries: ReferralTimelineEntry[] }) {
  return (
    <ol className="mt-3 space-y-3">
      {entries.map((entry) => (
        <li key={entry.id}>
          <p className="text-[14px]">{entry.title}</p>
          {entry.detail && <p className="text-[13px] text-ink-soft">{entry.detail}</p>}
          <p className="text-[12px] text-ink-faint">{timeAgo(entry.at)}</p>
        </li>
      ))}
    </ol>
  );
}
