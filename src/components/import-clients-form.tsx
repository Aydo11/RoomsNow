"use client";

import Link from "next/link";
import { useActionState, useRef, useState, type DragEvent } from "react";
import { importClientsAction, type ImportState } from "@/server/actions/clients";
import { FormError, SubmitButton } from "./ui";
import { clsx } from "@/lib/clsx";

export function ImportClientsForm() {
  const [state, action] = useActionState<ImportState, FormData>(importClientsAction, { ok: false });
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const setFile = (file: File | undefined) => {
    if (!file || !inputRef.current) return;
    const transfer = new DataTransfer();
    transfer.items.add(file);
    inputRef.current.files = transfer.files;
    setFileName(file.name);
  };

  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragging(false);
    setFile(event.dataTransfer.files[0]);
  };

  return (
    <div className="space-y-6">
      <form action={action} className="card space-y-4 p-6">
        <FormError message={state.errors?.form} />
        {state.ok && state.message && (
          <div className="rounded-[10px] border border-pine/25 bg-pine-light px-4 py-3 text-[15px] text-pine-dark" role="status">
            <p className="font-medium">{state.message}</p>
            <Link href="/referrals/clients" className="mt-1 inline-block text-[14px] underline">
              Go to My clients
            </Link>
          </div>
        )}

        <label
          htmlFor="client-file"
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={clsx(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-card border-2 border-dashed px-6 py-10 text-center transition-colors",
            dragging ? "border-pine bg-pine-light" : "border-line-strong bg-paper hover:border-pine/50",
          )}
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-8 w-8 text-pine" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M12 16V4m0 0-4 4m4-4 4 4M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-[16px] font-medium text-ink">{fileName ?? "Drop a CSV here, or tap to choose one"}</span>
          <span className="text-[13px] text-ink-faint">Up to 500 clients per file · 2MB max</span>
          <input
            ref={inputRef}
            id="client-file"
            name="file"
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={(event) => setFileName(event.target.files?.[0]?.name ?? null)}
          />
        </label>

        <SubmitButton pendingLabel="Uploading…" disabled={!fileName}>Upload clients</SubmitButton>
      </form>

      {state.skipped && state.skipped.length > 0 && (
        <section className="card p-6">
          <h2 className="text-[18px]">
            {state.skipped.length} row{state.skipped.length === 1 ? "" : "s"} not added
          </h2>
          <p className="mt-1 text-[14px] text-ink-soft">Fix these in your spreadsheet and upload just those rows again.</p>
          <ul className="mt-3 max-h-72 divide-y divide-line overflow-y-auto rounded-[10px] border border-line text-[14px]">
            {state.skipped.map((row) => (
              <li key={row.row} className="flex gap-3 px-3 py-2">
                <span className="w-16 shrink-0 tabular-nums text-ink-faint">Row {row.row}</span>
                <span>{row.reason}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
