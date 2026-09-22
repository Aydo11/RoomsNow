"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { archiveClientAction, deleteClientAction, purgeClientAction, restoreClientAction } from "@/server/actions/clients";
import { ConfirmDialog } from "./confirm-dialog";
import { toast } from "./toast";

export function ClientActions({ clientId, status }: { clientId: string; status: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  function setStatus(next: "ACTIVE" | "PLACED" | "ARCHIVED") {
    startTransition(async () => {
      const result = await archiveClientAction(clientId, next);
      const labels: Record<string, string> = { ACTIVE: "Marked as active.", PLACED: "Marked as placed.", ARCHIVED: "Archived." };
      if (result?.ok) toast.success(labels[next]);
      else toast.error(result?.message ?? "Couldn't update this client.");
      router.refresh();
    });
  }

  return (
    <section className="card p-6">
      <h2 className="text-[18px]">Status</h2>
      <p className="mt-1 text-[14px] text-ink-soft">
        Archive people you&apos;re no longer supporting — they stop counting towards your plan and you can bring them back any time.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {status !== "ACTIVE" && (
          <button className="btn-secondary" disabled={pending} onClick={() => setStatus("ACTIVE")}>
            Mark as active
          </button>
        )}
        {status !== "PLACED" && (
          <button className="btn-secondary" disabled={pending} onClick={() => setStatus("PLACED")}>
            Mark as placed
          </button>
        )}
        {status !== "ARCHIVED" && (
          <button className="btn-ghost" disabled={pending} onClick={() => setStatus("ARCHIVED")}>
            Archive
          </button>
        )}
        <button className="btn-ghost text-clay" disabled={pending} onClick={() => setConfirmingDelete(true)}>
          Delete
        </button>
      </div>

      <ConfirmDialog
        open={confirmingDelete}
        title="Move this client to Deleted?"
        body="Their profile is hidden and every provider it's shared with loses access straight away. Referrals you've already made keep their own copy of the details. You can restore them from the Deleted tab."
        confirmLabel="Move to Deleted"
        danger
        pending={pending}
        onConfirm={() => startTransition(() => deleteClientAction(clientId))}
        onCancel={() => setConfirmingDelete(false)}
      />
    </section>
  );
}

/** Shown on a client that's in the Deleted bin. */
export function DeletedClientBanner({ clientId, deletedOn }: { clientId: string; deletedOn: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="card flex flex-wrap items-center justify-between gap-3 border-clay/30 bg-clay-light p-5">
      <div>
        <p className="font-medium text-clay">Deleted on {deletedOn}</p>
        <p className="mt-0.5 text-[14px] text-ink-soft">Hidden from your caseload and from every provider. Restore to use it again.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          className="btn-primary"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await restoreClientAction(clientId);
              if (result.ok) toast.success(result.message);
              else toast.error(result.message);
              router.refresh();
            })
          }
        >
          Restore
        </button>
        <button className="btn-danger" disabled={pending} onClick={() => setConfirming(true)}>
          Delete permanently
        </button>
      </div>
      <ConfirmDialog
        open={confirming}
        title="Delete permanently?"
        body="This removes the record for good. Referrals you've already sent keep their own copy of the details. This can't be undone."
        confirmLabel="Delete permanently"
        danger
        pending={pending}
        onConfirm={() =>
          startTransition(async () => {
            const result = await purgeClientAction(clientId);
            if (result.ok) {
              toast.success(result.message);
              router.push("/referrals/clients?status=DELETED");
            } else toast.error(result.message);
          })
        }
        onCancel={() => setConfirming(false)}
      />
    </div>
  );
}
