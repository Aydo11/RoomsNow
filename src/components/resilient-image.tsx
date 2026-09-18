"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

type Props = {
  src?: string | null;
  fallbackSrc: string;
  fallbackLabel?: string;
  alt: string;
  className?: string;
  /** Passed straight to next/image; defaults to a reasonable card-sized guess. */
  sizes?: string;
  /** Marks the image as an LCP candidate (skips lazy-loading). */
  priority?: boolean;
};

/**
 * Replaces lost object-storage files with an honest illustrative image.
 * Renders through next/image (fill mode) so the browser gets a
 * properly resized/re-encoded file instead of the original upload —
 * the direct parent must be `position: relative` with a defined size.
 */
export function ResilientImage({ src, fallbackSrc, fallbackLabel, alt, className, sizes, priority }: Props) {
  const [failed, setFailed] = useState(!src);

  useEffect(() => {
    setFailed(!src);
  }, [src]);

  return (
    <>
      <Image
        fill
        sizes={sizes ?? "(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw"}
        priority={priority}
        src={failed ? fallbackSrc : src ?? fallbackSrc}
        alt={alt}
        className={className}
        onError={() => setFailed(true)}
      />
      {failed && fallbackLabel && (
        <span className="absolute bottom-2 left-2 rounded-pill bg-black/70 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur">
          {fallbackLabel}
        </span>
      )}
    </>
  );
}
