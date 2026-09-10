import Link from "next/link";
import { FeaturedBadge, MatchScore, RoomStrip, VerifiedBadge } from "./badges";
import { monthYear, publicLocation, rentRange } from "@/lib/format";
import { supportLabel, ACCOMMODATION_TYPES } from "@/lib/taxonomy";
import type { SearchResult } from "@/server/search";
import { demoListingImage } from "@/lib/demo-listings";
import { ResilientImage } from "./resilient-image";
import { clsx } from "@/lib/clsx";

export function ListingCard({
  listing,
  match,
  compact = false,
  sponsored = false,
  boosted = false,
  memberListing = false,
  distance,
}: {
  listing: SearchResult;
  match?: number;
  compact?: boolean;
  /** Paid placement. Always labelled, never mixed silently into organic results. */
  sponsored?: boolean;
  /** A separate paid placement shown ahead of the other result lanes. */
  boosted?: boolean;
  /** Organic advert from a provider with an active paid membership. */
  memberListing?: boolean;
  distance?: number | null;
}) {
  const image = listing.media[0]?.url;
  const fallback = demoListingImage(listing.id);
  const activelySponsored = sponsored || (
    listing.featured && (!listing.featuredUntil || listing.featuredUntil > new Date())
  );
  const href = boosted
    ? `/listings/${listing.id}?ref=boosted`
    : sponsored
      ? `/listings/${listing.id}?ref=sponsored`
      : `/listings/${listing.id}`;
  const available = listing.rooms.filter((r) => r.status === "AVAILABLE").length;

  return (
    <Link
      href={href}
      className={clsx(
        "card interactive-card group flex h-full flex-col overflow-hidden",
        sponsored && "border-2 border-clay/45 shadow-raise",
        boosted && "border-2 border-pine/70 bg-white shadow-raise ring-4 ring-pine-light/70",
        memberListing && !sponsored && !boosted && "border-pine/35",
      )}
    >
        <div className={`relative overflow-hidden bg-paper-sunk ${compact ? "h-40 sm:h-44" : "h-48"}`}>
          <ResilientImage
            src={image}
            fallbackSrc={fallback.url}
            fallbackLabel="Illustrative image"
            alt={image ? `${listing.title} property photo` : fallback.caption}
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.035]"
            loading="lazy"
          />
          <div className="absolute left-3 top-3 flex flex-wrap gap-2">
            {boosted ? (
              <span className="inline-flex items-center gap-1 rounded-pill bg-pine/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] text-white"><LightningIcon /> Boosted now</span>
            ) : activelySponsored ? <FeaturedBadge /> : null}
            {available > 0 && (
              <span className="rounded-pill bg-white/95 px-2.5 py-1 text-[12px] font-medium text-pine-dark">
                {available} room{available === 1 ? "" : "s"} available
              </span>
            )}
          </div>
        </div>
      {listing.housingBenefit && (
        <div className="flex items-center justify-between gap-3 bg-pine px-4 py-2 text-white">
          <strong className="text-[13px] uppercase tracking-[0.08em]">Benefits accepted</strong>
          <span className="text-[12px] font-semibold">Incl. Universal Credit</span>
        </div>
      )}
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className={clsx("truncate hover:text-pine-dark", sponsored || boosted ? "text-[19px] font-bold" : "text-[17px]")}>{listing.title}</h3>
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
                  <img src={listing.company.logoUrl} alt="" className="h-full w-full rounded-full object-cover" loading="lazy" />
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

function LightningIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor" aria-hidden="true">
      <path d="M13.2 1.8 4.7 13.1a1 1 0 0 0 .8 1.6h5.1l-.8 7a.5.5 0 0 0 .9.4l8.6-11.3a1 1 0 0 0-.8-1.6h-5.2l.8-7a.5.5 0 0 0-.9-.4Z" />
    </svg>
  );
}
