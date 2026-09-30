"use client";

import { compressImage } from "@/lib/compress-image";
import { optimisedImage } from "@/lib/image-url";
import { useEffect, useRef, useState, type DragEvent } from "react";
import { clsx } from "@/lib/clsx";

/**
 * Wide profile banner with a "Change banner" button. The whole banner is the
 * click and drop target (not just the button), and it sits above whatever
 * overlaps its bottom edge (the logo), so every part of the button works.
 * The chosen file stays on a real <input type="file" name={name}> so the
 * surrounding form submits it as before.
 */
export function BannerPicker({
  id = "banner",
  name = "banner",
  initialUrl,
  alt,
  disabled = false,
  className,
}: {
  id?: string;
  name?: string;
  initialUrl: string | null;
  alt: string;
  disabled?: boolean;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState(optimisedImage(initialUrl, 960) ?? null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    return () => {
      if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function applyFile(file: File | undefined | null) {
    if (!file || !file.type.startsWith("image/")) return;
    const input = inputRef.current;
    if (input && input.files?.[0] !== file) {
      const transfer = new DataTransfer();
      transfer.items.add(file);
      input.files = transfer.files;
    }
    setPreview(URL.createObjectURL(file));
    // Swap in a lighter copy for the upload (a phone photo can be 10MB).
    void compressImage(file).then((smaller) => {
      if (smaller === file || !inputRef.current || typeof DataTransfer === "undefined") return;
      const transfer = new DataTransfer();
      transfer.items.add(smaller);
      inputRef.current.files = transfer.files;
    });
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    if (!disabled) applyFile(event.dataTransfer.files?.[0]);
  }

  const buttonText = dragging ? "Drop to use this banner" : preview ? "Change banner" : "Add a banner";

  return (
    <div className={clsx("relative isolate overflow-hidden bg-gradient-to-br from-pine-dark via-pine to-pine-light", className)}>
      {preview && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt={alt} className="pointer-events-none h-full w-full object-cover" />
      )}
      <input
        ref={inputRef}
        id={id}
        name={name}
        type="file"
        accept="image/*"
        disabled={disabled}
        className="peer sr-only"
        onChange={(event) => applyFile(event.currentTarget.files?.[0])}
      />
      {!disabled && (
        <label
          htmlFor={id}
          onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
          onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
          }}
          onDrop={onDrop}
          title="Click or drop an image to change the banner"
          className={clsx(
            "group absolute inset-0 z-20 cursor-pointer rounded-[inherit] transition-colors peer-focus-visible:ring-4 peer-focus-visible:ring-inset peer-focus-visible:ring-white/90",
            dragging ? "bg-ink/40" : "hover:bg-ink/10",
          )}
        >
          <span className="sr-only">{buttonText}. JPG, PNG, WEBP or AVIF, up to 8MB.</span>
          <span
            aria-hidden="true"
            className="absolute right-3 top-3 inline-flex min-h-10 items-center gap-2 rounded-[10px] bg-white/95 px-4 text-[14px] font-semibold text-pine-dark shadow-raise transition-transform group-hover:bg-white group-active:scale-[0.98]"
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2.5" y="4" width="15" height="12" rx="2" />
              <path d="m4.5 14 4-4 3 3 2-2 2.5 2.5M12.5 7.5h.01" />
            </svg>
            {buttonText}
          </span>
        </label>
      )}
    </div>
  );
}
