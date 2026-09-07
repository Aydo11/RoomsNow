import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireCompany } from "@/lib/rbac";
import { billingAvailable, planLimits } from "@/lib/billing";
import { DashboardShell, StatCard } from "@/components/dashboard-shell";
import { FeaturedBadge, RoomStrip, StatusPill } from "@/components/badges";
import { ListingRowActions } from "@/components/listing-row-actions";
import { RoomBoard } from "@/components/room-board";
import { SponsorPanel } from "@/components/sponsor-panel";
import { providerNav } from "../../nav";
import { LISTING_STATUSES } from "@/lib/taxonomy";
import { rentRange, shortDate } from "@/lib/format";
import { SPONSOR_PACKAGES, type SponsorPackage } from "@/lib/sponsor-packages";

export const dynamic = "force-dynamic";

function isSponsorPackage(value: string | undefined): value is SponsorPackage {
  return !!value && value in SPONSOR_PACKAGES;
}

export default async function ProviderAdvertPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ duration?: string }>;
}) {
  const { companyId } = await requireCompany();
  const { id } = await params;
  const { duration } = await searchParams;
  const initialDuration = isSponsorPackage(duration) ? duration : undefined;
  const listing = await db.listing.findFirst({
    where: { id, companyId },
    include: {
      property: true,
      rooms: { orderBy: { name: "asc" } },
      media: { orderBy: [{ isPrimary: "desc" }, { position: "asc" }] },
      _count: { select: { requests: true, referrals: true, saves: true } },
    },
  });
  if (!listing) notFound();

  const [nav, limits, usedSlots] = await Promise.all([
    providerNav(companyId),
    planLimits(companyId),
    db.listing.count({
      where: {
        companyId,
        featured: true,
        OR: [{ featuredUntil: null }, { featuredUntil: { gte: new Date() } }],
      },
    }),
  ]);
  const includedSlots = limits.membership.featuredCredits;

  return (
    <DashboardShell
      title={listing.title}
      subtitle={`${listing.reference} · ${listing.property.city} · ${rentRange(listing.weeklyRentFrom, listing.weeklyRentTo)}`}
      nav={nav}
      active="/provider/adverts"
      action={
        listing.status === "ACTIVE" ? (
          <Link href={`/listings/${listing.id}`} className="btn-secondary">View public advert</Link>
        ) : null
      }
    >
      <section aria-label="Manage advert" className="card overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-line bg-paper-sunk/50 px-5 py-3">
          <span className="mr-2 text-[13px] font-medium text-ink-soft">Advert status</span>
          <StatusPill
            status={LISTING_STATUSES[listing.status]}
            tone={listing.status === "ACTIVE" ? "good" : listing.status === "PENDING_REVIEW" ? "warn" : "muted"}
          />
          {listing.featured && (!listing.featuredUntil || listing.featuredUntil > new Date()) && <FeaturedBadge />}
          {listing.featured && listing.featuredUntil && listing.featuredUntil > new Date() && (
            <span className="text-[13px] text-ink-soft">Promoted until {shortDate(listing.featuredUntil)}</span>
          )}
        </div>
        <div className="p-4 sm:px-5"><ListingRowActions id={listing.id} status={listing.status} /></div>
      </section>

      {listing.status === "REJECTED" && listing.rejectionNote && (
        <p className="card mt-4 border-clay/30 p-4 text-[15px] text-clay-dark">
          Our team didn&apos;t approve this advert: {listing.rejectionNote}
        </p>
      )}

      <div className="mt-5 grid grid-cols-2 gap-3 sm:mt-6 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Views" value={listing.views} />
        <StatCard label="Requests" value={listing._count.requests} />
        <StatCard label="Referrals" value={listing._count.referrals} />
        <StatCard label="Saved by" value={listing._count.saves} />
      </div>

      <section className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[20px]">Rooms</h2>
          <RoomStrip rooms={listing.rooms} showLabels />
        </div>
        <div className="mt-3">
          <RoomBoard listingId={listing.id} rooms={listing.rooms} />
        </div>
      </section>

      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-[20px]">Photos and video</h2>
          <Link href={`/provider/adverts/${listing.id}/media`} className="text-[14px] text-pine-dark hover:underline">
            Manage media
          </Link>
        </div>
        {listing.media.length === 0 ? (
          <p className="card mt-3 p-5 text-[15px] text-ink-soft">
            No photos yet. Adverts with photos get far more enquiries.
          </p>
        ) : (
          <ul className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-5">
            {listing.media.slice(0, 10).map((item) => (
              <li key={item.id} className="aspect-[4/3] overflow-hidden rounded-[10px] bg-paper-sunk">
                {item.type === "IMAGE" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.url} alt={item.caption ?? ""} className="h-full w-full object-cover" />
                ) : (
                  <span className="grid h-full place-items-center text-[12px] text-ink-faint">Video</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section id="sponsored" className="mt-8 scroll-mt-20">
        <h2 className="text-[20px]">Sponsored placement</h2>
        <div className="mt-3">
          <SponsorPanel
            listingId={listing.id}
            featured={listing.featured}
            featuredUntil={listing.featuredUntil?.toISOString() ?? null}
            impressions={listing.sponsoredImpressions}
            clicks={listing.sponsoredClicks}
            includedSlots={includedSlots}
            usedSlots={usedSlots}
            live={listing.status === "ACTIVE"}
            paymentsEnabled={billingAvailable()}
            initialDuration={initialDuration}
          />
        </div>
      </section>
    </DashboardShell>
  );
}
