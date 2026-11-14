import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { ListingCard } from "@/components/listing-card";
import { LISTING_CARD_SELECT } from "@/server/search";
import { matchesNeighbourhood, neighbourhoodFromSlug, sharedLocalResources } from "@/lib/neighbourhood-guides";
import { JsonLd, absoluteUrl, pageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ neighbourhood: string }> };
export async function generateMetadata({ params }: Props) {
  const guide = neighbourhoodFromSlug((await params).neighbourhood);
  if (!guide) return { title: "Area not found", robots: { index: false } };
  return pageMetadata({ title: `Supported Accommodation & HMO Rooms in ${guide.name}, Birmingham (${guide.postcodes.join(", ")})`, description: `Find supported accommodation, HMO rooms and shared housing in ${guide.name}, Birmingham. Live available rooms from providers, plus local transport, GP, Jobcentre and food support.`, path: `/areas/birmingham/${guide.slug}` });
}

export default async function NeighbourhoodPage({ params }: Props) {
  const guide = neighbourhoodFromSlug((await params).neighbourhood);
  if (!guide) notFound();
  const candidates = await db.listing.findMany({
    where: {
      status: "ACTIVE", company: { status: "ACTIVE" }, rooms: { some: { status: "AVAILABLE" } },
      property: { OR: [{ area: { equals: guide.name, mode: "insensitive" } }, ...guide.postcodes.map((pc) => ({ postcode: { startsWith: pc, mode: "insensitive" as const } }))] },
    },
    include: LISTING_CARD_SELECT, orderBy: { publishedAt: "desc" }, take: 60,
  });
  const listings = candidates.filter((listing) => matchesNeighbourhood(guide, listing.property)).slice(0, 24).map((listing) => ({ ...listing, distanceMiles: null }));
  const path = `/areas/birmingham/${guide.slug}`;
  return <main className="shell py-8 sm:py-12">
    <JsonLd data={{ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Birmingham guides", item: absoluteUrl("/areas/birmingham") }, { "@type": "ListItem", position: 2, name: guide.name, item: absoluteUrl(path) }] }} />
    <Link href="/areas/birmingham" className="text-[14px] text-pine-dark">← Birmingham neighbourhood guides</Link>
    <header className="mt-5 rounded-[20px] border border-line bg-pine-light/30 p-6 sm:p-9">
      <span className="eyebrow">Birmingham · {guide.postcodes.join(", ")}</span>
      <h1 className="mt-3 text-[34px] leading-tight sm:text-[46px]">Supported accommodation and rooms in {guide.name}</h1>
      <p className="mt-3 text-[15px] font-semibold text-pine-dark">{listings.length ? `${listings.length} live advert${listings.length === 1 ? "" : "s"} with rooms available now` : "New rooms are added every week"}</p>
      <p className="mt-4 max-w-[70ch] text-[17px] leading-relaxed text-ink-soft">{guide.summary}</p>
      <div className="mt-5 flex flex-wrap gap-3"><a href="#available-rooms" className="btn-primary">See available rooms</a><Link href="/housing-benefit-calculator" className="btn-secondary">Rent and benefit calculator</Link></div>
    </header>
    <section id="available-rooms" className="mt-8 scroll-mt-24">
      <h2 className="text-[26px]">Available rooms in {guide.name}</h2>
      <p className="mt-2 text-ink-soft">Live adverts with available rooms labelled {guide.name} or in the {guide.postcodes.join(", ")} postcode district. Confirm current availability before travelling.</p>
      {listings.length ? <div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{listings.map((listing) => <ListingCard key={listing.id} listing={listing} />)}</div> : <div className="card mt-5 p-6"><p>No rooms are available in {guide.name} right now. Explore Birmingham or save a search to hear about new rooms.</p><Link href="/search?where=Birmingham" className="btn-primary mt-4">Search Birmingham accommodation</Link></div>}
      <Link href={`/search?where=${encodeURIComponent(`${guide.name}, Birmingham`)}`} className="btn-secondary mt-5">Search around {guide.name}</Link>
    </section>
    <section className="mt-8" aria-labelledby="local-services">
      <h2 id="local-services" className="text-[26px]">Everyday services and support</h2>
      <p className="mt-2 text-ink-soft">{guide.postcodeHint} Opening hours and routes can change; check the linked service before travelling.</p>
      <div className="mt-5 grid gap-4 md:grid-cols-2">{[...guide.resources, ...sharedLocalResources].map((resource) => <article className="card p-5" key={resource.title}><h3 className="text-[20px]">{resource.title}</h3><p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{resource.detail}</p><a href={resource.url} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block text-[14px] font-semibold text-pine-dark underline">{resource.source} ↗</a></article>)}</div>
    </section>
    <section className="card mt-6 p-6"><h2 className="text-[22px]">Before choosing accommodation in {guide.name}</h2><p className="mt-3 leading-relaxed text-ink-soft">{guide.viewingTip}</p><ul className="mt-4 list-disc space-y-2 pl-5 text-[15px] text-ink-soft"><li>Ask what rent includes, which charges are extra and how the deposit works.</li><li>Confirm room availability and the move-in date directly with the provider.</li><li>If you need support, ask about staffing hours, referral criteria and who funds the placement.</li><li>Check the route to your GP, work or Jobcentre at the time you actually travel.</li></ul><Link href="/guides" className="mt-4 inline-block text-pine-dark underline">Read room-viewing and referral guides →</Link></section>
    <p className="mt-8 text-[12px] text-ink-faint">Local sources for the Erdington, Handsworth and Small Heath guides checked 7 October 2026. Service links are information, not endorsements. NHS and DWP postcode tools identify nearby services; this guide does not claim a specific practice or office is nearest to every property.</p>
  </main>;
}
