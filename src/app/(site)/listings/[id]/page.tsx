import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getListing } from "@/server/search";
import { getCurrentUser } from "@/lib/session";
import { Gallery } from "@/components/gallery";
import { SaveButton } from "@/components/save-button";
import { ReportForm } from "@/components/report-form";
import { MatchScore, RoomStrip, StatusPill, VerifiedBadge } from "@/components/badges";
import { MessageProviderForm } from "@/components/message-provider-form";
import { monthYear, publicLocation, rentRange, shortDate } from "@/lib/format";
import {
  ACCOMMODATION_TYPES,
  GENDER_ARRANGEMENTS,
  REFERRAL_ROUTES,
  ROOM_STATUSES,
  supportLabel,
} from "@/lib/taxonomy";
import { matchScore } from "@/lib/matching";
import { recordBoostedClickAction, recordSponsoredClickAction } from "@/server/actions/billing";
import { brand } from "@/brand.config";
import { callerIp, LIMITS, rateLimit } from "@/lib/rate-limit";
import { JsonLd, absoluteUrl, locationSlug } from "@/lib/seo";
import { PropertyMap } from "@/components/property-map";
import { hasProviderMapAccess } from "@/lib/entitlements";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const listing = await db.listing.findUnique({
    where: { id },
    select: {
      title: true,
      summary: true,
      description: true,
      status: true,
      accommodationType: true,
      weeklyRentFrom: true,
      media: { where: { type: "IMAGE" }, orderBy: [{ isPrimary: "desc" }, { position: "asc" }], take: 4, select: { url: true } },
      property: { select: { city: true, area: true } },
    },
  });
  if (!listing) return { title: "Accommodation advert", robots: { index: false, follow: true } };
  const location = [listing.property.area, listing.property.city].filter(Boolean).join(", ");
  const title = `${listing.title} — ${listing.property.city}`;
  const description = listing.summary ?? `View this ${listing.accommodationType.toLowerCase().replaceAll("_", " ")} in ${location}, including availability, rent, facilities and referral information.`;
  const url = absoluteUrl(`/listings/${id}`);
  return {
    title,
    description,
    alternates: { canonical: url },
    robots: { index: listing.status === "ACTIVE", follow: true },
    openGraph: {
      type: "website",
      siteName: brand.name,
      locale: "en_GB",
      url,
      title,
      description,
      images: listing.media.map((image) => absoluteUrl(image.url)),
    },
    twitter: { card: listing.media.length ? "summary_large_image" : "summary", title, description },
  };
}

export default async function ListingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ref?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const [listing, user] = await Promise.all([getListing(id), getCurrentUser()]);
  if (!listing) notFound();

  // Sponsored click-through, counted here rather than in the browser so it works
  // without JavaScript and can't be inflated by a script.
  if (query.ref === "sponsored") await recordSponsoredClickAction(id);
  if (query.ref === "boosted") await recordBoostedClickAction(id);

  const isOwner = user?.staffOf.some((s) => s.companyId === listing.companyId) ?? false;
  if (listing.status !== "ACTIVE" && !isOwner && user?.role !== "ADMIN") notFound();

  if (!isOwner) {
    const viewer = user?.id ?? await callerIp();
    const countView = await rateLimit(`view:${listing.id}:${viewer}`, LIMITS.view);
    if (countView.ok) {
      await db.listing.update({ where: { id: listing.id }, data: { views: { increment: 1 } } });
    }
  }

  const [saved, existingRequest] = user
    ? await Promise.all([
        db.savedListing.findUnique({ where: { userId_listingId: { userId: user.id, listingId: listing.id } } }),
        db.accommodationRequest.findUnique({
          where: { listingId_applicantId: { listingId: listing.id, applicantId: user.id } },
        }),
      ])
    : [null, null];

  const available = listing.rooms.filter((r) => r.status === "AVAILABLE");
  const canViewMap = hasProviderMapAccess(listing.company);
  const hasCoordinates = listing.property.latitude != null && listing.property.longitude != null;
  const mapLatitude = listing.property.showExactAddress ? listing.property.latitude : listing.property.latitude == null ? null : Math.round(listing.property.latitude * 1000) / 1000;
  const mapLongitude = listing.property.showExactAddress ? listing.property.longitude : listing.property.longitude == null ? null : Math.round(listing.property.longitude * 1000) / 1000;
  const listingUrl = absoluteUrl(`/listings/${listing.id}`);
  const listingDescription = listing.summary ?? `Accommodation in ${publicLocation(listing.property)} advertised by ${listing.company.name}.`;
  const match =
    user?.profile && !isOwner
      ? matchScore(
          {
            city: user.locationLabel,
            preferredLocations: user.profile.preferredLocations,
            supportTypes: user.profile.supportTypes,
            preferredTypes: user.profile.preferredTypes,
            availableFrom: user.profile.availableFrom,
            genderArrangement: user.profile.genderArrangement,
          },
          {
            city: listing.property.city,
            supportTypes: listing.supportTypes,
            accommodationType: listing.accommodationType,
            availableFrom: listing.availableFrom,
            genderArrangement: listing.genderArrangement,
            minAge: listing.minAge,
            maxAge: listing.maxAge,
            wheelchairAccess: listing.wheelchairAccess,
            weeklyRentFrom: listing.weeklyRentFrom,
          },
        )
      : null;

  return (
    <div className="shell py-6 pb-28 sm:py-8 lg:pb-8">
      <JsonLd data={[
        {
          "@context": "https://schema.org",
          "@type": "Offer",
          url: listingUrl,
          name: listing.title,
          description: listingDescription,
          availability: available.length > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
          priceCurrency: "GBP",
          ...(listing.weeklyRentFrom ? { price: listing.weeklyRentFrom, priceSpecification: { "@type": "UnitPriceSpecification", price: listing.weeklyRentFrom, priceCurrency: "GBP", unitText: "WEEK" } } : {}),
          itemOffered: {
            "@type": "Accommodation",
            name: listing.title,
            address: {
              "@type": "PostalAddress",
              addressLocality: listing.property.city,
              postalCode: listing.property.postcode,
              addressCountry: "GB",
            },
            numberOfRooms: listing.rooms.length,
          },
          offeredBy: { "@type": "Organization", name: listing.company.name, url: absoluteUrl(`/companies/${listing.company.slug}`) },
        },
        {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
            { "@type": "ListItem", position: 2, name: `Rooms in ${listing.property.city}`, item: absoluteUrl(`/rooms/${locationSlug(listing.property.city)}`) },
            { "@type": "ListItem", position: 3, name: listing.title, item: listingUrl },
          ],
        },
      ]} />
      {listing.status !== "ACTIVE" && (
        <p className="mb-5 rounded-[10px] border border-clay/30 bg-clay-light px-4 py-3 text-[14px] text-clay">
          This advert is {listing.status.toLowerCase().replace("_", " ")} and isn&apos;t publicly visible.
        </p>
      )}

      <nav className="mb-5 text-[14px] text-ink-faint">
        <Link href="/search" className="hover:text-ink">Search</Link>
        <span className="mx-2">/</span>
        <Link href={`/rooms/${locationSlug(listing.property.city)}`} className="hover:text-ink">
          {listing.property.city}
        </Link>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0">
          <Gallery media={listing.media} title={listing.title} listingId={listing.id} />

          <header className="mt-7">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-[30px] leading-tight">{listing.title}</h1>
                <p className="mt-1.5 text-[16px] text-ink-soft">{publicLocation(listing.property)}</p>
              </div>
              {match && <MatchScore score={match.score} />}
            </div>

            <p className="mt-4 flex flex-wrap gap-1.5">
              {listing.supportTypes.map((slug) => (
                <span key={slug} className="chip chip-active">{supportLabel(slug)}</span>
              ))}
            </p>
          </header>

          {listing.summary && <p className="mt-6 text-[17px] leading-relaxed text-ink">{listing.summary}</p>}

          <section className="mt-8 grid gap-x-8 gap-y-4 border-y border-line py-6 sm:grid-cols-3">
            <Fact label="Accommodation" value={ACCOMMODATION_TYPES[listing.accommodationType]} />
            <Fact label="Rent" value={rentRange(listing.weeklyRentFrom, listing.weeklyRentTo)} />
            <Fact label="Available from" value={monthYear(listing.availableFrom)} />
            <Fact label="Who it's for" value={GENDER_ARRANGEMENTS[listing.genderArrangement]} />
            <Fact
              label="Age range"
              value={listing.minAge || listing.maxAge ? `${listing.minAge ?? 16}–${listing.maxAge ?? "any"}` : "Any adult"}
            />
            <Fact label="Bills" value={listing.billsIncluded ? "Included in rent" : "Not included"} />
            <Fact label="Housing benefit" value={listing.housingBenefit ? "Accepted" : "Not accepted"} />
            <Fact label="Facilities" value={listing.selfContained ? "Self-contained" : listing.ensuite ? "Ensuite room" : "Shared facilities"} />
            <Fact label="Access" value={listing.wheelchairAccess ? "Step-free" : "Not step-free"} />
          </section>

          <section className="mt-8">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="text-[22px]">Location map</h2>
                <p className="mt-1 text-[13px] text-ink-faint">
                  {listing.property.showExactAddress ? "Exact location supplied by the provider." : "Approximate area shown to protect the property's address."}
                </p>
              </div>
              {canViewMap && <span className="chip chip-active">Provided with this advert</span>}
            </div>
            {canViewMap ? (
              hasCoordinates && mapLatitude != null && mapLongitude != null ? (
                <div className="overflow-hidden rounded-card border border-line bg-paper">
                  <PropertyMap latitude={mapLatitude} longitude={mapLongitude} title={listing.title} approximate={!listing.property.showExactAddress} />
                </div>
              ) : (
                <div className="card p-5 text-[14px] text-ink-soft">The provider has not added map coordinates for this property yet.</div>
              )
            ) : (
              <div className="rounded-card border border-pine/20 bg-pine-light/35 p-5">
                <p className="font-medium text-ink">The provider has not included a map with this advert.</p>
                <p className="mt-1 max-w-[62ch] text-[14px] leading-relaxed text-ink-soft">Providers can add public advert maps with any paid or complimentary upgraded membership.</p>
              </div>
            )}
          </section>

          {listing.description && (
            <section className="mt-8">
              <h2 className="text-[22px]">About this accommodation</h2>
              <div className="prose-advert mt-3" dangerouslySetInnerHTML={{ __html: listing.description }} />
            </section>
          )}

          <section className="mt-8">
            <h2 className="text-[22px]">Support offered</h2>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              {listing.supportDescription && (
                <p className="prose-advert sm:col-span-2">{listing.supportDescription}</p>
              )}
              <Fact label="Support hours" value={listing.supportAvailability ?? "Ask the provider"} />
              <Fact label="Support delivered by" value={listing.supportProvider ?? "The provider"} />
              {listing.eligibility && <Fact label="Eligibility" value={listing.eligibility} wide />}
              {listing.referralProcess && <Fact label="How to apply" value={listing.referralProcess} wide />}
              <Fact
                label="Referral routes accepted"
                value={
                  listing.referralRoutes.length
                    ? listing.referralRoutes.map((route) => REFERRAL_ROUTES[route]).join(", ")
                    : "Ask the provider"
                }
                wide
              />
            </div>
          </section>

          <section className="mt-8">
            <h2 className="text-[22px]">Rooms</h2>
            <div className="mt-3 flex items-center gap-3">
              <RoomStrip rooms={listing.rooms} showLabels />
            </div>
            <ul className="card mt-4 divide-y divide-line">
              {listing.rooms.map((room) => (
                <li key={room.id} className="flex items-center justify-between gap-4 px-4 py-3">
                  <div>
                    <p className="text-[15px]">{room.name}</p>
                    <p className="text-[13px] text-ink-faint">
                      {[room.ensuite ? "Ensuite" : null, room.furnished ? "Furnished" : "Unfurnished",
                        room.availableFrom ? `From ${shortDate(room.availableFrom)}` : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <StatusPill
                    status={ROOM_STATUSES[room.status]}
                    tone={room.status === "AVAILABLE" ? "good" : room.status === "RESERVED" ? "warn" : "muted"}
                  />
                </li>
              ))}
            </ul>
          </section>

          {listing.houseRules && (
            <section className="mt-8">
              <h2 className="text-[22px]">House rules</h2>
              <p className="prose-advert mt-3">{listing.houseRules}</p>
            </section>
          )}

          <div className="mt-10">
            <ReportForm targetType="LISTING" targetId={listing.id} />
          </div>
        </div>

        {/* Action rail */}
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="card p-5">
            <p className="text-[22px] font-medium">{rentRange(listing.weeklyRentFrom, listing.weeklyRentTo)}</p>
            <p className="mt-1 text-[14px] text-ink-soft">
              {available.length} of {listing.rooms.length} rooms available
            </p>

            <div className="mt-4 space-y-2">
              {existingRequest ? (
                <Link href="/dashboard/requests" className="btn-secondary w-full">
                  Request sent — track it
                </Link>
              ) : (
                <Link href={`/listings/${listing.id}/request`} className="btn-primary w-full">
                  Request accommodation
                </Link>
              )}
              {user?.role === "REFERRER" && (
                <Link href={`/referrals/new?listingId=${listing.id}`} className="btn-secondary w-full">
                  Make a referral
                </Link>
              )}
              {user ? (
                <SaveButton listingId={listing.id} saved={Boolean(saved)} />
              ) : (
                <Link href={`/login?next=/listings/${listing.id}`} className="btn-secondary w-full">
                  Sign in to save
                </Link>
              )}
            </div>

            <p className="mt-4 text-[13px] leading-relaxed text-ink-faint">
              Messages and requests stay inside {brand.name}. Your contact details are never shown to
              the provider unless you share them.
            </p>
          </div>

          <div className="card p-5">
            <div className="flex items-start gap-3">
              {listing.company.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={listing.company.logoUrl}
                  alt={`${listing.company.name} logo`}
                  className="h-14 w-14 shrink-0 rounded-full border border-line bg-white object-cover"
                  loading="lazy"
                />
              ) : (
                <span
                  aria-hidden="true"
                  className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-pine-light text-[15px] font-semibold uppercase text-pine-dark"
                >
                  {companyInitials(listing.company.name)}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <h2 className="text-[17px] leading-snug">{listing.company.name}</h2>
                {listing.company.city && (
                  <p className="mt-0.5 text-[13px] text-ink-faint">{listing.company.city}</p>
                )}
              </div>
              {listing.company.verification === "APPROVED" && <VerifiedBadge />}
            </div>
            {listing.company.about && (
              <p className="mt-3 line-clamp-4 text-[14px] leading-relaxed text-ink-soft">{listing.company.about}</p>
            )}
            <Link href={`/companies/${listing.company.slug}`} className="btn-secondary mt-4 w-full">
              View provider profile
            </Link>
          </div>

          <MessageProviderForm listingId={listing.id} signedIn={Boolean(user)} companyName={listing.company.name} />
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 px-4 pb-[max(.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_24px_rgba(21,42,58,.10)] backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-medium text-ink">{rentRange(listing.weeklyRentFrom, listing.weeklyRentTo)}</p>
            <p className="text-[12px] text-ink-faint">{available.length} room{available.length === 1 ? "" : "s"} available</p>
          </div>
          <Link href={existingRequest ? "/dashboard/requests" : `/listings/${listing.id}/request`} className="btn-primary shrink-0 px-4">
            {existingRequest ? "Track request" : "Request room"}
          </Link>
        </div>
      </div>
    </div>
  );
}

function Fact({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <dt className="text-[13px] text-ink-faint">{label}</dt>
      <dd className="mt-0.5 text-[15px] leading-relaxed text-ink">{value}</dd>
    </div>
  );
}

function companyInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("");
}
