"use client";

import { useEffect, useRef } from "react";

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel = "Cancel",
  danger = false,
  pending = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    confirmRef.current?.focus();
    const onEscape = (event: KeyboardEvent) => event.key === "Escape" && onCancel();
    window.addEventListener("keydown", onEscape);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-200 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div
        className="absolute inset-0 animate-fade-in bg-ink/40"
        onClick={onCancel}
        aria-hidden="true"
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="relative w-full max-w-sm animate-slide-up-sheet rounded-t-card border border-line bg-white p-6 shadow-float sm:animate-scale-in sm:rounded-card"
      >
        <h2 id="confirm-dialog-title" className="text-[19px]">
          {title}
        </h2>
        <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">{body}</p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button className="btn-ghost" onClick={onCancel} disabled={pending}>
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            className={danger ? "btn-danger" : "btn-primary"}
            onClick={onConfirm}
            disabled={pending}
            aria-busy={pending}
          >
            {pending ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
