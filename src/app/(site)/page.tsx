import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import { db } from "@/lib/db";
import { SearchPanel } from "@/components/search-panel";
import { ListingCard } from "@/components/listing-card";
import { searchListings } from "@/server/search";
import { JsonLd, locationSlug, pageMetadata } from "@/lib/seo";
import { guides } from "@/lib/guides";

export const dynamic = "force-dynamic";
export const metadata = pageMetadata({
  title: "HMO Rooms & Supported Accommodation UK",
  description: "Find HMO rooms, supported and transitional accommodation, adult social care housing and shared homes across the UK, or advertise vacancies on RoomsNow.",
  path: "/",
});

const ACCOMMODATION_LINKS = [
  ["HMO rooms", "Rooms in shared houses and HMOs", "/hmo-rooms"],
  ["Supported accommodation", "Housing with support for different needs", "/supported-accommodation"],
  ["Transitional accommodation", "Temporary and move-on housing", "/transitional-accommodation"],
  ["Adult social care", "Specialist accommodation for adults", "/adult-social-care-accommodation"],
] as const;

const FEATURED_CITIES = [
  {
    name: "Birmingham",
    description: "HMO rooms, supported housing and shared homes",
    image: "/locations/birmingham.webp",
  },
  {
    name: "Manchester",
    description: "Supported, transitional and specialist accommodation",
    image: "/locations/manchester.webp",
  },
  {
    name: "London",
    description: "Shared homes and accommodation across the capital",
    image: "/locations/london.webp",
  },
] as const;

export default async function HomePage() {
  const [roomsAvailable, providers, cities, featured] = await Promise.all([
    db.room.count({ where: { status: "AVAILABLE", listing: { status: "ACTIVE" } } }),
    db.company.count({ where: { status: "ACTIVE" } }),
    db.property.findMany({
      where: { listings: { some: { status: "ACTIVE" } } },
      select: { city: true },
      distinct: ["city"],
    }),
    searchListings({ sort: "featured" }),
  ]);
  const homepageListings = [
    ...featured.sponsored.map((listing) => ({ listing, sponsored: true })),
    ...featured.items.map((listing) => ({ listing, sponsored: false })),
  ].slice(0, 3);

  return (
    <>
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: "HMO rooms and supported accommodation across the UK",
        description: "Search HMO rooms, supported housing and specialist accommodation across the UK.",
      }} />

      <section className="surface-home relative overflow-hidden border-b border-line">
        <span aria-hidden="true" className="absolute -left-24 top-8 h-64 w-64 rounded-full bg-pine-light/55 blur-3xl" />
        <span aria-hidden="true" className="absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-[#d8ebfb]/65 blur-3xl" />
        <div className="shell relative py-10 text-center sm:py-14 lg:py-16">
          <h1 className="mx-auto max-w-[19ch] text-[40px] font-bold leading-[1.07] sm:text-[56px]">
            Find an <span className="text-pine-dark">HMO room or accommodation</span> that fits
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-[17px] leading-relaxed text-ink-soft">
            Search live HMO rooms, supported housing and specialist accommodation for yourself or someone you support.
          </p>

          <div className="mx-auto mt-7 max-w-4xl text-left">
            <Suspense fallback={<div className="h-[120px] rounded-card border border-line bg-white" />}>
              <SearchPanel />
            </Suspense>
          </div>

          <dl className="mt-7 flex flex-wrap justify-center gap-x-8 gap-y-3 text-[14px]">
            <Stat value={roomsAvailable} label="rooms available" />
            <Stat value={providers} label="active providers" />
            <Stat value={cities.length} label="areas with vacancies" />
          </dl>
        </div>
      </section>

      <section className="border-b border-line bg-white">
        <div className="shell py-10 sm:py-12">
          <h2 className="text-center text-[26px]">What would you like to do?</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <AudienceCard
              icon="search"
              eyebrow="LOOKING FOR A HOME"
              title="Search available rooms"
              body="Browse current vacancies and contact the provider directly."
              href="/search"
              cta="Find accommodation"
            />
            <AudienceCard
              icon="referral"
              eyebrow="PROFESSIONAL REFERRER"
              title="Place someone you support"
              body="Find suitable vacancies and send a structured referral."
              href="/accommodation-referrals"
              cta="Make a referral"
            />
            <AudienceCard
              icon="provider"
              eyebrow="LANDLORD OR PROVIDER"
              title="Advertise your vacancies"
              body="List HMO rooms and accommodation for people and referrers to find."
              href="/advertise-accommodation"
              cta="Advertise accommodation"
              highlighted
            />
          </div>
        </div>
      </section>

      {homepageListings.length > 0 && (
        <section className="shell py-12 sm:py-16">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="text-[12px] font-semibold tracking-[0.08em] text-pine-dark">LIVE VACANCIES</span>
              <h2 className="mt-2 text-[28px]">Recently listed accommodation</h2>
            </div>
            <Link href="/search" className="btn-secondary shrink-0">View all vacancies</Link>
          </div>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {homepageListings.map(({ listing, sponsored }) => (
              <ListingCard key={listing.id} listing={listing} compact sponsored={sponsored} />
            ))}
          </div>

          {cities.length > 0 && (
            <div className="mt-7 flex flex-wrap items-center gap-2 border-t border-line pt-6 text-[14px]">
              <span className="mr-1 font-semibold text-ink">Browse active areas</span>
              {cities.map(({ city }) => (
                <Link key={city} href={`/rooms/${locationSlug(city)}`} className="chip hover:border-pine hover:text-pine-dark">{city}</Link>
              ))}
            </div>
          )}
        </section>
      )}

      <section className="border-y border-line bg-white">
        <div className="shell py-12 sm:py-16">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="text-[12px] font-semibold tracking-[0.08em] text-pine-dark">POPULAR UK LOCATIONS</span>
              <h2 className="mt-2 text-[30px]">Explore accommodation by city</h2>
              <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-soft">
                Start with popular cities, then narrow your search by accommodation type and support need.
              </p>
            </div>
            <Link href="/search" className="btn-secondary shrink-0">View all locations</Link>
          </div>

          <div className="mt-7 grid gap-5 sm:grid-cols-3">
            {FEATURED_CITIES.map((city) => {
              const hasLiveListings = cities.some(({ city: activeCity }) => activeCity.toLowerCase() === city.name.toLowerCase());
              const href = hasLiveListings
                ? `/rooms/${locationSlug(city.name)}`
                : `/search?where=${encodeURIComponent(city.name)}`;

              return (
                <Link
                  key={city.name}
                  href={href}
                  className="group relative aspect-[4/3] overflow-hidden rounded-card bg-ink shadow-raise transition duration-300 hover:-translate-y-1 hover:shadow-float focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-pine"
                  aria-label={`Explore accommodation in ${city.name}`}
                >
                  <Image
                    src={city.image}
                    alt={`${city.name} city view`}
                    fill
                    sizes="(min-width: 640px) 33vw, 100vw"
                    className="object-cover transition duration-500 group-hover:scale-[1.04]"
                  />
                  <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[#092d4d]/95 via-[#092d4d]/20 to-transparent" />
                  <span className="absolute inset-x-0 bottom-0 block p-5 text-left text-white">
                    <span className="block text-[23px] font-bold leading-tight">{city.name}</span>
                    <span className="mt-1 block max-w-[28ch] text-[13px] leading-snug text-white/85">{city.description}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-b border-line bg-paper">
        <div className="shell grid gap-8 py-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-start lg:py-16">
          <div>
            <span className="text-[12px] font-semibold tracking-[0.08em] text-pine-dark">A SIMPLE PROCESS</span>
            <h2 className="mt-2 text-[30px]">From search to request</h2>
            <p className="mt-3 max-w-md text-[15px] leading-relaxed text-ink-soft">
              See public vacancy details before creating an account. Sign in only when you are ready to save, message or refer.
            </p>
            <Link href="/how-it-works" className="btn-secondary mt-6">See how RoomsNow works</Link>
          </div>
          <ol className="grid gap-4 sm:grid-cols-3">
            {[
              ["1", "Search", "Choose an area and filter by housing or support need."],
              ["2", "Compare", "Review availability, rent, facilities and referral routes."],
              ["3", "Connect", "Message, request a room or send a professional referral."],
            ].map(([number, title, body]) => (
              <li key={title} className="card p-5">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-pine text-[13px] font-semibold text-white">{number}</span>
                <h3 className="mt-4 text-[18px]">{title}</h3>
                <p className="mt-1.5 text-[14px] leading-relaxed text-ink-soft">{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="shell py-12 sm:py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="text-[12px] font-semibold tracking-[0.08em] text-pine-dark">EXPLORE HOUSING</span>
            <h2 className="mt-2 text-[28px]">Browse by accommodation type</h2>
          </div>
          <Link href="/search" className="text-[14px] font-semibold text-pine-dark hover:underline">Search everything →</Link>
        </div>
        <div className="mt-6 grid gap-x-8 gap-y-3 sm:grid-cols-2">
          {ACCOMMODATION_LINKS.map(([title, body, href]) => (
            <Link key={href} href={href} className="group flex items-center justify-between gap-4 border-b border-line py-4">
              <span>
                <span className="block text-[17px] font-semibold text-ink group-hover:text-pine-dark">{title}</span>
                <span className="mt-0.5 block text-[14px] text-ink-soft">{body}</span>
              </span>
              <span aria-hidden="true" className="text-pine-dark">→</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-t border-line bg-white">
        <div className="shell py-12 sm:py-16">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="text-[12px] font-semibold tracking-[0.08em] text-pine-dark">HELPFUL GUIDES</span>
              <h2 className="mt-2 text-[28px]">Feel more prepared before you choose</h2>
            </div>
            <Link href="/guides" className="text-[14px] font-semibold text-pine-dark hover:underline">View all guides →</Link>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {guides.slice(0, 3).map((guide) => (
              <Link key={guide.slug} href={`/guides/${guide.slug}`} className="card interactive-card group flex min-h-[190px] flex-col p-5">
                <span className="text-[11px] font-semibold tracking-[0.07em] text-pine-dark">{guide.eyebrow}</span>
                <h3 className="mt-3 text-[20px] leading-snug group-hover:text-pine-dark">{guide.title}</h3>
                <p className="mt-2 line-clamp-2 text-[14px] leading-relaxed text-ink-soft">{guide.description}</p>
                <span className="mt-auto pt-4 text-[14px] font-semibold text-pine-dark">Read guide →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <dt className="font-display text-[22px] font-bold text-pine-dark">{value.toLocaleString("en-GB")}</dt>
      <dd className="text-ink-soft">{label}</dd>
    </div>
  );
}

function AudienceCard({
  icon,
  eyebrow,
  title,
  body,
  href,
  cta,
  highlighted = false,
}: {
  icon: "search" | "referral" | "provider";
  eyebrow: string;
  title: string;
  body: string;
  href: string;
  cta: string;
  highlighted?: boolean;
}) {
  return (
    <article className={highlighted ? "rounded-card bg-gradient-to-br from-pine-dark to-pine p-6 text-white shadow-float" : "card border-t-4 border-t-pine/30 bg-pine-light/25 p-6"}>
      <div className="flex items-center justify-between gap-4">
        <span className={highlighted ? "text-[11px] font-semibold tracking-[0.08em] text-pine-light" : "text-[11px] font-semibold tracking-[0.08em] text-pine-dark"}>{eyebrow}</span>
        <AudienceIcon type={icon} highlighted={highlighted} />
      </div>
      <h3 className={highlighted ? "mt-3 text-[21px] text-white" : "mt-3 text-[21px]"}>{title}</h3>
      <p className={highlighted ? "mt-2 text-[14px] leading-relaxed text-white/80" : "mt-2 text-[14px] leading-relaxed text-ink-soft"}>{body}</p>
      <Link href={href} className={highlighted ? "btn mt-5 bg-white text-pine-dark hover:bg-pine-light" : "btn-secondary mt-5"}>{cta}</Link>
    </article>
  );
}

function AudienceIcon({ type, highlighted }: { type: "search" | "referral" | "provider"; highlighted: boolean }) {
  const paths = {
    search: <><circle cx="10.5" cy="10.5" r="5.5" /><path d="m15 15 4 4" /></>,
    referral: <><path d="M8 7a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" /><path d="M2.5 20v-2.5A4.5 4.5 0 0 1 7 13h2" /><path d="M14 14h7m-3-3 3 3-3 3" /></>,
    provider: <><path d="M3 20V8l9-5 9 5v12" /><path d="M8 20v-6h8v6M8 10h.01M12 10h.01M16 10h.01" /></>,
  };

  return (
    <span className={highlighted ? "grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/15 text-white" : "grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-pine-dark shadow-sm"} aria-hidden="true">
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {paths[type]}
      </svg>
    </span>
  );
}
