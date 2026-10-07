import Link from "next/link";
import { InstallHint } from "@/components/app-install";
import Image from "next/image";
import { cache, Fragment, Suspense } from "react";
import { db } from "@/lib/db";
import { SearchPanel } from "@/components/search-panel";
import { ListingCard } from "@/components/listing-card";
import { searchListings } from "@/server/search";
import { JsonLd, locationSlug, pageMetadata } from "@/lib/seo";
import { guides } from "@/lib/guides";
import { getCurrentUser } from "@/lib/session";
import { CountUp } from "@/components/motion";
import { RecentlyViewed } from "@/components/recently-viewed";
import { HeroStreet } from "@/components/hero-street";
import { RoomMarquee } from "@/components/room-marquee";
import { COVER_MEDIA } from "@/lib/cover-image";

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

const POPULAR_SEARCHES = [
  ["HMO rooms in Birmingham", "/hmo-rooms-birmingham"],
  ["Supported accommodation in Birmingham", "/supported-accommodation-birmingham"],
  ["Supported accommodation in Manchester", "/supported-accommodation-manchester"],
  ["Transitional accommodation in London", "/transitional-accommodation-london"],
  ["Accommodation for care leavers", "/accommodation-for-care-leavers"],
  ["Mental-health supported accommodation", "/mental-health-supported-accommodation"],
  ["Accommodation for prison leavers", "/accommodation-for-prison-leavers"],
  ["Advertise supported accommodation vacancies", "/advertise-accommodation"],
  ["Professional accommodation referral platform", "/accommodation-referrals"],
] as const;

const TRUST_POINTS = [
  ["shield", "Verified provider badges"],
  ["pound", "Universal Credit adverts clearly marked"],
  ["free", "Free for people looking"],
  ["chat", "Message providers directly"],
] as const;

const getActiveCities = cache(() => db.property.findMany({
  where: { listings: { some: { status: "ACTIVE" } } },
  select: { city: true },
  distinct: ["city"],
}));

export default function HomePage() {
  return (
    <>
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: "HMO rooms and supported accommodation across the UK",
        description: "Search HMO rooms, supported housing and specialist accommodation across the UK.",
      }} />

      <section className="home-arrival surface-home relative overflow-hidden border-b border-line">
        <span aria-hidden="true" className="hero-grid" />
        <span aria-hidden="true" className="ambient-orb -left-24 top-8 h-64 w-64 bg-pine-light/70 blur-3xl" />
        <span aria-hidden="true" className="ambient-orb ambient-orb-2 -right-20 bottom-0 h-72 w-72 bg-[#d8ebfb]/70 blur-3xl" />
        <span aria-hidden="true" className="ambient-orb ambient-orb-3 left-1/3 -top-24 h-56 w-56 bg-[#70baff]/20 blur-3xl" />
        <div className="hero-content shell relative pb-4 pt-10 text-center sm:pb-6 sm:pt-14 lg:pt-16">
          <h1 className="home-headline mx-auto max-w-[19ch] [text-wrap:balance] text-[clamp(2rem,8vw,3.5rem)] font-bold leading-[1.12]">
            <span className="sr-only">Find an HMO room or accommodation that fits</span>
            <span aria-hidden="true">
              {"Find an HMO room or accommodation that fits".split(" ").map((word, index) => (
                // The space sits outside each word's span so the heading can wrap between words.
                <Fragment key={index}>
                  <span className="home-word-slot"><span
                    className={`home-word ${index >= 2 && index <= 5 ? "text-pine-dark" : ""} ${word === "fits" ? "home-word-accent" : ""}`}
                    style={{ animationDelay: `${index * 80}ms` }}
                  >{word}</span></span>{" "}
                </Fragment>
              ))}
            </span>
          </h1>
          <p className="home-intro mx-auto mt-5 max-w-2xl text-[17px] leading-relaxed text-ink-soft">
            Some people need more than a room — they need the right support alongside it. RoomsNow makes that connection.
          </p>

          <div className="home-search mx-auto mt-7 max-w-4xl text-left">
            {/*
              The search form stacks to 4 rows on mobile (no sm: grid columns
              yet) and is a single row from the sm breakpoint up. A fallback
              that doesn't roughly match each shape causes a large layout
              shift — measured via PageSpeed Insights — when the client
              component swaps in and the decorative blob anchored to the
              bottom of this section jumps down with it.
            */}
            <div className="search-glow">
              <Suspense fallback={<div className="h-[300px] rounded-card border border-line bg-white sm:h-[120px]" />}>
                <SearchPanel />
              </Suspense>
            </div>
            <p className="mt-3 text-center text-[14px] text-ink-soft">
              Not sure what you can get?{" "}
              <Link href="/eligibility" className="font-semibold text-pine-dark underline-offset-4 hover:underline">
                Take the 1-minute check →
              </Link>
            </p>
            <InstallHint />
          </div>

          <dl className="mt-7 flex flex-wrap justify-center gap-x-8 gap-y-3 text-[14px]">
            <Suspense fallback={<span role="status" className="text-ink-soft">Checking live availability…</span>}>
              <HomeStats />
            </Suspense>
          </dl>
          <ul className="trust-strip mx-auto mt-5 flex max-w-3xl flex-wrap justify-center gap-x-5 gap-y-2 text-[13.5px] text-ink-soft" aria-label="Why people use RoomsNow">
            {TRUST_POINTS.map(([icon, label]) => (
              <li key={label} className="inline-flex items-center gap-1.5">
                <TrustIcon type={icon} />
                {label}
              </li>
            ))}
          </ul>
        </div>
        <HeroStreet />
      </section>

      <section className="border-b border-line bg-white">
        <div className="shell py-10 sm:py-12">
          <h2 data-reveal className="text-center text-[26px]">What would you like to do?</h2>
          <div data-reveal="stagger" className="mt-6 grid gap-4 md:grid-cols-3">
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

      <Suspense fallback={null}>
        <HomeMarquee />
      </Suspense>

      <Suspense fallback={<div className="shell py-12 text-[14px] text-ink-soft" role="status">Loading current vacancies…</div>}>
        <HomeListings />
      </Suspense>

      <div className="shell">
        <RecentlyViewed className="pb-12" />
      </div>

      <Suspense fallback={<section className="border-y border-line bg-white"><div className="shell py-12 text-[14px] text-ink-soft" role="status">Loading locations…</div></section>}>
        <HomeCities />
      </Suspense>

      <section className="border-b border-line bg-white">
        <div data-reveal className="shell py-8">
          <Link href="/support-services" className="group flex flex-wrap items-center gap-4 rounded-card border border-line bg-gradient-to-r from-pine-light/60 via-paper-card to-paper-card p-5 transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-pine/40 hover:shadow-raise sm:p-6">
            <span aria-hidden="true" className="grid h-12 w-12 shrink-0 place-items-center rounded-[14px] bg-pine text-white">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20s-7-4.4-7-9.4A3.9 3.9 0 0 1 12 7a3.9 3.9 0 0 1 7 3.6c0 5-7 9.4-7 9.4Z" /></svg>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[12px] font-semibold tracking-[0.08em] text-pine-dark">FREE SUPPORT DIRECTORY</span>
              <span className="mt-0.5 block text-[20px] font-semibold text-ink">Need help beyond housing?</span>
              <span className="mt-1 block text-[14.5px] text-ink-soft">Mental health and crisis lines, drug and alcohol services, homelessness help and free training, with numbers, addresses and maps.</span>
            </span>
            <span className="btn-secondary shrink-0">Find support <span aria-hidden="true" className="nudge-arrow">→</span></span>
          </Link>
        </div>
      </section>

      <section className="border-b border-line bg-paper">
        <div className="shell grid gap-8 py-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-start lg:py-16">
          <div data-reveal>
            <span className="text-[12px] font-semibold tracking-[0.08em] text-pine-dark">A SIMPLE PROCESS</span>
            <h2 className="mt-2 text-[30px]">From search to request</h2>
            <p className="mt-3 max-w-md text-[15px] leading-relaxed text-ink-soft">
              See public vacancy details before creating an account. Sign in only when you are ready to save, message or refer.
            </p>
            <Link href="/how-it-works" className="btn-secondary mt-6">See how RoomsNow works</Link>
          </div>
          <ol data-reveal="stagger" className="step-track grid gap-4 sm:grid-cols-3">
            {[
              ["1", "Search", "Choose an area and filter by housing or support need."],
              ["2", "Compare", "Review availability, rent, facilities and referral routes."],
              ["3", "Connect", "Message, request a room or send a professional referral."],
            ].map(([number, title, body]) => (
              <li key={title} className="card interactive-card p-5">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-pine text-[13px] font-semibold text-white ring-4 ring-pine-light">{number}</span>
                <h3 className="mt-4 text-[18px]">{title}</h3>
                <p className="mt-1.5 text-[14px] leading-relaxed text-ink-soft">{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="shell py-12 sm:py-16">
        <div data-reveal className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="text-[12px] font-semibold tracking-[0.08em] text-pine-dark">EXPLORE HOUSING</span>
            <h2 className="mt-2 text-[28px]">Browse by accommodation type</h2>
          </div>
          <Link href="/search" className="text-[14px] font-semibold text-pine-dark hover:underline">Search everything <span aria-hidden="true" className="nudge-arrow">→</span></Link>
        </div>
        <div data-reveal="stagger" className="mt-6 grid gap-x-8 gap-y-3 sm:grid-cols-2">
          {ACCOMMODATION_LINKS.map(([title, body, href]) => (
            <Link key={href} href={href} className="group flex items-center justify-between gap-4 border-b border-line py-4">
              <span>
                <span className="block text-[17px] font-semibold text-ink group-hover:text-pine-dark">{title}</span>
                <span className="mt-0.5 block text-[14px] text-ink-soft">{body}</span>
              </span>
              <span aria-hidden="true" className="nudge-arrow text-pine-dark">→</span>
            </Link>
          ))}
        </div>

        <nav className="mt-12 border-t border-line pt-8" aria-label="Popular accommodation searches">
          <h2 className="text-[24px]">Popular accommodation searches</h2>
          <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-ink-soft">
            Explore focused location and support pages, then open the live vacancy search when you are ready to compare providers.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {POPULAR_SEARCHES.map(([label, href]) => (
              <Link key={href} href={href} className="chip hover:border-pine hover:text-pine-dark">{label}</Link>
            ))}
          </div>
        </nav>
      </section>

      <Suspense fallback={null}>
        <ResidentVoices />
      </Suspense>

      <section className="border-t border-line bg-white">
        <div className="shell py-12 sm:py-16">
          <div data-reveal className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="text-[12px] font-semibold tracking-[0.08em] text-pine-dark">HELPFUL GUIDES</span>
              <h2 className="mt-2 text-[28px]">Feel more prepared before you choose</h2>
            </div>
            <Link href="/guides" className="text-[14px] font-semibold text-pine-dark hover:underline">View all guides <span aria-hidden="true" className="nudge-arrow">→</span></Link>
          </div>
          <div data-reveal="stagger" className="mt-6 grid gap-4 md:grid-cols-3">
            {guides.slice(0, 3).map((guide) => (
              <Link key={guide.slug} href={`/guides/${guide.slug}`} className="card interactive-card group flex min-h-[190px] flex-col p-5">
                <span className="text-[11px] font-semibold tracking-[0.07em] text-pine-dark">{guide.eyebrow}</span>
                <h3 className="mt-3 text-[20px] leading-snug group-hover:text-pine-dark">{guide.title}</h3>
                <p className="mt-2 line-clamp-2 text-[14px] leading-relaxed text-ink-soft">{guide.description}</p>
                <span className="mt-auto pt-4 text-[14px] font-semibold text-pine-dark">Read guide <span aria-hidden="true" className="nudge-arrow">→</span></span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

/** Only shown once the number is worth showing; never padded or estimated. */
const MOVED_IN_THRESHOLD = 10;

async function HomeStats() {
  const [roomsAvailable, areasWithVacancies, movedInRequests, movedInReferrals] = await Promise.all([
    db.room.count({ where: { status: "AVAILABLE", listing: { status: "ACTIVE" } } }),
    getActiveCities(),
    db.accommodationRequest.count({ where: { status: "MOVED_IN" } }),
    db.referral.count({ where: { status: "MOVED_IN" } }),
  ]);
  const movedIn = movedInRequests + movedInReferrals;
  return <>
    <Stat value={roomsAvailable} label="rooms available" live />
    <Stat value={areasWithVacancies.length} label="areas with vacancies" />
    {movedIn >= MOVED_IN_THRESHOLD && <Stat value={movedIn} label="people moved in" />}
  </>;
}

async function HomeMarquee() {
  const rooms = await db.listing.findMany({
    where: { status: "ACTIVE", company: { status: "ACTIVE" }, rooms: { some: { status: "AVAILABLE" } } },
    orderBy: { publishedAt: "desc" },
    take: 12,
    select: {
      id: true,
      title: true,
      weeklyRentFrom: true,
      weeklyRentTo: true,
      property: { select: { city: true, area: true } },
      media: COVER_MEDIA,
      rooms: { select: { status: true } },
    },
  });
  return <RoomMarquee rooms={rooms} />;
}

/**
 * Real words from real residents: reviews left after a move-in, never written
 * by us. The section stays hidden until there are at least two worth showing.
 */
async function ResidentVoices() {
  const reviews = await db.residentReview.findMany({
    where: { hiddenAt: null, rating: { gte: 4 }, comment: { not: null } },
    orderBy: { createdAt: "desc" },
    take: 12,
    select: {
      id: true,
      rating: true,
      comment: true,
      author: { select: { firstName: true } },
      listing: { select: { property: { select: { area: true, city: true } } } },
    },
  });
  const usable = reviews.filter((review) => (review.comment ?? "").trim().length >= 30).slice(0, 3);
  if (usable.length < 2) return null;
  return (
    <section className="border-t border-line bg-paper">
      <div className="shell py-12 sm:py-16">
        <div data-reveal>
          <span className="text-[12px] font-semibold tracking-[0.08em] text-pine-dark">FROM PEOPLE WHO MOVED IN</span>
          <h2 className="mt-2 text-[28px]">In their own words</h2>
        </div>
        <div data-reveal="stagger" className="mt-6 grid gap-4 md:grid-cols-3">
          {usable.map((review) => {
            const place = review.listing?.property.area ?? review.listing?.property.city;
            return (
              <figure key={review.id} className="card flex flex-col p-6">
                <span className="text-[16px] tracking-[2px] text-[#f5b544]" aria-label={`${review.rating} out of 5`}>{"★".repeat(review.rating)}</span>
                <blockquote className="mt-3 flex-1 text-[15.5px] leading-relaxed text-ink">&ldquo;{review.comment!.trim()}&rdquo;</blockquote>
                <figcaption className="mt-4 text-[13.5px] text-ink-soft">
                  {review.author.firstName}{place ? `, ${place}` : ""} · verified resident
                </figcaption>
              </figure>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function TrustIcon({ type }: { type: (typeof TRUST_POINTS)[number][0] }) {
  const paths = {
    shield: <><path d="M12 3 5 6v5c0 4.4 3 8.3 7 9.6 4-1.3 7-5.2 7-9.6V6l-7-3Z" /><path d="m9 12 2 2 4-4" /></>,
    pound: <><path d="M16 6.5A3.5 3.5 0 0 0 9.5 8v9.5M7.5 12.5h6M7 18h10" /></>,
    free: <><path d="M20 12v8H4v-8M2 7h20v5H2zM12 22V7M12 7H8.5a2.5 2.5 0 1 1 0-5C11 2 12 7 12 7ZM12 7h3.5a2.5 2.5 0 1 0 0-5C13 2 12 7 12 7Z" /></>,
    chat: <><path d="M21 12a8 8 0 0 1-11.8 7L4 20l1.1-4.6A8 8 0 1 1 21 12Z" /></>,
  };
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-pine-dark" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[type]}
    </svg>
  );
}

async function HomeListings() {
  const [featured, user, cities] = await Promise.all([
    searchListings({ sort: "featured" }),
    getCurrentUser(),
    getActiveCities(),
  ]);
  const homepageListings = [
    ...featured.boosted.map((listing) => ({ listing, placement: "boosted" as const })),
    ...featured.sponsored.map((listing) => ({ listing, placement: "sponsored" as const })),
    ...featured.items.map((listing) => ({ listing, placement: listing.memberListing ? "member" as const : "free" as const })),
  ]
    // A boosted advert can also appear in the normal results; show it once.
    .filter((entry, index, all) => all.findIndex((other) => other.listing.id === entry.listing.id) === index)
    // Just a taster on the homepage; "View all vacancies" opens the full search.
    .slice(0, 3);
  const homepageListingIds = homepageListings.map(({ listing }) => listing.id);
  const savedListingIds = new Set(
    user && homepageListingIds.length
      ? (await db.savedListing.findMany({
          where: { userId: user.id, listingId: { in: homepageListingIds } },
          select: { listingId: true },
        })).map((save) => save.listingId)
      : [],
  );
  return homepageListings.length > 0 ? (
        <section className="shell py-12 sm:py-16">
          <div data-reveal className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-2 text-[12px] font-semibold tracking-[0.08em] text-pine-dark"><span aria-hidden="true" className="live-dot" />LIVE VACANCIES</span>
              <h2 className="mt-2 text-[28px]">Accommodation available now</h2>
            </div>
            <Link href="/search" className="btn-secondary shrink-0">
              {featured.total > 3 ? `View all ${featured.total} vacancies` : "View all vacancies"}
            </Link>
          </div>
          <div data-reveal="stagger" className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {homepageListings.map(({ listing, placement }) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                compact
                boosted={placement === "boosted"}
                sponsored={placement === "sponsored"}
                memberListing={placement === "member"}
                showActions
                saved={savedListingIds.has(listing.id)}
                canSave={Boolean(user)}
              />
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
  ) : null;
}

async function HomeCities() {
  const cities = await getActiveCities();
  return (
      <section className="border-y border-line bg-white">
        <div className="shell py-12 sm:py-16">
          <div data-reveal className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="text-[12px] font-semibold tracking-[0.08em] text-pine-dark">POPULAR UK LOCATIONS</span>
              <h2 className="mt-2 text-[30px]">Explore accommodation by city</h2>
              <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-soft">
                Start with popular cities, then narrow your search by accommodation type and support need.
              </p>
            </div>
            <Link href="/search" className="btn-secondary shrink-0">View all locations</Link>
          </div>

          <div data-reveal="stagger" className="mt-7 grid gap-5 sm:grid-cols-3">
            {FEATURED_CITIES.map((city) => {
              const hasLiveListings = cities.some(({ city: activeCity }) => activeCity.toLowerCase() === city.name.toLowerCase());
              const href = hasLiveListings
                ? `/rooms/${locationSlug(city.name)}`
                : `/search?where=${encodeURIComponent(city.name)}`;

              return (
                <Link
                  key={city.name}
                  href={href}
                  data-tilt
                  className="group relative aspect-[4/3] overflow-hidden rounded-card bg-ink shadow-raise transition-shadow duration-300 hover:shadow-float focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-pine"
                  aria-label={`Explore accommodation in ${city.name}`}
                >
                  <Image
                    src={city.image}
                    alt={`${city.name} city view`}
                    fill
                    sizes="(min-width: 640px) 33vw, 100vw"
                    className="parallax-img object-cover transition duration-500 group-hover:scale-[1.04]"
                  />
                  <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[#092d4d]/95 via-[#092d4d]/20 to-transparent" />
                  <span className="absolute inset-x-0 bottom-0 block p-5 text-left text-white">
                    <span className="flex items-center gap-2 text-[23px] font-bold leading-tight">{city.name}<span aria-hidden="true" className="nudge-arrow text-[18px] opacity-0 transition-opacity duration-300 group-hover:opacity-100">→</span></span>
                    <span className="mt-1 block max-w-[28ch] text-[13px] leading-snug text-white/85">{city.description}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
  );
}

function Stat({ value, label, live = false }: { value: number; label: string; live?: boolean }) {
  return (
    <div className="flex items-baseline gap-2">
      {live && <span aria-hidden="true" className="live-dot -translate-y-[3px] self-center" />}
      <dt className="font-display text-[22px] font-bold text-pine-dark"><CountUp value={value} /></dt>
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
    <article data-spotlight className={`home-audience ${highlighted ? "rounded-card bg-gradient-to-br from-pine-dark to-pine p-6 text-white shadow-float" : "card border-t-4 border-t-pine/30 bg-pine-light/25 p-6"}`}>
      <div className="flex items-center justify-between gap-4">
        <span className={highlighted ? "text-[11px] font-semibold tracking-[0.08em] text-white/80" : "text-[11px] font-semibold tracking-[0.08em] text-pine-dark"}>{eyebrow}</span>
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
