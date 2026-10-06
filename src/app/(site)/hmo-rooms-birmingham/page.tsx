import type { Metadata } from "next";
import Link from "next/link";
import { ListingCard } from "@/components/listing-card";
import { hmoRoomsBirminghamContent as content } from "@/lib/seo-content";
import { JsonLd, absoluteUrl, pageMetadata } from "@/lib/seo";
import { areaPath } from "@/lib/area-pages";
import { money } from "@/lib/format";
import { loadAreaPage } from "@/server/area-pages";

export const dynamic = "force-dynamic";

const PATH = content.path;
const SEARCH = "/search?where=Birmingham&type=SHARED_ACCOMMODATION";

/** Birmingham's own HMO rules, so the page says something no other city page can. */
const BIRMINGHAM_RULES = [
  {
    heading: "Licensing covers small HMOs too",
    body: "Birmingham City Council's additional licensing scheme has applied to smaller HMOs across every ward since June 2023, alongside the national mandatory licence for larger HMOs. A licensed HMO has had its room sizes, fire safety and management checked against the council's conditions.",
  },
  {
    heading: "Planning permission for new HMOs",
    body: "A citywide Article 4 direction, in force since June 2020, means turning a family house into an HMO for three to six people needs planning permission. It is one reason HMO rooms in some wards are harder to find than others.",
  },
  {
    heading: "Supported and exempt accommodation",
    body: "Many Birmingham HMOs are supported exempt accommodation, where Housing Benefit covers the rent and residents pay a smaller weekly service charge. Ask the provider what support is included and what you will pay yourself.",
  },
];

const RESOURCES = [
  { label: "Birmingham City Council: additional HMO licensing", href: "https://www.birmingham.gov.uk/additionallicence" },
  { label: "Birmingham City Council: supported exempt accommodation", href: "https://www.birmingham.gov.uk/info/20006/housing/2333/supported_exempt_accommodation" },
];

export async function generateMetadata(): Promise<Metadata> {
  const data = await loadAreaPage("birmingham").catch(() => null);
  const free = data?.stats.roomsFree ?? 0;
  return pageMetadata({
    title: free ? `HMO Rooms to Rent in Birmingham: ${free} Rooms Free Now` : "HMO Rooms to Rent in Birmingham",
    description: free
      ? `${free} HMO and shared rooms free now in Birmingham from ${data!.stats.providers} providers. Compare rent, bills, areas and Housing Benefit, then message the provider directly.`
      : "Search HMO rooms and shared accommodation in Birmingham. Compare rent, bills, areas and Housing Benefit, then message the provider directly.",
    path: PATH,
  });
}

export default async function HmoRoomsBirminghamPage() {
  const data = await loadAreaPage("birmingham").catch(() => null);
  const stats = data?.stats;
  const listings = data?.listings.slice(0, 9) ?? [];
  const areas = data?.neighbourhoods.slice(0, 18) ?? [];
  const url = absoluteUrl(PATH);

  return (
    <>
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: "HMO rooms to rent in Birmingham",
            url,
            description: stats?.adverts ? `${stats.roomsFree} HMO and shared rooms free now in Birmingham.` : content.introduction,
            ...(listings.length
              ? {
                  mainEntity: {
                    "@type": "ItemList",
                    itemListElement: listings.map((listing, index) => ({
                      "@type": "ListItem",
                      position: index + 1,
                      url: absoluteUrl(`/listings/${listing.id}`),
                      name: listing.title,
                    })),
                  },
                }
              : {}),
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
              { "@type": "ListItem", position: 2, name: "HMO rooms", item: absoluteUrl("/hmo-rooms") },
              { "@type": "ListItem", position: 3, name: "Birmingham", item: url },
            ],
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: content.faqs.map((faq) => ({ "@type": "Question", name: faq.question, acceptedAnswer: { "@type": "Answer", text: faq.answer } })),
          },
        ]}
      />

      <section className="surface-home border-b border-line">
        <div className="shell py-12 sm:py-16">
          <nav className="flex flex-wrap gap-1 text-[14px] text-ink-faint" aria-label="Breadcrumb">
            <Link href="/hmo-rooms" className="hover:text-ink">HMO rooms</Link>
            <span aria-hidden="true">/</span>
            <span className="text-ink-soft">Birmingham</span>
          </nav>
          <h1 className="mt-4 max-w-[20ch] text-[38px] font-bold leading-[1.08] [text-wrap:balance] sm:text-[52px]">HMO rooms to rent in Birmingham</h1>
          <p className="mt-5 max-w-[64ch] text-[18px] leading-relaxed text-ink-soft">
            {stats?.adverts
              ? `${stats.roomsFree} room${stats.roomsFree === 1 ? "" : "s"} free now across ${stats.adverts} live advert${stats.adverts === 1 ? "" : "s"} from ${stats.providers} Birmingham provider${stats.providers === 1 ? "" : "s"}. Compare rent, bills and area, then message the provider directly.`
              : content.introduction}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={SEARCH} className="btn-primary">{content.primaryCta.label}</Link>
            <Link href={content.secondaryCta.href} className="btn-secondary">{content.secondaryCta.label}</Link>
          </div>
        </div>
      </section>

      <div className="shell py-12 sm:py-14">
        {stats && stats.adverts > 0 && (
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-4">
            <Fact label="Rooms free now" value={String(stats.roomsFree)} />
            <Fact label="Areas covered" value={String(data!.neighbourhoods.length || 1)} />
            <Fact label="Accept Housing Benefit" value={`${pct(stats.housingBenefit, stats.adverts)}%`} />
            <Fact label="Typical weekly charge" value={stats.typicalRent ? money(stats.typicalRent) : "Ask"} />
          </dl>
        )}

        {listings.length > 0 && (
          <section className="mt-12" aria-labelledby="live-rooms">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 id="live-rooms" className="text-[28px]">Rooms free in Birmingham now</h2>
              <Link href={SEARCH} className="text-[15px] font-semibold text-pine-dark hover:underline">
                See all {stats!.adverts} adverts
              </Link>
            </div>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {listings.map((listing) => (
                <ListingCard key={listing.id} listing={{ ...listing, distanceMiles: null }} />
              ))}
            </div>
          </section>
        )}

        {areas.length > 0 && (
          <nav className="mt-14" aria-labelledby="by-area">
            <h2 id="by-area" className="text-[28px]">HMO rooms by area of Birmingham</h2>
            <ul className="mt-5 flex flex-wrap gap-2">
              {areas.map((row) => (
                <li key={row.place.slug}>
                  <Link href={areaPath(row.place)} className="chip hover:border-pine hover:text-pine-dark">
                    {row.place.name} <span className="ml-1 opacity-70">{row.adverts}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}

        <section className="mt-14" aria-labelledby="bham-rules">
          <h2 id="bham-rules" className="text-[28px]">What&apos;s different about HMOs in Birmingham</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {BIRMINGHAM_RULES.map((rule) => (
              <article key={rule.heading} className="card p-6">
                <h3 className="text-[19px]">{rule.heading}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{rule.body}</p>
              </article>
            ))}
          </div>
          <p className="mt-4 text-[13px] text-ink-faint">Rules change. Check current requirements with Birmingham City Council before you sign anything.</p>
        </section>

        <div className="mx-auto mt-14 max-w-3xl space-y-10">
          {content.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-[28px]">{section.heading}</h2>
              <div className="mt-3 space-y-4 text-[16px] leading-7 text-ink-soft">
                {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </div>
            </section>
          ))}

          <section>
            <h2 className="text-[28px]">Frequently asked questions</h2>
            <div className="mt-5 space-y-3">
              {content.faqs.map((faq) => (
                <details key={faq.question} className="card p-5">
                  <summary className="cursor-pointer list-none pr-8 text-[17px] font-semibold text-ink">{faq.question}</summary>
                  <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">{faq.answer}</p>
                </details>
              ))}
            </div>
          </section>

          <nav aria-label="Related accommodation searches">
            <h2 className="text-[28px]">Related searches</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {[...(content.relatedLinks ?? []), { label: "Supported housing by area of Birmingham", href: "/supported-housing/birmingham" }].map((link) => (
                <Link key={link.href} href={link.href} className="chip hover:border-pine hover:text-pine-dark">{link.label}</Link>
              ))}
            </div>
          </nav>

          <aside className="rounded-card border border-line bg-pine-light/25 p-5" aria-label="Official guidance">
            <h2 className="text-[20px]">Official guidance</h2>
            <ul className="mt-3 space-y-2 text-[14px]">
              {RESOURCES.map((resource) => (
                <li key={resource.href}>
                  <a href={resource.href} target="_blank" rel="noreferrer" className="font-semibold text-pine-dark hover:underline">
                    {resource.label} <span aria-hidden="true">↗</span>
                  </a>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </div>
    </>
  );
}

const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0);

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white px-4 py-4">
      <dt className="text-[12.5px] text-ink-faint">{label}</dt>
      <dd className="mt-1 text-[20px] font-semibold tabular-nums text-ink">{value}</dd>
    </div>
  );
}
