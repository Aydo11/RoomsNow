"use client";

import { useState } from "react";
import { clsx } from "@/lib/clsx";

const SIZES = {
  sm: "h-9 w-9 text-[13px]",
  md: "h-12 w-12 text-[16px]",
  lg: "h-20 w-20 text-[24px]",
} as const;

/**
 * A client's profile picture, falling back to their initials. Photos come
 * from an access-checked route, so a viewer who can't see one (or a photo
 * that has since been removed) simply gets the initials rather than a broken
 * image icon.
 */
export function ClientAvatar({
  name,
  src,
  size = "md",
  className,
}: {
  name: string;
  src: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <span
      className={clsx(
        "relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full bg-pine-light font-semibold text-pine-dark ring-2 ring-white",
        SIZES[size],
        className,
      )}
      aria-hidden="true"
    >
      {src && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element -- private, access-checked route; next/image would cache it publicly
        <img src={src} alt="" className="h-full w-full object-cover" onError={() => setFailed(true)} />
      ) : (
        initials || "?"
      )}
    </span>
  );
}
