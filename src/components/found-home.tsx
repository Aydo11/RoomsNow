"use client";

import { useCallback, useState, useTransition } from "react";
import { ConfirmDialog } from "./confirm-dialog";

/** A button that asks "are you sure?" before running a found-a-home action. */
export function FoundHomeButton({
  action,
  label,
  title,
  body,
  confirmLabel,
  className = "btn-primary",
}: {
  action: () => Promise<void>;
  label: string;
  title: string;
  body: string;
  confirmLabel: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const close = useCallback(() => setOpen(false), []);
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)} disabled={pending}>
        {pending ? "Saving…" : label}
      </button>
      <ConfirmDialog
        open={open}
        title={title}
        body={body}
        confirmLabel={confirmLabel}
        pending={pending}
        onCancel={close}
        onConfirm={() => start(async () => { await action(); setOpen(false); })}
      />
    </>
  );
}
