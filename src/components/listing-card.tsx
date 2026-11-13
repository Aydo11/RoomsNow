import Link from "next/link";
import Image from "next/image";
import { FeaturedBadge, MatchScore, ResponseBadge } from "./badges";
import { responseLabel } from "@/lib/response-label";
import { monthYear, publicLocation, rentLead, tidyTitle } from "@/lib/format";
import { supportLabel, ACCOMMODATION_TYPES } from "@/lib/taxonomy";
import type { SearchResult } from "@/server/search";
import { demoListingImage } from "@/lib/demo-listings";
import { coverImage, videoPosterSrc } from "@/lib/cover-image";
import { ResilientImage } from "./resilient-image";
import { clsx } from "@/lib/clsx";
import { ListingCardActions } from "./listing-actions";
import { showWhatsappContact } from "@/lib/whatsapp-display";
import { WhatsappContactLink } from "./whatsapp-contact-link";

export function ListingCard({
  listing,
  match,
  compact = false,
  sponsored = false,
  boosted = false,
  memberListing = false,
  distance,
  showActions = false,
  saved = false,
  canSave = false,
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
  showActions?: boolean;
  saved?: boolean;
  canSave?: boolean;
}) {
  const cover = coverImage(listing.media);
  const image = cover && !cover.isVideoFile ? cover.url : undefined;
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
  const verified = listing.company.verification === "APPROVED";
  const now = Date.now();
  const vettedSchemes = [...new Set(
    (listing.company.accreditations ?? [])
      .filter((item) => !item.expiresAt || new Date(item.expiresAt).getTime() >= now)
      .map((item) => item.scheme),
  )];

  return (
    <article
      className={clsx(
        "card interactive-card group relative flex h-full flex-col overflow-hidden",
        sponsored && "border-2 border-clay/45 shadow-raise",
        boosted && "border-2 border-pine/70 bg-white shadow-raise ring-4 ring-pine-light/70",
        memberListing && !sponsored && !boosted && "border-pine/35",
        // A verified provider's identity has been checked — give the card a
        // little more visual confidence, but don't let it compete with a
        // paid placement's own (stronger) treatment.
        verified && !sponsored && !boosted && !memberListing && "ring-1 ring-inset ring-pine-light",
      )}
    >
      <Link
        href={href}
        aria-label={`View ${listing.title}`}
        className="absolute inset-0 z-10 rounded-card focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
      />
        <div className={`relative overflow-hidden bg-paper-sunk ${compact ? "h-40 sm:h-44" : "h-48"}`}>
          {cover?.isVideoFile ? (
            <video
              src={videoPosterSrc(cover.url)}
              preload="metadata"
              muted
              playsInline
              aria-label={`${listing.title} video`}
              className="absolute inset-0 h-full w-full bg-black object-cover transition-transform duration-500 ease-out group-hover:scale-[1.035]"
            />
          ) : (
          <ResilientImage
            src={image}
            fallbackSrc={fallback.url}
            fallbackLabel="Illustrative image"
            labelClassName="bottom-11 left-3"
            alt={image ? `${listing.title} ${cover?.fromVideo ? "video" : "property photo"}` : fallback.caption}
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.035]"
            sizes="(min-width: 1280px) 380px, (min-width: 640px) 45vw, 100vw"
          />
          )}
          {cover?.fromVideo && (
            <span aria-hidden="true" className="pointer-events-none absolute inset-0 grid place-items-center">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-black/60 text-white backdrop-blur-sm">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M8 5.5v13l11-6.5z" /></svg>
              </span>
            </span>
          )}
          <div className="absolute left-3 top-3 z-[1] flex max-w-[calc(100%-6.5rem)] flex-wrap gap-2">
            {boosted ? (
              <span className="inline-flex items-center gap-1 rounded-pill bg-[#F5B544] px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.05em] text-[#171F2E] shadow-sm"><LightningIcon /> Boosted</span>
            ) : activelySponsored ? <FeaturedBadge /> : null}
            {vettedSchemes.length > 0 && (
              <span
                className="inline-flex items-center gap-1 rounded-pill bg-[#fff]/95 px-2.5 py-1 text-[12px] font-semibold text-[#0F4F87]"
                title={`${vettedSchemes.join(" and ")} accreditation checked by RoomsNow`}
              >
                <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true"><path d="M8 1 2.5 3.2v4.2c0 3.3 2.3 6.2 5.5 7.1 3.2-.9 5.5-3.8 5.5-7.1V3.2L8 1Zm-1 9.6L4.6 8.2l1-1L7 8.6l3.4-3.4 1 1L7 10.6Z" /></svg>
                Vetted · {vettedSchemes.join("/")}
              </span>
            )}
          </div>
          {showActions && <ListingCardActions listingId={listing.id} title={listing.title} saved={saved} canSave={canSave} />}
          {/* Price and availability sit on the photo so cards can be compared at a glance. */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#0A101C]/90 via-[#0A101C]/45 to-transparent" />
          <div className="pointer-events-none absolute inset-x-3 bottom-2.5 flex items-end justify-between gap-2 text-white">
            <p className="font-display text-[22px] font-extrabold leading-none tracking-[-0.01em] [text-shadow:0_1px_6px_rgba(0,0,0,.45)]">
              {rentLead(listing.weeklyRentFrom, listing.weeklyRentTo)}
              {(listing.weeklyRentFrom || listing.weeklyRentTo) ? <span className="ml-1 text-[13px] font-semibold opacity-85">/week</span> : null}
            </p>
            {available > 0 && (
              <span className="flex shrink-0 items-center gap-1.5 text-[12.5px] font-bold drop-shadow">
                <i className="h-2 w-2 rounded-full bg-[#3DDC97] shadow-[0_0_0_3px_rgba(61,220,151,.25)]" />
                {available} room{available === 1 ? "" : "s"} free
              </span>
            )}
          </div>
        </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className={clsx("line-clamp-2 font-bold leading-snug hover:text-pine-dark", sponsored || boosted ? "text-[18px]" : "text-[17px]")}>{tidyTitle(listing.title)}</h3>
            <p className="mt-1 text-[13.5px] text-ink-soft">
              <span aria-hidden="true">📍 </span>{publicLocation(listing.property)}
              {typeof distance === "number" && (
                <span className="text-ink-faint"> · {distance < 1 ? "under a mile" : `${distance.toFixed(1)} miles`}</span>
              )}
              <span className="text-ink-faint"> · Available {monthYear(listing.availableFrom)}</span>
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            {showWhatsappContact(listing.status, listing.company) && <WhatsappContactLink listingId={listing.id} title={listing.title} compact />}
            {match !== undefined && <MatchScore score={match} />}
          </div>
        </div>

        {listing.housingBenefit && (
          <div className="benefits-strip mt-3 flex items-center gap-2.5 rounded-[12px] border px-3 py-2">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#1F9D6B] text-white" aria-hidden="true">
              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor"><path d="M6.2 11.6 2.6 8l1-1 2.6 2.6L12.4 3.4l1 1-7.2 7.2Z" /></svg>
            </span>
            <span className="min-w-0 leading-tight">
              <strong className="block text-[13.5px] font-bold">Benefits accepted</strong>
              <span className="benefits-strip-sub block text-[12px]">Including Universal Credit</span>
            </span>
          </div>
        )}

        <p className="mt-3 flex flex-wrap gap-1.5">
          {ACCOMMODATION_TYPES[listing.accommodationType] && <span className="chip"><span aria-hidden="true">🏠 </span>{ACCOMMODATION_TYPES[listing.accommodationType]}</span>}
          {!compact && listing.supportTypes.slice(0, 1).map((slug) => (
            <span key={slug} className="chip">{supportLabel(slug)}</span>
          ))}
          {!compact && listing.supportTypes.length > 1 && <span className="chip">+{listing.supportTypes.length - 1}</span>}
        </p>

        <div className="mt-auto pt-4">
          <div className="flex min-h-9 items-center justify-between gap-2 border-t border-line pt-3">
            <span className="flex min-w-0 items-center gap-2">
              {listing.company.logoUrl ? (
                <span className="relative grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-[9px] border border-line bg-white p-1">
                  <Image src={listing.company.logoUrl} alt="" fill sizes="36px" className="rounded-full object-cover" />
                </span>
              ) : (
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[9px] bg-pine-light text-[12px] font-semibold text-pine-dark" aria-hidden="true">
                  {companyInitials(listing.company.name)}
                </span>
              )}
              <span className="truncate text-[13px] text-ink-soft">{listing.company.name}</span>
              {verified && (
                <span className="flex shrink-0 items-center gap-1 text-[12px] font-semibold text-[#1F9D6B]" title="Verified provider">
                  <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true"><path d="M6.2 11.6 2.6 8l1-1 2.6 2.6L12.4 3.4l1 1-7.2 7.2Z" /></svg>
                  <span className="sr-only sm:not-sr-only">Verified</span>
                </span>
              )}
            </span>
            <ResponseBadge label={responseLabel(listing.company.responseMinutes, listing.company.responseSampleSize)} compact />
          </div>
        </div>
      </div>
    </article>
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
