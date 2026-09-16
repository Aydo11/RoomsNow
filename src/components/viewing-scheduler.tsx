"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { scheduleViewingAction } from "@/server/actions/viewings";
import { ViewingRowActions } from "./viewing-row-actions";
import { StatusPill } from "./badges";
import { dateTime } from "@/lib/format";
import { toast } from "./toast";
import type { ViewingStatus } from "@prisma/client";

const STATUS_LABEL: Record<ViewingStatus, string> = {
  PROPOSED: "Awaiting confirmation",
  CONFIRMED: "Confirmed",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  NO_SHOW: "No-show",
};

const STATUS_TONE: Record<ViewingStatus, "good" | "warn" | "muted"> = {
  PROPOSED: "warn",
  CONFIRMED: "good",
  COMPLETED: "muted",
  CANCELLED: "muted",
  NO_SHOW: "muted",
};

export type ViewingSummary = {
  id: string;
  scheduledFor: string;
  status: ViewingStatus;
  note: string | null;
  outcomeNote: string | null;
};

/**
 * Everything a provider needs for viewings on one request or referral: the
 * history of what's been proposed/confirmed/closed so far, and a small form
 * to propose the next one. Lives inline on the request/referral it belongs
 * to — the central /provider/viewings page is for seeing everything at
 * once, this is for acting on one applicant.
 */
export function ViewingScheduler({
  kind,
  id,
  viewings,
}: {
  kind: "request" | "referral";
  id: string;
  viewings: ViewingSummary[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [when, setWhen] = useState("");
  const [note, setNote] = useState("");

  function propose() {
    if (!when) return;
    const iso = new Date(when).toISOString();
    startTransition(async () => {
      await scheduleViewingAction({
        [kind === "request" ? "requestId" : "referralId"]: id,
        scheduledFor: iso,
        note: note || undefined,
      });
      toast.success("Viewing proposed.");
      setWhen("");
      setNote("");
      router.refresh();
    });
  }

  return (
    <div>
      {viewings.length > 0 && (
        <ul className="space-y-2">
          {viewings.map((viewing) => (
            <li key={viewing.id} className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] bg-paper-sunk px-3 py-2.5">
              <div className="min-w-0">
                <p className="text-[14px] font-medium">{dateTime(viewing.scheduledFor)}</p>
                {viewing.note && <p className="mt-0.5 text-[13px] text-ink-soft">{viewing.note}</p>}
                {viewing.outcomeNote && <p className="mt-0.5 text-[13px] text-ink-faint">{viewing.outcomeNote}</p>}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <StatusPill status={STATUS_LABEL[viewing.status]} tone={STATUS_TONE[viewing.status]} />
                <ViewingRowActions id={viewing.id} status={viewing.status} />
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div>
          <label htmlFor={`viewing-when-${id}`} className="mb-1 block text-[13px] text-ink-faint">
            Propose a viewing
          </label>
          <input
            id={`viewing-when-${id}`}
            type="datetime-local"
            className="field"
            value={when}
            onChange={(event) => setWhen(event.target.value)}
          />
        </div>
        <div>
          <label htmlFor={`viewing-note-${id}`} className="mb-1 block text-[13px] text-ink-faint">
            Note (optional)
          </label>
          <input
            id={`viewing-note-${id}`}
            className="field"
            placeholder="Meet at the front door, ask for…"
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </div>
        <button type="button" className="btn-secondary" disabled={pending || !when} onClick={propose}>
          {pending ? "Sending…" : "Propose"}
        </button>
      </div>
    </div>
  );
}
