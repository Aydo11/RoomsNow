"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { blockUserAction, unblockUserAction } from "@/server/actions/engagement";
import { ReportForm } from "./report-form";
import { ConfirmDialog } from "./confirm-dialog";
import { toast } from "./toast";
import { clsx } from "@/lib/clsx";

export function ConversationMenu({
  otherUserId,
  otherName,
  initiallyBlocked,
}: {
  otherUserId: string;
  otherName: string;
  initiallyBlocked: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [confirmingBlock, setConfirmingBlock] = useState(false);
  const [blocked, setBlocked] = useState(initiallyBlocked);
  const [pending, startTransition] = useTransition();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  function toggleBlock() {
    startTransition(async () => {
      if (blocked) {
        await unblockUserAction(otherUserId);
        setBlocked(false);
        toast.success(`Unblocked ${otherName}.`);
      } else {
        await blockUserAction(otherUserId);
        setBlocked(true);
        toast.success(`Blocked ${otherName}. They can no longer message you.`);
      }
      setConfirmingBlock(false);
      router.refresh();
    });
  }

  if (reporting) {
    return (
      <div className="w-full animate-scale-in sm:w-80">
        <ReportForm targetType="USER" targetId={otherUserId} onDone={() => setReporting(false)} />
      </div>
    );
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex h-9 w-9 items-center justify-center gap-1 rounded-full text-[13px] text-ink-faint hover:bg-paper-sunk hover:text-ink sm:h-auto sm:w-auto sm:rounded-none sm:underline sm:decoration-dotted sm:hover:bg-transparent"
        aria-label="Block or report"
      >
        <svg viewBox="0 0 20 20" className="h-5 w-5 sm:hidden" fill="currentColor" aria-hidden="true">
          <circle cx="4.5" cy="10" r="1.6" />
          <circle cx="10" cy="10" r="1.6" />
          <circle cx="15.5" cy="10" r="1.6" />
        </svg>
        <span className="hidden sm:inline">Block or report</span>
        <svg
          viewBox="0 0 16 16"
          className={clsx("hidden h-3 w-3 transition-transform duration-200 sm:block", open && "rotate-180")}
          fill="currentColor"
        >
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-20 mt-2 w-56 origin-top-right animate-scale-in rounded-card border border-line bg-white p-1.5 shadow-float"
        >
          <button
            role="menuitem"
            className="block w-full rounded-[8px] px-3 py-2 text-left text-[14px] text-ink hover:bg-paper-sunk"
            onClick={() => {
              setOpen(false);
              setReporting(true);
            }}
          >
            Report {otherName}
          </button>
          <button
            role="menuitem"
            disabled={pending}
            className="block w-full rounded-[8px] px-3 py-2 text-left text-[14px] text-clay-dark hover:bg-clay-light disabled:opacity-60"
            onClick={() => {
              setOpen(false);
              if (blocked) toggleBlock();
              else setConfirmingBlock(true);
            }}
          >
            {blocked ? `Unblock ${otherName}` : `Block ${otherName}`}
          </button>
        </div>
      )}

      <ConfirmDialog
        open={confirmingBlock}
        title={`Block ${otherName}?`}
        body={`${otherName} won't be able to message you again, and you won't be able to message them. Your existing messages stay visible. You can unblock them any time.`}
        confirmLabel="Block"
        danger
        pending={pending}
        onConfirm={toggleBlock}
        onCancel={() => setConfirmingBlock(false)}
      />
    </div>
  );
}
