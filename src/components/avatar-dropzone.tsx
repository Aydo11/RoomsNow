"use client";
import { useEffect, useRef, useState, type DragEvent } from "react";

/**
 * Circular profile-picture picker. Dropping or selecting a file swaps the
 * preview to a local blob URL immediately, and syncs the same file onto the
 * real hidden <input type="file"> (via a DataTransfer) so the surrounding
 * plain `<form action={...}>` keeps working unchanged — nothing uploads
 * until the form is actually submitted.
 */
export function AvatarDropzone({
  id,
  name,
  initialPreview,
  fallback,
  error,
}: {
  id: string;
  name: string;
  initialPreview: string | null;
  fallback: React.ReactNode;
  error?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState(initialPreview);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    return () => {
      if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function applyFile(file: File | undefined | null) {
    if (!file || !file.type.startsWith("image/")) return;
    const input = inputRef.current;
    if (input) {
      const transfer = new DataTransfer();
      transfer.items.add(file);
      input.files = transfer.files;
    }
    setPreview(URL.createObjectURL(file));
  }

  function drop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    applyFile(event.dataTransfer.files?.[0]);
  }

  return (
    <div className="flex items-center gap-4">
      <label
        htmlFor={id}
        onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
        onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
        }}
        onDrop={drop}
        className={`group relative block h-24 w-24 shrink-0 cursor-pointer rounded-full transition focus-within:ring-2 focus-within:ring-pine/30 ${
          dragging ? "ring-4 ring-pine ring-offset-2" : ""
        }`}
      >
        <input
          ref={inputRef}
          id={id}
          name={name}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(event) => applyFile(event.currentTarget.files?.[0])}
        />
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt="Profile picture preview"
            className="h-24 w-24 rounded-full border-4 border-white bg-white object-cover shadow-raise"
          />
        ) : (
          <span className="grid h-24 w-24 place-items-center rounded-full border-4 border-white bg-pine-light text-[20px] font-semibold uppercase text-pine-dark shadow-raise">
            {fallback}
          </span>
        )}
        <span
          className={`absolute inset-0 grid place-items-center rounded-full text-[11px] font-semibold text-white transition ${
            dragging ? "bg-ink/50 opacity-100" : "bg-ink/0 opacity-0 group-hover:bg-ink/45 group-hover:opacity-100"
          }`}
        >
          {dragging ? "Drop it" : "Change"}
        </span>
      </label>
      <div className="text-[13px] text-ink-faint">
        <p>Drag a photo here, or click to browse.</p>
        <p className="mt-0.5">JPG, PNG, WEBP or AVIF · up to 8MB.</p>
        {error && <p className="mt-1 text-clay" role="alert">{error}</p>}
      </div>
    </div>
  );
}
