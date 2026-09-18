"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateViewingStatusAction } from "@/server/actions/viewings";
import { toast } from "./toast";
import type { ViewingStatus } from "@prisma/client";

/**
 * The move-the-viewing-forward buttons for one Viewing row — which buttons
 * show depends on its current status, since a completed or cancelled
 * viewing is a closed record, not something to keep acting on.
 */
export function ViewingRowActions({ id, status }: { id: string; status: ViewingStatus }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState("");

  function apply(next: ViewingStatus, note?: string, successMessage?: string) {
    startTransition(async () => {
      await updateViewingStatusAction(id, next, note);
      if (successMessage) toast.success(successMessage);
      setCancelling(false);
      setReason("");
      router.refresh();
    });
  }

  if (status === "PROPOSED" || status === "CONFIRMED") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {status === "PROPOSED" && (
          <button
            type="button"
            className="btn-secondary"
            disabled={pending}
            onClick={() => apply("CONFIRMED", undefined, "Viewing marked as confirmed.")}
          >
            Mark confirmed
          </button>
        )}
        {status === "CONFIRMED" && (
          <>
            <button
              type="button"
              className="btn-secondary"
              disabled={pending}
              onClick={() => apply("COMPLETED", undefined, "Viewing marked as completed.")}
            >
              Mark completed
            </button>
            <button
              type="button"
              className="text-[13px] text-clay hover:underline disabled:opacity-60"
              disabled={pending}
              onClick={() => apply("NO_SHOW", undefined, "Viewing marked as a no-show.")}
            >
              No-show
            </button>
          </>
        )}
        {cancelling ? (
          <span className="flex flex-wrap items-center gap-2">
            <input
              className="field h-9 w-48 text-[13px]"
              placeholder="Reason (optional)"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
            <button
              type="button"
              className="text-[13px] text-clay hover:underline disabled:opacity-60"
              disabled={pending}
              onClick={() => apply("CANCELLED", reason || undefined, "Viewing cancelled.")}
            >
              Confirm cancel
            </button>
            <button type="button" className="text-[13px] text-ink-faint hover:underline" onClick={() => setCancelling(false)}>
              Back
            </button>
          </span>
        ) : (
          <button type="button" className="text-[13px] text-ink-faint hover:underline" disabled={pending} onClick={() => setCancelling(true)}>
            Cancel
          </button>
        )}
      </div>
    );
  }

  return null;
}
