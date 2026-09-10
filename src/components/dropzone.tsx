"use client";

import { useRef, useState } from "react";
import { clsx } from "@/lib/clsx";

/**
 * Drag-and-drop file picker that still submits through a plain native
 * `<input type="file">` — so it drops into any existing `<form action={...}>`
 * without the surrounding server action knowing the difference. Drag, click,
 * or paste all end up setting the same input's FileList via DataTransfer,
 * which is the only way to hand a browser-native FileList to an input
 * programmatically.
 */
export function Dropzone({
  name,
  accept,
  multiple = true,
  maxFiles,
  hint,
}: {
  name: string;
  accept?: string;
  multiple?: boolean;
  maxFiles?: number;
  hint?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function applyFiles(incoming: FileList | File[]) {
    const combined = [...files, ...Array.from(incoming)];
    const deduped = combined.filter(
      (file, index) =>
        combined.findIndex((f) => f.name === file.name && f.size === file.size && f.lastModified === file.lastModified) === index,
    );
    const next = maxFiles ? deduped.slice(0, maxFiles) : deduped;
    setError(maxFiles && deduped.length > maxFiles ? `Only the first ${maxFiles} files were kept.` : null);
    setFiles(next);
    syncInput(next);
  }

  function syncInput(next: File[]) {
    if (!inputRef.current) return;
    const transfer = new DataTransfer();
    next.forEach((file) => transfer.items.add(file));
    inputRef.current.files = transfer.files;
  }

  function removeFile(index: number) {
    const next = files.filter((_, i) => i !== index);
    setFiles(next);
    syncInput(next);
    setError(null);
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (event.dataTransfer.files.length) applyFiles(event.dataTransfer.files);
        }}
        className={clsx(
          "flex cursor-pointer flex-col items-center gap-1.5 rounded-[10px] border-2 border-dashed px-4 py-6 text-center transition-colors",
          dragging ? "border-pine bg-pine-light" : "border-line-strong bg-paper-sunk hover:border-pine/50",
        )}
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6 text-ink-faint" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <path d="M12 16V4m0 0-4 4m4-4 4 4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <p className="text-[14px] text-ink-soft">
          <span className="font-medium text-pine-dark">Click to upload</span> or drag files here
        </p>
        {hint && <p className="text-[12.5px] text-ink-faint">{hint}</p>}
        <input
          ref={inputRef}
          id={name}
          name={name}
          type="file"
          multiple={multiple}
          accept={accept}
          className="sr-only"
          onChange={(event) => {
            if (event.target.files?.length) applyFiles(event.target.files);
          }}
        />
      </div>

      {error && <p className="mt-1.5 text-[13px] text-clay">{error}</p>}

      {files.length > 0 && (
        <ul className="mt-2.5 space-y-1.5">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${file.size}-${file.lastModified}`}
              className="flex items-center justify-between gap-3 rounded-[8px] border border-line bg-white px-3 py-2 text-[13.5px]"
            >
              <span className="min-w-0 truncate">{file.name}</span>
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="shrink-0 text-ink-faint hover:text-clay-dark"
                aria-label={`Remove ${file.name}`}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
