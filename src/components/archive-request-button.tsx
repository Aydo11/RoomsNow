"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { archiveRequestAction, unarchiveRequestAction } from "@/server/actions/engagement";

export function ArchiveRequestButton({ requestId, archived }: { requestId: string; archived: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      className="btn-secondary"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          if (archived) await unarchiveRequestAction(requestId);
          else await archiveRequestAction(requestId);
          router.refresh();
        })
      }
    >
      {pending ? "Saving…" : archived ? "Unarchive" : "Archive"}
    </button>
  );
}
