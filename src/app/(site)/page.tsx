import Link from "next/link";
import { Suspense } from "react";
import { db } from "@/lib/db";
import { SearchPanel } from "@/components/search-panel";
import { ListingCard } from "@/components/listing-card";
import { searchListings } from "@/server/search";
import { JsonLd, locationSlug, pageMetadata } from "@/lib/seo";

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

  return (
    <>
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: "HMO rooms and supported accommodation across the UK",
        description: "Search HMO rooms, supported housing and specialist accommodation across the UK.",
      }} />

      <section className="surface-home border-b border-line">
        <div className="shell py-12 text-center sm:py-16 lg:py-20">
          <h1 className="mx-auto max-w-[19ch] text-[40px] font-bold leading-[1.07] sm:text-[56px]">
            Find an <span className="text-pine-dark">HMO room or accommodation</span> that fits
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-[17px] leading-relaxed text-ink-soft">
            Search live HMO rooms, supported housing and specialist accommodation for yourself or someone you support.
          </p>

          <div className="mx-auto mt-8 max-w-4xl text-left">
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
              eyebrow="LOOKING FOR A HOME"
              title="Search available rooms"
              body="Browse current vacancies and contact the provider directly."
              href="/search"
              cta="Find accommodation"
            />
            <AudienceCard
              eyebrow="PROFESSIONAL REFERRER"
              title="Place someone you support"
              body="Find suitable vacancies and send a structured referral."
              href="/accommodation-referrals"
              cta="Make a referral"
            />
            <AudienceCard
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

      {featured.items.length > 0 && (
        <section className="shell py-12 sm:py-16">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="text-[12px] font-semibold tracking-[0.08em] text-pine-dark">LIVE VACANCIES</span>
              <h2 className="mt-2 text-[28px]">Recently listed accommodation</h2>
            </div>
            <Link href="/search" className="btn-secondary shrink-0">View all vacancies</Link>
          </div>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.items.slice(0, 3).map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
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
  eyebrow,
  title,
  body,
  href,
  cta,
  highlighted = false,
}: {
  eyebrow: string;
  title: string;
  body: string;
  href: string;
  cta: string;
  highlighted?: boolean;
}) {
  return (
    <article className={highlighted ? "rounded-card bg-gradient-to-br from-pine-dark to-pine p-6 text-white shadow-float" : "card p-6"}>
      <span className={highlighted ? "text-[11px] font-semibold tracking-[0.08em] text-pine-light" : "text-[11px] font-semibold tracking-[0.08em] text-pine-dark"}>{eyebrow}</span>
      <h3 className={highlighted ? "mt-3 text-[21px] text-white" : "mt-3 text-[21px]"}>{title}</h3>
      <p className={highlighted ? "mt-2 text-[14px] leading-relaxed text-white/80" : "mt-2 text-[14px] leading-relaxed text-ink-soft"}>{body}</p>
      <Link href={href} className={highlighted ? "btn mt-5 bg-white text-pine-dark hover:bg-pine-light" : "btn-secondary mt-5"}>{cta}</Link>
    </article>
  );
}
