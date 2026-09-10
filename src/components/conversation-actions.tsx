"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  archiveConversationAction,
  deleteConversationAction,
  unarchiveConversationAction,
} from "@/server/actions/engagement";
import { ConfirmDialog } from "./confirm-dialog";
import { toast } from "./toast";
import { clsx } from "@/lib/clsx";

/**
 * Archive/delete controls for one conversation. Used both as hover actions on
 * an inbox row and as buttons in an open thread's header, so the behaviour —
 * and the "this only affects your inbox" wording — stays in one place.
 */
export function ConversationActions({
  conversationId,
  archived,
  variant = "row",
  onDeleted,
}: {
  conversationId: string;
  archived: boolean;
  variant?: "row" | "header";
  onDeleted?: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  function stop(event?: React.SyntheticEvent) {
    event?.preventDefault();
    event?.stopPropagation();
  }

  function toggleArchive(event?: React.SyntheticEvent) {
    stop(event);
    startTransition(async () => {
      if (archived) {
        await unarchiveConversationAction(conversationId);
        toast.success("Moved back to inbox.");
      } else {
        await archiveConversationAction(conversationId);
        toast.success("Conversation archived.");
      }
      router.refresh();
    });
  }

  function doDelete() {
    startTransition(async () => {
      await deleteConversationAction(conversationId);
      setConfirmingDelete(false);
      toast.success("Conversation deleted from your inbox.");
      if (onDeleted) onDeleted();
      else router.push("/messages");
      router.refresh();
    });
  }

  const iconBtn = clsx(
    "grid place-items-center rounded-[8px] text-ink-faint hover:bg-paper-sunk hover:text-ink disabled:opacity-50",
    variant === "row" ? "h-7 w-7" : "h-8 w-8",
  );

  return (
    <>
      <span className={variant === "row" ? "flex items-center gap-0.5" : "flex items-center gap-1"}>
        <button
          type="button"
          title={archived ? "Move to inbox" : "Archive"}
          aria-label={archived ? "Move to inbox" : "Archive conversation"}
          disabled={pending}
          onClick={toggleArchive}
          className={iconBtn}
        >
          <ArchiveIcon unarchive={archived} />
        </button>
        <button
          type="button"
          title="Delete"
          aria-label="Delete conversation"
          disabled={pending}
          onClick={(event) => {
            stop(event);
            setConfirmingDelete(true);
          }}
          className={iconBtn}
        >
          <TrashIcon />
        </button>
      </span>

      <ConfirmDialog
        open={confirmingDelete}
        title="Delete this conversation?"
        body="This removes it from your inbox only — the other person keeps their copy of the messages. You won't be able to undo this on your side."
        confirmLabel="Delete"
        danger
        pending={pending}
        onConfirm={doDelete}
        onCancel={() => setConfirmingDelete(false)}
      />
    </>
  );
}

function ArchiveIcon({ unarchive }: { unarchive: boolean }) {
  return (
    <svg viewBox="0 0 16 16" className="h-[15px] w-[15px]" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="1.5" y="2.5" width="13" height="3" rx="1" />
      {unarchive ? (
        <path d="M8 12V6.5M5.5 9 8 6.5 10.5 9" />
      ) : (
        <path d="M8 6.5V12M5.5 9.5 8 12l2.5-2.5" />
      )}
      <path d="M2.5 5.5v6.8c0 1 .8 1.7 1.7 1.7h7.6c1 0 1.7-.8 1.7-1.7V5.5" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-[15px] w-[15px]" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2.5 4h11M6 4V2.7c0-.4.3-.7.7-.7h2.6c.4 0 .7.3.7.7V4M6.5 7.3v4.2M9.5 7.3v4.2" />
      <path d="M3.5 4l.6 8.4c.1 1 .9 1.8 1.9 1.8h4c1 0 1.8-.8 1.9-1.8L12.5 4" />
    </svg>
  );
}
