import Link from "next/link";
import { FeaturedBadge, MatchScore, RoomStrip, VerifiedBadge } from "./badges";
import { monthYear, publicLocation, rentRange } from "@/lib/format";
import { supportLabel, ACCOMMODATION_TYPES } from "@/lib/taxonomy";
import type { SearchResult } from "@/server/search";
import { demoListingImage } from "@/lib/demo-listings";
import { ResilientImage } from "./resilient-image";

export function ListingCard({
  listing,
  match,
  compact = false,
  sponsored = false,
  distance,
}: {
  listing: SearchResult;
  match?: number;
  compact?: boolean;
  /** Paid placement. Always labelled, never mixed silently into organic results. */
  sponsored?: boolean;
  distance?: number | null;
}) {
  const image = listing.media[0]?.url;
  const fallback = demoListingImage(listing.id);
  const href = sponsored ? `/listings/${listing.id}?ref=sponsored` : `/listings/${listing.id}`;
  const available = listing.rooms.filter((r) => r.status === "AVAILABLE").length;

  return (
    <Link href={href} className="card interactive-card group flex h-full flex-col overflow-hidden">
        <div className={`relative overflow-hidden bg-paper-sunk ${compact ? "h-40 sm:h-44" : "h-48"}`}>
          <ResilientImage
            src={image}
            fallbackSrc={fallback.url}
            fallbackLabel="Illustrative image"
            alt={image ? `${listing.title} property photo` : fallback.caption}
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.035]"
            loading="lazy"
          />
          <div className="absolute left-3 top-3 flex gap-2">
            {(sponsored || listing.featured) && <FeaturedBadge />}
            {available > 0 && (
              <span className="rounded-pill bg-white/95 px-2.5 py-1 text-[12px] font-medium text-pine-dark">
                {available} room{available === 1 ? "" : "s"} available
              </span>
            )}
          </div>
        </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-[17px] hover:text-pine-dark">{listing.title}</h3>
            <p className="mt-0.5 truncate text-[14px] text-ink-soft">
              {publicLocation(listing.property)}
              {typeof distance === "number" && (
                <span className="text-ink-faint"> · {distance < 1 ? "under a mile" : `${distance.toFixed(1)} miles`}</span>
              )}
            </p>
          </div>
          {match !== undefined && <MatchScore score={match} />}
        </div>

        <dl className="mt-3 grid grid-cols-2 gap-y-1.5 text-[14px]">
          <div className="flex gap-1.5">
            <dt className="text-ink-faint">Type</dt>
            <dd>{ACCOMMODATION_TYPES[listing.accommodationType]}</dd>
          </div>
          <div className="flex gap-1.5">
            <dt className="text-ink-faint">From</dt>
            <dd>{monthYear(listing.availableFrom)}</dd>
          </div>
        </dl>

        {!compact && listing.supportTypes.length > 0 && (
          <p className="mt-3 flex flex-wrap gap-1.5">
            {listing.supportTypes.slice(0, listing.supportTypes.length > 2 ? 1 : 2).map((slug) => (
              <span key={slug} className="chip">{supportLabel(slug)}</span>
            ))}
            {listing.supportTypes.length > 2 && (
              <span className="chip">+{listing.supportTypes.length - 1} more</span>
            )}
          </p>
        )}

        <div className="mt-auto pt-4">
          <div className="border-t border-line pt-3">
            <div className="min-w-0 overflow-hidden">
              <RoomStrip rooms={listing.rooms} />
            </div>
            <p className="mt-2 text-right text-[15px] font-medium leading-snug">
              {rentRange(listing.weeklyRentFrom, listing.weeklyRentTo)}
            </p>
          </div>

          <div className="mt-3 flex min-h-9 items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-2">
              {listing.company.logoUrl ? (
                <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-[9px] border border-line bg-white p-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={listing.company.logoUrl} alt="" className="h-full w-full object-contain" loading="lazy" />
                </span>
              ) : (
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[9px] bg-pine-light text-[12px] font-semibold text-pine-dark" aria-hidden="true">
                  {companyInitials(listing.company.name)}
                </span>
              )}
              <span className="truncate text-[13px] text-ink-soft">{listing.company.name}</span>
            </span>
            {listing.company.verification === "APPROVED" && <VerifiedBadge compact />}
          </div>
        </div>
      </div>
    </Link>
  );
}

function companyInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("") || "RN";
}
