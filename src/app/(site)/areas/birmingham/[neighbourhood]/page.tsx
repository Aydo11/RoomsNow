import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { ListingCard } from "@/components/listing-card";
import { LISTING_CARD_SELECT } from "@/server/search";
import { matchesNeighbourhood, neighbourhoodFromSlug, neighbourhoodGuides, sharedLocalResources } from "@/lib/neighbourhood-guides";
import { JsonLd, absoluteUrl, pageMetadata } from "@/lib/seo";
import { money } from "@/lib/format";

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
  // Live facts make each area page different from the others (thin, look-alike pages get skipped by Google).
  const rents = listings.map((l) => l.weeklyRentFrom).filter((r): r is number => r != null && r > 0);
  const roomsFree = listings.reduce((n, l) => n + l.rooms.filter((r) => r.status === "AVAILABLE").length, 0);
  const hbCount = listings.filter((l) => l.housingBenefit).length;
  const rentText = rents.length ? `${money(Math.min(...rents))} to ${money(Math.max(...rents))} a week` : null;
  const otherAreas = neighbourhoodGuides.filter((g) => g.slug !== guide.slug);
  const faqs = [
    { q: `Are there rooms available in ${guide.name} now?`, a: listings.length ? `Yes. ${listings.length} live advert${listings.length === 1 ? "" : "s"} on RoomsNow have ${roomsFree} room${roomsFree === 1 ? "" : "s"} available in ${guide.name} (${guide.postcodes.join(", ")}). Availability changes daily, so confirm with the provider.` : `Not at the moment. New rooms are added every week; save a search to hear when one comes up.` },
    ...(rentText ? [{ q: `How much is a room in ${guide.name}?`, a: `Live adverts in ${guide.name} list rent from ${rentText}. Check what the rent includes with the provider.` }] : []),
    ...(listings.length ? [{ q: `Do providers in ${guide.name} accept Housing Benefit?`, a: `${hbCount} of ${listings.length} live adverts in ${guide.name} say Housing Benefit is accepted. Each advert shows this.` }] : []),
  ];
  return <main className="shell py-8 sm:py-12">
    <JsonLd data={{ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Birmingham guides", item: absoluteUrl("/areas/birmingham") }, { "@type": "ListItem", position: 2, name: guide.name, item: absoluteUrl(path) }] }} />
    <JsonLd data={{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }} />
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
    {listings.length > 0 && <section className="card mt-8 p-6" aria-labelledby="area-facts">
      <h2 id="area-facts" className="text-[22px]">{guide.name} rooms at a glance</h2>
      <dl className="mt-4 grid gap-4 sm:grid-cols-3">
        <div><dt className="text-[13px] text-ink-faint">Rooms available now</dt><dd className="text-[24px] font-semibold">{roomsFree}</dd></div>
        {rentText && <div><dt className="text-[13px] text-ink-faint">Advertised rent</dt><dd className="text-[18px] font-semibold">{rentText}</dd></div>}
        <div><dt className="text-[13px] text-ink-faint">Accept Housing Benefit</dt><dd className="text-[24px] font-semibold">{hbCount} of {listings.length}</dd></div>
      </dl>
    </section>}
    <section className="mt-8" aria-labelledby="local-services">
      <h2 id="local-services" className="text-[26px]">Everyday services and support</h2>
      <p className="mt-2 text-ink-soft">{guide.postcodeHint} Opening hours and routes can change; check the linked service before travelling.</p>
      <div className="mt-5 grid gap-4 md:grid-cols-2">{[...guide.resources, ...sharedLocalResources].map((resource) => <article className="card p-5" key={resource.title}><h3 className="text-[20px]">{resource.title}</h3><p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{resource.detail}</p><a href={resource.url} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block text-[14px] font-semibold text-pine-dark underline">{resource.source} ↗</a></article>)}</div>
    </section>
    <section className="card mt-6 p-6"><h2 className="text-[22px]">Before choosing accommodation in {guide.name}</h2><p className="mt-3 leading-relaxed text-ink-soft">{guide.viewingTip}</p><ul className="mt-4 list-disc space-y-2 pl-5 text-[15px] text-ink-soft"><li>Ask what rent includes, which charges are extra and how the deposit works.</li><li>Confirm room availability and the move-in date directly with the provider.</li><li>If you need support, ask about staffing hours, referral criteria and who funds the placement.</li><li>Check the route to your GP, work or Jobcentre at the time you actually travel.</li></ul><Link href="/guides" className="mt-4 inline-block text-pine-dark underline">Read room-viewing and referral guides →</Link></section>
    <section className="mt-8" aria-labelledby="area-faq">
      <h2 id="area-faq" className="text-[22px]">Questions about rooms in {guide.name}</h2>
      <div className="mt-4 space-y-4">{faqs.map((f) => <div key={f.q}><h3 className="text-[17px] font-semibold">{f.q}</h3><p className="mt-1 text-ink-soft">{f.a}</p></div>)}</div>
    </section>
    <nav className="mt-8" aria-label="Other Birmingham areas">
      <h2 className="text-[22px]">Rooms in other Birmingham areas</h2>
      <div className="mt-4 flex flex-wrap gap-2">{otherAreas.map((g) => <Link key={g.slug} href={`/areas/birmingham/${g.slug}`} className="chip">{g.name}</Link>)}</div>
    </nav>
    <p className="mt-8 text-[12px] text-ink-faint">Local sources for the Erdington, Handsworth and Small Heath guides checked 7 October 2026. Service links are information, not endorsements. NHS and DWP postcode tools identify nearby services; this guide does not claim a specific practice or office is nearest to every property.</p>
  </main>;
}
