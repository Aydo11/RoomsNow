import { SeoLandingPage } from "@/components/seo-landing-page";
import { hmoRoomsBirminghamContent } from "@/lib/seo-content";
import { pageMetadata } from "@/lib/seo";
import Link from "next/link";
import { ListingCard } from "@/components/listing-card";
import { db } from "@/lib/db";
import { LISTING_CARD_SELECT } from "@/server/search";

export const dynamic = "force-dynamic";

export const metadata = pageMetadata({
  title: "HMO Rooms in Birmingham",
  description: "Search HMO rooms and shared accommodation in Birmingham. Compare rent, bills, facilities, room availability and provider details.",
  path: hmoRoomsBirminghamContent.path,
});

export default async function HmoRoomsBirminghamPage() {
  const listings = await db.listing.findMany({
    where: {
      status: "ACTIVE",
      accommodationType: "SHARED_ACCOMMODATION",
      company: { status: "ACTIVE" },
      rooms: { some: { status: "AVAILABLE" } },
      property: { city: { equals: "Birmingham", mode: "insensitive" } },
    },
    orderBy: [{ publishedAt: "desc" }, { id: "asc" }],
    take: 12,
    include: LISTING_CARD_SELECT,
  });

  return (
    <SeoLandingPage content={hmoRoomsBirminghamContent}>
      <section className="shell py-10 sm:py-12" aria-labelledby="birmingham-vacancies">
        <h2 id="birmingham-vacancies" className="text-[28px]">Available shared rooms in Birmingham</h2>
        <p className="mt-3 max-w-3xl text-[16px] leading-7 text-ink-soft">
          Explore current shared-accommodation adverts, including homes with support. Check each advert for rent, benefits accepted and referral requirements, then confirm suitability and availability with the provider. A shared-accommodation advert does not by itself confirm HMO licensing.
        </p>
        {listings.length ? (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((listing) => <ListingCard key={listing.id} listing={{ ...listing, distanceMiles: null }} />)}
          </div>
        ) : (
          <p className="mt-6 text-ink-soft">There are currently no shared-accommodation adverts with available rooms in Birmingham. Check the wider Birmingham search for other accommodation types.</p>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/search?where=Birmingham&type=SHARED_ACCOMMODATION" className="btn-primary">View all Birmingham shared rooms</Link>
          <Link href="/rooms/birmingham" className="btn-secondary">All Birmingham accommodation</Link>
        </div>
      </section>
    </SeoLandingPage>
  );
}
