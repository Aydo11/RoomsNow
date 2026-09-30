"use client";

import { optimisedImage } from "@/lib/image-url";
import { useEffect, useRef, useState } from "react";
import { clsx } from "@/lib/clsx";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const DEFAULT_ACCEPT = IMAGE_TYPES.join(",");

/**
 * Large drag-and-drop area for images, with a live preview of what will be
 * uploaded. Like Dropzone, it still submits through a native file input, so
 * it works inside any existing server-action form.
 *
 * - `shape="square"` for a logo, `"wide"` for a cover banner, `"grid"` for a
 *   multi-photo gallery (thumbnails appear in a grid under the drop area).
 * - `currentUrl` shows the image already saved, until a new one is dropped.
 */
export function ImageDropzone({
  name,
  shape = "grid",
  multiple = shape === "grid",
  maxFiles,
  maxBytes = 8 * 1024 * 1024,
  currentUrl,
  label,
  hint,
}: {
  name: string;
  shape?: "square" | "wide" | "grid";
  multiple?: boolean;
  maxFiles?: number;
  maxBytes?: number;
  currentUrl?: string | null;
  label?: string;
  hint?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file));
    setPreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [files]);

  function syncInput(next: File[]) {
    if (!inputRef.current) return;
    const transfer = new DataTransfer();
    next.forEach((file) => transfer.items.add(file));
    inputRef.current.files = transfer.files;
  }

  function applyFiles(incoming: FileList | File[]) {
    const problems: string[] = [];
    const accepted = Array.from(incoming).filter((file) => {
      if (!IMAGE_TYPES.includes(file.type)) {
        problems.push(`${file.name} isn't a JPG, PNG, WebP or AVIF image.`);
        return false;
      }
      if (file.size > maxBytes) {
        problems.push(`${file.name} is over ${Math.round(maxBytes / 1024 / 1024)}MB.`);
        return false;
      }
      return true;
    });
    let next = multiple ? [...files, ...accepted] : accepted.slice(0, 1);
    next = next.filter(
      (file, index) => next.findIndex((f) => f.name === file.name && f.size === file.size && f.lastModified === file.lastModified) === index,
    );
    if (maxFiles !== undefined && next.length > maxFiles) {
      problems.push(maxFiles === 0 ? "You have no photo slots left. Remove a photo first." : `Only ${maxFiles} more photo${maxFiles === 1 ? "" : "s"} can be added.`);
      next = next.slice(0, Math.max(0, maxFiles));
    }
    setError(problems.length ? problems.join(" ") : null);
    setFiles(next);
    syncInput(next);
  }

  function removeFile(index: number) {
    const next = files.filter((_, i) => i !== index);
    setFiles(next);
    syncInput(next);
    setError(null);
  }

  const single = shape !== "grid";
  const shown = single ? previews[0] ?? optimisedImage(currentUrl, 480) ?? null : null;

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-label={label ? `Upload ${label.toLowerCase()}` : "Upload images"}
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
          "group relative flex cursor-pointer items-center justify-center overflow-hidden rounded-[12px] border-2 border-dashed text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine",
          dragging ? "border-pine bg-pine-light" : "border-line-strong bg-paper-sunk hover:border-pine/60",
          shape === "square" && "aspect-square w-full max-w-[220px]",
          shape === "wide" && "aspect-[16/7] w-full",
          shape === "grid" && "min-h-[190px] w-full px-4 py-8",
        )}
      >
        {shown ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={shown} alt={label ? `${label} preview` : "Preview"} className="absolute inset-0 h-full w-full object-cover" />
            <span className="absolute inset-x-0 bottom-0 bg-[#07101c]/70 px-3 py-2 text-[13px] font-medium text-white opacity-90 transition-opacity group-hover:opacity-100">
              {previews[0] ? "New image selected · click or drop to change" : "Click or drop an image to replace"}
            </span>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 px-4">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-paper-card text-pine-dark shadow-raise">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="4" width="18" height="16" rx="2.5" />
                <circle cx="9" cy="10" r="1.8" />
                <path d="m4 18 5.5-5.5 4 4 2.5-2.5L20 18" />
              </svg>
            </span>
            <p className="text-[15px] text-ink">
              <span className="font-semibold text-pine-dark">Drop {multiple ? "images" : "an image"} here</span> or click to browse
            </p>
            {hint && <p className="max-w-[40ch] text-[13px] leading-snug text-ink-faint">{hint}</p>}
          </div>
        )}
        <input
          ref={inputRef}
          id={name}
          name={name}
          type="file"
          multiple={multiple}
          accept={DEFAULT_ACCEPT}
          className="sr-only"
          onChange={(event) => {
            if (event.target.files?.length) applyFiles(event.target.files);
          }}
        />
      </div>

      {single && hint && shown && <p className="mt-1.5 text-[12.5px] text-ink-faint">{hint}</p>}
      {single && previews[0] && (
        <button type="button" onClick={() => removeFile(0)} className="mt-1.5 text-[13px] text-ink-soft underline-offset-2 hover:text-clay hover:underline">
          Undo new image
        </button>
      )}
      {error && <p className="mt-1.5 text-[13px] text-clay" role="alert">{error}</p>}

      {!single && previews.length > 0 && (
        <>
          <p className="mt-3 text-[13px] font-medium text-ink-soft">
            {previews.length} new photo{previews.length === 1 ? "" : "s"} ready to upload
          </p>
          <ul className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
            {previews.map((url, index) => (
              <li key={url} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={files[index]?.name ?? ""} className="aspect-square w-full rounded-[10px] border border-line object-cover" />
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  aria-label={`Remove ${files[index]?.name ?? "photo"}`}
                  className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-[#07101c]/75 text-white hover:bg-[#07101c]"
                >
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
