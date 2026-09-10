import Link from "next/link";
import { db } from "@/lib/db";
import { requireCompany } from "@/lib/rbac";
import { boostAllowance, planLimits } from "@/lib/billing";
import { DashboardShell } from "@/components/dashboard-shell";
import { EmptyState } from "@/components/ui";
import { FeaturedBadge, RoomStrip, StatusPill } from "@/components/badges";
import { ListingRowActions } from "@/components/listing-row-actions";
import { ProviderAdvertBoost } from "@/components/provider-advert-boost";
import { providerNav } from "../nav";
import { LISTING_STATUSES } from "@/lib/taxonomy";
import { rentRange, timeAgo } from "@/lib/format";
import { SPONSOR_PACKAGES, type SponsorPackage } from "@/lib/sponsor-packages";

export const metadata = { title: "My adverts" };
export const dynamic = "force-dynamic";

function isSponsorPackage(value: string | undefined): value is SponsorPackage {
  return !!value && value in SPONSOR_PACKAGES;
}

export default async function ProviderAdvertsPage({
  searchParams,
}: {
  searchParams: Promise<{ sponsor?: string; boost_pack?: string }>;
}) {
  const { sponsor, boost_pack: boostPurchase } = await searchParams;
  const sponsorChoice = isSponsorPackage(sponsor) ? sponsor : null;
  const { companyId } = await requireCompany();
  const [nav, limits, listings, boosts] = await Promise.all([
    providerNav(companyId),
    planLimits(companyId),
    db.listing.findMany({
      where: { companyId },
      orderBy: { updatedAt: "desc" },
      include: {
        rooms: { select: { status: true } },
        property: { select: { city: true, postcode: true } },
        media: { where: { type: "IMAGE" }, take: 1, orderBy: [{ isPrimary: "desc" }, { position: "asc" }] },
        _count: { select: { requests: true, referrals: true } },
      },
    }),
    boostAllowance(companyId),
  ]);

  return (
    <DashboardShell
      title="My adverts"
      subtitle={
        limits.membership.maxListings === -1
          ? "Unlimited adverts on your plan."
          : `${limits.used.listings} of ${limits.membership.maxListings} adverts used on the ${limits.membership.name} plan.`
      }
      nav={nav}
      active="/provider/adverts"
      action={
        limits.canAddListing ? (
          <Link href="/provider/adverts/new" className="btn-primary">Post an advert</Link>
        ) : (
          <Link href="/provider/membership" className="btn-secondary">Upgrade to post more</Link>
        )
      }
    >
      {boostPurchase === "complete" && (
        <p className="mb-4 rounded-[10px] border border-pine/30 bg-pine-light px-4 py-3 text-[14px] text-pine-dark">
          Boost credits added. Choose a live advert below to use one. You now have {boosts.totalRemaining} available.
        </p>
      )}
      {sponsorChoice && (
        <p className="mb-4 rounded-[10px] border border-clay/30 bg-clay-light px-4 py-3 text-[14px] text-clay-dark">
          Pick which live advert to sponsor for {SPONSOR_PACKAGES[sponsorChoice].label} — click{" "}
          <span className="font-medium">Sponsor this advert</span> on the one you want.
        </p>
      )}
      {listings.length === 0 ? (
        <EmptyState
          title="No adverts yet"
          body="Post your first advert and it goes to our team for review, usually within a working day."
          actionHref="/provider/adverts/new"
          actionLabel="Post an advert"
        />
      ) : (
        <ul className="space-y-4">
          {listings.map((listing) => (
            <li key={listing.id} className="card flex flex-wrap gap-5 p-4">
              <div className="h-24 w-32 shrink-0 overflow-hidden rounded-[10px] bg-paper-sunk">
                {listing.media[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={listing.media[0].url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="grid h-full place-items-center text-[12px] text-ink-faint">No photo</span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/provider/adverts/${listing.id}`} className="text-[17px] hover:text-pine-dark">
                    {listing.title}
                  </Link>
                  <StatusPill
                    status={LISTING_STATUSES[listing.status]}
                    tone={listing.status === "ACTIVE" ? "good" : listing.status === "PENDING_REVIEW" ? "warn" : "muted"}
                  />
                  {listing.featured && <FeaturedBadge />}
                </div>
                <p className="mt-1 text-[14px] text-ink-soft">
                  {listing.property.city} · {rentRange(listing.weeklyRentFrom, listing.weeklyRentTo)}
                </p>
                <p className="mt-1 text-[13px] text-ink-faint">
                  {listing.reference} · {listing.views} views · {listing._count.requests} requests ·{" "}
                  {listing._count.referrals} referrals · updated {timeAgo(listing.updatedAt)}
                </p>
                <div className="mt-3">
                  <RoomStrip rooms={listing.rooms} showLabels />
                </div>
                {listing.status === "REJECTED" && listing.rejectionNote && (
                  <p className="mt-3 rounded-[10px] bg-clay-light px-3 py-2 text-[13px] text-clay-dark">
                    Not approved: {listing.rejectionNote}
                  </p>
                )}
                {listing.status === "ACTIVE" && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {sponsorChoice && (
                      <Link
                        href={`/provider/adverts/${listing.id}?duration=${sponsorChoice}#sponsored`}
                        className="btn-secondary inline-flex"
                      >
                        Sponsor this advert
                      </Link>
                    )}
                    <ProviderAdvertBoost
                      listingId={listing.id}
                      boostedUntil={listing.boostedUntil?.toISOString() ?? null}
                      initiallyActive={!!listing.boostedUntil && listing.boostedUntil.getTime() > Date.now()}
                    />
                  </div>
                )}
              </div>

              <ListingRowActions id={listing.id} status={listing.status} />
            </li>
          ))}
        </ul>
      )}
    </DashboardShell>
  );
}
