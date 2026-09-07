import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ListingCard } from "@/components/listing-card";
import { db } from "@/lib/db";
import { JsonLd, absoluteUrl, locationSlug, pageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ city: string }> };

async function findCity(slug: string) {
  const cities = await db.property.findMany({
    where: { listings: { some: { status: "ACTIVE" } } },
    select: { city: true },
    distinct: ["city"],
  });
  return cities.find((item) => locationSlug(item.city) === slug)?.city ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { city: slug } = await params;
  const city = await findCity(slug);
  if (!city) return { title: "Rooms not found", robots: { index: false, follow: true } };
  return pageMetadata({
    title: `HMO Rooms & Accommodation in ${city}`,
    description: `Search available HMO rooms, shared housing and supported accommodation in ${city}. Compare vacancies and contact providers on RoomsNow.`,
    path: `/rooms/${slug}`,
  });
}

export default async function CityRoomsPage({ params }: Props) {
  const { city: slug } = await params;
  const city = await findCity(slug);
  if (!city) notFound();

  const listings = await db.listing.findMany({
    where: { status: "ACTIVE", property: { city: { equals: city, mode: "insensitive" } } },
    orderBy: [{ featured: "desc" }, { publishedAt: "desc" }],
    include: {
      company: { select: { id: true, name: true, slug: true, logoUrl: true, verification: true } },
      property: { select: { city: true, area: true, postcode: true, showExactAddress: true, addressLine1: true, latitude: true, longitude: true, verification: true } },
      media: { where: { type: "IMAGE" }, orderBy: [{ isPrimary: "desc" }, { position: "asc" }], take: 1 },
      rooms: { select: { status: true } },
    },
  });

  const url = absoluteUrl(`/rooms/${slug}`);
  return (
    <>
      <JsonLd data={[
        {
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: `HMO rooms and accommodation in ${city}`,
          url,
          description: `Available HMO rooms, shared housing and supported accommodation in ${city}.`,
        },
        {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
            { "@type": "ListItem", position: 2, name: "Rooms", item: absoluteUrl("/search") },
            { "@type": "ListItem", position: 3, name: city, item: url },
          ],
        },
      ]} />
      <section className="surface-home border-b border-line">
        <div className="shell py-12 sm:py-16">
          <nav className="text-[14px] text-ink-faint"><Link href="/search" className="hover:text-ink">Search accommodation</Link> / {city}</nav>
          <h1 className="mt-5 text-[40px] font-bold leading-tight sm:text-[52px]">HMO rooms and accommodation in {city}</h1>
          <p className="mt-4 max-w-3xl text-[17px] leading-relaxed text-ink-soft">Search available HMO rooms, shared homes, supported housing and specialist accommodation in {city}. Check rent, facilities, support, referral routes and live room availability before contacting the provider.</p>
          <Link href={`/search?where=${encodeURIComponent(city)}`} className="btn-primary mt-7">Refine your {city} search</Link>
        </div>
      </section>
      <div className="shell py-12">
        <h2 className="text-[28px]">Available accommodation in {city}</h2>
        <p className="mt-2 text-[15px] text-ink-soft">{listings.length} live {listings.length === 1 ? "advert" : "adverts"} from providers serving {city}.</p>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((listing) => <ListingCard key={listing.id} listing={{ ...listing, distanceMiles: null }} />)}
        </div>
        <section className="mt-14 max-w-3xl">
          <h2 className="text-[28px]">Finding a suitable room in {city}</h2>
          <p className="mt-3 text-[16px] leading-7 text-ink-soft">Compare the accommodation type, weekly rent, bills, availability and household arrangement shown on each advert. If support is needed, review the support categories, eligibility information and accepted referral routes before sending an enquiry.</p>
          <p className="mt-4 text-[16px] leading-7 text-ink-soft">RoomsNow connects people and professional referrers with independent providers. The provider remains responsible for the property, assessment, suitability and placement decision.</p>
        </section>
      </div>
    </>
  );
}
