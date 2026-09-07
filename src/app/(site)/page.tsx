import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import { db } from "@/lib/db";
import { SearchPanel } from "@/components/search-panel";
import { ListingCard } from "@/components/listing-card";
import { searchListings } from "@/server/search";
import { SUPPORT_TYPES } from "@/lib/taxonomy";
import { JsonLd, locationSlug, pageMetadata } from "@/lib/seo";

const POPULAR_LOCATIONS = [
  {
    name: "Birmingham",
    description: "HMOs, supported housing and shared homes",
    image: "/locations/birmingham.webp",
  },
  {
    name: "Manchester",
    description: "Supported, transitional and specialist housing",
    image: "/locations/manchester.webp",
  },
  {
    name: "London",
    description: "Shared homes and accommodation across the capital",
    image: "/locations/london.webp",
  },
] as const;

export const dynamic = "force-dynamic";
export const metadata = pageMetadata({
  title: "HMO Rooms & Supported Accommodation UK",
  description: "Find HMO rooms, supported and transitional accommodation, adult social care housing and shared homes across the UK, or advertise vacancies on RoomsNow.",
  path: "/",
});

export default async function HomePage() {
  const [roomsAvailable, providers, cities, featured] = await Promise.all([
    db.room.count({ where: { status: "AVAILABLE", listing: { status: "ACTIVE" } } }),
    db.company.count({ where: { status: "ACTIVE" } }),
    db.property.findMany({ where: { listings: { some: { status: "ACTIVE" } } }, select: { city: true }, distinct: ["city"] }),
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
      {/* Hero: the search is the product, so it leads. */}
      <section className="surface-home relative overflow-hidden border-b border-line">
        <div aria-hidden="true" className="soft-orb absolute -left-32 top-0 h-[34rem] w-[34rem]" />
        <div aria-hidden="true" className="soft-orb absolute -right-44 bottom-[-16rem] h-[34rem] w-[34rem]" />
        <div className="shell relative grid gap-10 py-14 lg:grid-cols-[1.05fr_0.95fr] lg:py-20">
          <div className="self-center">
            <span className="eyebrow"><span className="h-1.5 w-1.5 rounded-full bg-pine" />More housing, in one place</span>
            <h1 className="mt-5 max-w-[15ch] text-[42px] font-bold leading-[1.07] sm:text-[58px]">
              Find <span className="text-pine-dark">HMO rooms and accommodation</span> across the UK
            </h1>
            <p className="mt-5 max-w-[52ch] text-[17px] leading-relaxed text-ink-soft">
              Search HMOs, supported and transitional accommodation, adult social care housing,
              shared homes and self-contained properties. Look for yourself or refer someone you support.
            </p>

            <div className="mt-8">
              <Suspense fallback={<div className="h-[120px] rounded-card border border-line bg-white" />}>
                <SearchPanel />
              </Suspense>
            </div>

            <dl className="mt-8 flex flex-wrap gap-x-8 gap-y-3 text-[15px]">
              <Stat value={roomsAvailable} label="rooms available now" />
              <Stat value={providers} label="providers advertising" />
              <Stat value={cities.length} label="towns and cities" />
            </dl>
          </div>

          {/* Availability board — the thing this market actually runs on. */}
          <AvailabilityBoard />
        </div>
      </section>

      <section className="border-y border-line bg-white">
        <div className="shell py-14">
          <span className="text-[13px] font-semibold tracking-[0.08em] text-pine-dark">SEARCH BY ACCOMMODATION TYPE</span>
          <h2 className="mt-2 text-[30px]">Housing for different needs</h2>
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-soft">Explore HMO rooms, supported housing and specialist accommodation, or learn how to advertise vacancies and make professional referrals.</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["HMO rooms to rent", "Shared homes and rooms in HMOs across the UK.", "/hmo-rooms"],
              ["Supported accommodation", "Housing advertised with support for a range of needs.", "/supported-accommodation"],
              ["Transitional accommodation", "Temporary, move-on and transitional housing options.", "/transitional-accommodation"],
              ["Adult social care accommodation", "Specialist accommodation for adults with care or support needs.", "/adult-social-care-accommodation"],
              ["Advertise accommodation", "List HMO rooms and housing vacancies for people and referrers.", "/advertise-accommodation"],
              ["Accommodation referrals", "Search vacancies and refer someone you support.", "/accommodation-referrals"],
            ].map(([title, body, href]) => (
              <Link key={href} href={href} className="interactive-card card p-6">
                <h3 className="text-[19px]">{title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">{body}</p>
                <span className="mt-4 inline-block text-[14px] font-semibold text-pine-dark">Explore →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="shell grid gap-4 py-14 sm:grid-cols-2 lg:grid-cols-3">
        <PathCard
          heading="Looking for somewhere to live"
          body="Tell providers what you need and where. They can find you, and you can search their rooms."
          href="/register?type=USER"
          cta="Create your advert"
        />
        <PathCard
          heading="Placing someone you support"
          body="For local authority case workers, social workers and support teams. Search vacancies, keep client details in one place and send referrals straight to providers."
          href="/register?type=REFERRER"
          cta="Set up a referrer account"
          eyebrow="FOR PROFESSIONALS"
        />
        <PathCard
          heading="Advertising accommodation"
          body="List HMOs, supported housing, transitional homes, adult social care accommodation and other housing, then manage rooms, enquiries and referrals."
          href="/register?type=PROVIDER"
          cta="Advertise accommodation"
          tone="ink"
        />
      </section>

      <section className="shell pb-10 sm:pb-14">
        <div className="flex items-end justify-between gap-4">
          <div>
            <span className="text-[13px] font-semibold tracking-[0.08em] text-pine-dark">POPULAR LOCATIONS</span>
            <h2 className="mt-2 text-[30px]">Explore housing by city</h2>
            <p className="mt-1 max-w-[54ch] text-[15px] leading-relaxed text-ink-soft">
              Start with some of the UK areas people search most often.
            </p>
          </div>
          <Link href="/search" className="btn-secondary hidden shrink-0 sm:inline-flex">View all locations</Link>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {POPULAR_LOCATIONS.map((location) => (
            <Link
              key={location.name}
              href={cities.some(({ city }) => city.toLowerCase() === location.name.toLowerCase())
                ? `/rooms/${locationSlug(location.name)}`
                : `/search?where=${encodeURIComponent(location.name)}`}
              className="group relative aspect-[16/10] overflow-hidden rounded-card border border-line bg-ink shadow-raise transition duration-300 hover:-translate-y-1 hover:border-pine focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-pine"
              aria-label={`Search for housing in ${location.name}`}
            >
              <Image
                src={location.image}
                alt={`${location.name} city skyline`}
                fill
                sizes="(min-width: 1024px) 390px, (min-width: 640px) 33vw, 100vw"
                className="object-cover transition duration-500 group-hover:scale-[1.04]"
              />
              <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[#092d4d]/95 via-[#0f5d98]/20 to-transparent" />
              <span className="absolute inset-x-0 bottom-0 block p-5 text-white">
                <span className="block text-[22px] font-bold leading-tight">{location.name}</span>
                <span className="mt-1 block text-[13px] leading-snug text-white/85">{location.description}</span>
              </span>
            </Link>
          ))}
        </div>

        {cities.length > 0 && (
          <div className="mt-6 flex flex-wrap items-center gap-2 text-[14px]">
            <span className="font-semibold text-ink">Live areas:</span>
            {cities.map(({ city }) => (
              <Link key={city} href={`/rooms/${locationSlug(city)}`} className="chip hover:border-pine hover:text-pine-dark">Rooms in {city}</Link>
            ))}
          </div>
        )}

        <Link href="/search" className="btn-secondary mt-5 w-full sm:hidden">View all locations</Link>
      </section>

      {featured.items.length > 0 && (
        <section className="shell py-6 sm:py-10">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-[28px]">Recently listed</h2>
              <p className="mt-1 text-[15px] text-ink-soft">Adverts our team has reviewed and published.</p>
            </div>
            <Link href="/search" className="btn-secondary shrink-0">See all</Link>
          </div>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.items.slice(0, 6).map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        </section>
      )}

      <section className="shell py-14">
        <span className="text-[13px] font-semibold tracking-[0.08em] text-pine-dark">FIND A SUITABLE HOME</span>
        <h2 className="mt-2 text-[30px]">Filter by housing and support need</h2>
        <div className="mt-5 flex flex-wrap gap-2">
          {SUPPORT_TYPES.filter((t) => t.slug !== "other").map((type) => (
            <Link key={type.slug} href={`/search?support=${type.slug}`} className="chip hover:-translate-y-px hover:border-pine hover:text-pine-dark">
              {type.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="border-y border-line bg-white">
        <div className="shell py-14">
          <span className="text-[13px] font-semibold tracking-[0.08em] text-pine-dark">A CLEARER WAY TO CONNECT</span>
          <h2 className="mt-2 text-[30px]">How it works</h2>
          <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[
              ["Create an account", "As someone looking, a provider, or a professional referrer."],
              ["Search or advertise", "Filter by housing type, support, location and availability — or post your properties and rooms."],
              ["Message directly", "Conversations stay inside the platform, so contact details stay private."],
              ["Request or refer", "Send a structured request yourself, or a full referral if you work with someone."],
              ["Move in", "Track the offer through to move-in, with everyone seeing the same status."],
            ].map(([title, body], index) => (
              <li key={title} className="interactive-card rounded-card border border-line bg-paper p-5">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-pine text-[13px] font-semibold text-white shadow-[0_4px_10px_rgba(22,102,170,.2)]">{index + 1}</span>
                <h3 className="mt-4 text-[18px]">{title}</h3>
                <p className="mt-1.5 text-[15px] leading-relaxed text-ink-soft">{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="shell py-16">
        <div className="card grid items-center gap-6 border-l-4 border-l-pine bg-[linear-gradient(120deg,#fff_0%,#fff_55%,#e8f2fc_125%)] p-8 sm:grid-cols-[1.4fr_auto]">
          <div>
            <h2 className="text-[26px]">Providers can search people, too</h2>
            <p className="mt-2 max-w-[60ch] text-[15px] leading-relaxed text-ink-soft">
              People who choose to be discoverable appear in a provider-side search by area, support
              need and age. Nobody is listed without opting in, and nothing sensitive is shown.
            </p>
          </div>
          <Link href="/people" className="btn-secondary justify-self-start sm:justify-self-end">
            Browse people looking
          </Link>
        </div>
      </section>
    </>
  );
}

// Keep homepage-only presentation helpers colocated with the page.
function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex items-baseline gap-2 border-l border-line-strong pl-3 first:border-l-0 first:pl-0">
      <dt className="font-display text-[26px] font-bold text-pine-dark">{value.toLocaleString("en-GB")}</dt>
      <dd className="text-ink-soft">{label}</dd>
    </div>
  );
}
async function AvailabilityBoard() {
  const rows = await db.listing.findMany({
    where: { status: "ACTIVE" },
    orderBy: { publishedAt: "desc" },
    take: 7,
    select: {
      id: true,
      title: true,
      supportTypes: true,
      property: { select: { city: true } },
      rooms: { select: { status: true } },
    },
  });

  if (!rows.length) {
    return (
      <div className="card grid place-items-center gap-3 border-t-4 border-t-pine p-10 text-center">
        <p className="text-[16px] text-ink">Providers are adding vacancies now</p>
        <p className="max-w-[46ch] text-[14px] text-ink-soft">
          New availability appears here as soon as it is published. Tell us what you need and we
          will point you to the right providers as they come on.
        </p>
        <div className="mt-1 flex flex-wrap justify-center gap-2">
          <Link href="/search" className="btn-secondary">Browse all adverts</Link>
          <Link href="/register?type=PROVIDER" className="btn-ghost">List a room</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden border-t-4 border-t-pine shadow-float">
      <div className="flex items-center justify-between border-b border-line bg-pine-light/45 px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-pine/40" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-pine" /></span>
          <h2 className="text-[16px]">Live availability</h2>
        </div>
        <span className="text-[12px] text-ink-faint">Provider updates</span>
      </div>
      <ul className="divide-y divide-line">
        {rows.map((row) => {
          const available = row.rooms.filter((r) => r.status === "AVAILABLE").length;
          return (
            <li key={row.id}>
              <Link href={`/listings/${row.id}`} className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-pine-light/35">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px]">{row.title}</span>
                  <span className="block truncate text-[13px] text-ink-faint">{row.property.city}</span>
                </span>
                <span
                  className={
                    available > 0
                      ? "rounded-pill bg-pine-light px-2.5 py-1 text-[12px] font-medium text-pine-dark"
                      : "rounded-pill bg-paper-sunk px-2.5 py-1 text-[12px] text-ink-faint"
                  }
                >
                  {available > 0 ? `${available} free` : "Full"}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function PathCard({
  heading,
  body,
  href,
  cta,
  tone = "paper",
  eyebrow,
}: {
  heading: string;
  body: string;
  href: string;
  cta: string;
  tone?: "paper" | "ink";
  eyebrow?: string;
}) {
  const dark = tone === "ink";
  const label = eyebrow ?? (dark ? "FOR PROVIDERS" : "FOR PEOPLE LOOKING");
  return (
    <div className={dark ? "interactive-card rounded-card bg-gradient-to-br from-pine-dark to-pine p-8 text-white shadow-float" : "card interactive-card border-t-4 border-t-pine p-8"}>
      <span className={dark ? "text-[12px] font-semibold tracking-[0.08em] text-pine-light" : "text-[12px] font-semibold tracking-[0.08em] text-pine-dark"}>{label}</span>
      <h2 className={dark ? "mt-3 text-[24px] text-white" : "mt-3 text-[24px]"}>{heading}</h2>
      <p className={`mt-2 max-w-[46ch] text-[15px] leading-relaxed ${dark ? "text-white/75" : "text-ink-soft"}`}>{body}</p>
      <Link href={href} className={dark ? "btn mt-6 bg-white text-pine-dark shadow-raise hover:-translate-y-px hover:bg-pine-light" : "btn-primary mt-6"}>
        {cta}
      </Link>
    </div>
  );
}
