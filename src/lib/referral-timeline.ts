import { PIPELINE_LABELS } from "./taxonomy";
import type { ReferralEvent, Document as ReferralDocument, Viewing, ViewingStatus } from "@prisma/client";

export type ReferralTimelineEntry = {
  id: string;
  at: Date;
  title: string;
  detail?: string | null;
};

const VIEWING_OUTCOME_LABEL: Partial<Record<ViewingStatus, string>> = {
  CONFIRMED: "Viewing confirmed",
  COMPLETED: "Viewing completed",
  CANCELLED: "Viewing cancelled",
  NO_SHOW: "Viewing marked as a no-show",
};

/**
 * Merges everything that's happened on a referral — its submission, status
 * changes, documents added, and viewings proposed/resolved — into one
 * chronological timeline. Pure and server-render-friendly: no fetching here,
 * just reshaping what the page already queried. Messages aren't included —
 * Conversation has no referralId, so there's no reliable way to tie one to
 * this specific referral.
 */
export function buildReferralTimeline(referral: {
  createdAt: Date;
  events: Pick<ReferralEvent, "id" | "status" | "note" | "createdAt">[];
  documents: Pick<ReferralDocument, "id" | "name" | "createdAt">[];
  viewings: Pick<Viewing, "id" | "scheduledFor" | "status" | "note" | "outcomeNote" | "createdAt" | "updatedAt">[];
}): ReferralTimelineEntry[] {
  const entries: ReferralTimelineEntry[] = [{ id: "submitted", at: referral.createdAt, title: "Referral submitted" }];

  for (const event of referral.events) {
    entries.push({
      id: event.id,
      at: event.createdAt,
      title: PIPELINE_LABELS[event.status] ?? event.status,
      detail: event.note,
    });
  }

  for (const document of referral.documents) {
    entries.push({
      id: document.id,
      at: document.createdAt,
      title: "Document added",
      detail: document.name,
    });
  }

  for (const viewing of referral.viewings) {
    entries.push({
      id: `${viewing.id}-proposed`,
      at: viewing.createdAt,
      title: "Viewing proposed",
      detail: viewing.note,
    });
    if (viewing.status !== "PROPOSED") {
      entries.push({
        id: `${viewing.id}-${viewing.status}`,
        at: viewing.updatedAt,
        title: VIEWING_OUTCOME_LABEL[viewing.status] ?? "Viewing updated",
        detail: viewing.outcomeNote,
      });
    }
  }

  return entries.sort((a, b) => b.at.getTime() - a.at.getTime());
}
