"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { bulkClientAction, type BulkClientOperation } from "@/server/actions/clients";
import { ClientAvatar } from "./client-avatar";
import { ConfirmDialog } from "./confirm-dialog";
import { toast } from "./toast";
import { CLIENT_STATUS_STYLE } from "@/lib/client-card";
import { clsx } from "@/lib/clsx";

export type ClientRow = {
  id: string;
  name: string;
  photo: string | null;
  status: string;
  age: number | null;
  location: string | null;
  supportLabels: string[];
  extraSupport: number;
  referrals: number;
  shares: number;
  latestReferral: string | null;
  added: string;
  updated: string;
  deleted: string | null;
};

const STATUS_LABEL: Record<string, string> = { ACTIVE: "Active", PLACED: "Placed", ARCHIVED: "Archived", DELETED: "Deleted" };

/**
 * The caseload list. Each row opens the client; the checkboxes select people
 * for one action at once — archive a batch who've moved on, mark several as
 * placed, clear out old records — so managing a long caseload isn't one
 * click-through per person.
 */
export function ClientList({ rows, view }: { rows: ClientRow[]; view: "current" | "deleted" }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState<BulkClientOperation | null>(null);

  const allSelected = rows.length > 0 && rows.every((row) => selected.has(row.id));
  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const run = (operation: BulkClientOperation) =>
    startTransition(async () => {
      const result = await bulkClientAction(Array.from(selected), operation);
      setConfirm(null);
      if (result.ok) toast.success(result.message);
      else toast.error(result.message);
      setSelected(new Set());
      router.refresh();
    });

  const count = selected.size;

  return (
    <div>
      <div
        className={clsx(
          "sticky top-[72px] z-20 mb-3 flex min-h-12 flex-wrap items-center gap-2 rounded-card border px-3 py-2 transition-colors",
          count > 0 ? "border-ink bg-ink text-white shadow-float" : "border-line bg-white",
        )}
      >
        <label className="flex min-h-9 cursor-pointer items-center gap-2 pr-2 text-[14px]">
          <input
            type="checkbox"
            className="h-4 w-4 accent-pine"
            checked={allSelected}
            onChange={() => setSelected(allSelected ? new Set() : new Set(rows.map((row) => row.id)))}
            aria-label={allSelected ? "Clear selection" : "Select everyone on this page"}
          />
          {count > 0 ? `${count} selected` : "Select"}
        </label>
        {count > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {view === "current" ? (
              <>
                <BulkButton onClick={() => run("ACTIVE")} disabled={pending}>Mark active</BulkButton>
                <BulkButton onClick={() => run("PLACED")} disabled={pending}>Mark placed</BulkButton>
                <BulkButton onClick={() => run("ARCHIVED")} disabled={pending}>Archive</BulkButton>
                <BulkButton onClick={() => setConfirm("DELETE")} disabled={pending} danger>Delete</BulkButton>
              </>
            ) : (
              <>
                <BulkButton onClick={() => run("RESTORE")} disabled={pending}>Restore</BulkButton>
                <BulkButton onClick={() => setConfirm("PURGE")} disabled={pending} danger>Delete permanently</BulkButton>
              </>
            )}
          </div>
        )}
      </div>

      <ul className="card divide-y divide-line">
        {rows.map((row) => (
          <li key={row.id} className={clsx("flex items-start gap-3 px-3 py-3.5 sm:items-center sm:px-4", selected.has(row.id) && "bg-pine-light/50")}>
            <input
              type="checkbox"
              className="mt-3 h-4 w-4 shrink-0 accent-pine sm:mt-0"
              checked={selected.has(row.id)}
              onChange={() => toggle(row.id)}
              aria-label={`Select ${row.name}`}
            />
            <Link href={`/referrals/clients/${row.id}`} className="group flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2">
              <span className="flex min-w-0 flex-1 basis-[240px] items-center gap-3">
                <ClientAvatar name={row.name} src={row.photo} />
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-[16px] font-medium text-ink group-hover:text-pine-dark">{row.name}</span>
                    <span className={clsx("rounded-pill px-2 py-0.5 text-[12px] font-medium", CLIENT_STATUS_STYLE[row.status])}>
                      {STATUS_LABEL[row.status] ?? row.status}
                    </span>
                  </span>
                  <span className="mt-0.5 block truncate text-[13px] text-ink-faint">
                    {[row.age !== null ? `${row.age}` : null, row.location || "No preferred area"].filter(Boolean).join(" · ")}
                  </span>
                </span>
              </span>

              {row.supportLabels.length > 0 && (
                <span className="hidden min-w-0 flex-wrap gap-1.5 md:flex md:basis-[220px]">
                  {row.supportLabels.map((label) => (
                    <span key={label} className="chip py-0.5 text-[12px]">{label}</span>
                  ))}
                  {row.extraSupport > 0 && <span className="chip py-0.5 text-[12px]">+{row.extraSupport}</span>}
                </span>
              )}

              <span className="w-full text-[13px] text-ink-faint sm:w-auto sm:min-w-[180px] sm:text-right">
                {view === "deleted" ? (
                  <>Deleted {row.deleted}</>
                ) : (
                  <>
                    <span className="text-ink-soft">
                      {row.latestReferral ?? `${row.referrals} referral${row.referrals === 1 ? "" : "s"}`}
                    </span>
                    {row.shares > 0 && <> · shared with {row.shares}</>}
                    <span className="block">Added {row.added} · updated {row.updated}</span>
                  </>
                )}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <ConfirmDialog
        open={confirm === "DELETE"}
        title={`Move ${count} client${count === 1 ? "" : "s"} to Deleted?`}
        body="Their profiles are hidden and any provider they've been shared with loses access straight away. You can restore them from the Deleted tab."
        confirmLabel="Move to Deleted"
        danger
        pending={pending}
        onConfirm={() => run("DELETE")}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm === "PURGE"}
        title={`Permanently delete ${count} client${count === 1 ? "" : "s"}?`}
        body="This removes their records for good. Referrals you've already sent keep their own copy of the details. This can't be undone."
        confirmLabel="Delete permanently"
        danger
        pending={pending}
        onConfirm={() => run("PURGE")}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}

function BulkButton({
  children,
  onClick,
  disabled,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        "min-h-9 rounded-[8px] px-3 text-[13px] font-medium transition-colors disabled:opacity-60",
        danger ? "bg-white/10 text-[#FFD6C2] hover:bg-white/20" : "bg-white/10 text-white hover:bg-white/20",
      )}
    >
      {children}
    </button>
  );
}
