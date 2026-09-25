import Link from "next/link";
import { ListingCard } from "./listing-card";
import { RoomAlertSignup } from "./room-alert-signup";
import { JsonLd, absoluteUrl } from "@/lib/seo";
import { money } from "@/lib/format";
import { areaPath, areaTitle } from "@/lib/area-pages";
import type { AreaPageData } from "@/server/area-pages";
import { clsx } from "@/lib/clsx";

const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0);

/** Shared layout for /supported-housing/[place] and /supported-housing/[place]/[need]. */
export function AreaPage({ data, smsEnabled }: { data: AreaPageData; smsEnabled: boolean }) {
  const { place, need, listings, stats, placeStats, neighbourhoods, town } = data;
  const title = areaTitle(place, need);
  const url = absoluteUrl(areaPath(place, need));
  const who = need ? need.short : "support";
  const faqs = faqsFor(data);

  return (
    <>
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: title,
            url,
            description: `${stats.adverts} live adverts for supported housing in ${place.name}.`,
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
              { "@type": "ListItem", position: 2, name: "Supported housing", item: absoluteUrl("/supported-housing") },
              ...(town ? [{ "@type": "ListItem", position: 3, name: town.name, item: absoluteUrl(areaPath(town)) }] : []),
              { "@type": "ListItem", position: town ? 4 : 3, name: place.name, item: absoluteUrl(areaPath(place)) },
              ...(need ? [{ "@type": "ListItem", position: town ? 5 : 4, name: need.phrase, item: url }] : []),
            ],
          },
          ...(faqs.length
            ? [
                {
                  "@context": "https://schema.org",
                  "@type": "FAQPage",
                  mainEntity: faqs.map((faq) => ({ "@type": "Question", name: faq.q, acceptedAnswer: { "@type": "Answer", text: faq.a } })),
                },
              ]
            : []),
        ]}
      />

      <section className="surface-home border-b border-line">
        <div className="shell py-10 sm:py-14">
          <nav className="flex flex-wrap gap-1 text-[14px] text-ink-faint" aria-label="Breadcrumb">
            <Link href="/supported-housing" className="hover:text-ink">
              Supported housing
            </Link>
            {town && (
              <>
                <span aria-hidden="true">/</span>
                <Link href={areaPath(town, need)} className="hover:text-ink">
                  {town.name}
                </Link>
              </>
            )}
            <span aria-hidden="true">/</span>
            {need ? (
              <Link href={areaPath(place)} className="hover:text-ink">
                {place.name}
              </Link>
            ) : (
              <span className="text-ink-soft">{place.name}</span>
            )}
          </nav>
          <h1 className="mt-4 max-w-[22ch] text-[36px] font-bold leading-[1.1] [text-wrap:balance] sm:text-[48px]">{title}</h1>
          <p className="mt-4 max-w-[62ch] text-[17px] leading-relaxed text-ink-soft">
            {stats.adverts
              ? `${stats.roomsFree} room${stats.roomsFree === 1 ? "" : "s"} free now across ${stats.adverts} live advert${stats.adverts === 1 ? "" : "s"} from ${stats.providers} provider${stats.providers === 1 ? "" : "s"} offering ${who} in ${place.name}. Updated live from providers' own adverts.`
              : `There are no live adverts offering ${who} in ${place.name} right now. Set up a free alert and we'll tell you as soon as one goes live.`}
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link href={`/search?where=${encodeURIComponent(place.name)}${need ? `&support=${need.support}` : ""}`} className="btn-primary">
              Search {place.name}
            </Link>
            <Link href="/eligibility" className="btn-secondary">
              Am I eligible?
            </Link>
          </div>
        </div>
      </section>

      <div className="shell py-10">
        {stats.adverts > 0 && (
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-4">
            <Fact label="Rooms free now" value={String(stats.roomsFree)} />
            <Fact label="Typical rent" value={stats.typicalRent ? `${money(stats.typicalRent)} a week` : "Ask the provider"} />
            <Fact label="Accept Housing Benefit" value={`${pct(stats.housingBenefit, stats.adverts)}%`} />
            <Fact label="You can apply yourself" value={`${stats.selfReferral} of ${stats.adverts}`} />
          </dl>
        )}

        {listings.length > 0 ? (
          <section className="mt-10">
            <h2 className="text-[26px]">Live adverts in {place.name}</h2>
            <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {listings.slice(0, 30).map((listing) => (
                <ListingCard key={listing.id} listing={{ ...listing, distanceMiles: null }} />
              ))}
            </div>
            {listings.length > 30 && (
              <Link href={`/search?where=${encodeURIComponent(place.name)}`} className="btn-secondary mt-6">
                See all {listings.length} adverts
              </Link>
            )}
          </section>
        ) : null}

        <RoomAlertSignup where={place.name} support={need ? [need.support] : []} smsEnabled={smsEnabled} className="mt-10" />

        {placeStats.needs.length > 0 && (
          <section className="mt-12">
            <h2 className="text-[22px]">By type of support in {place.name}</h2>
            <ul className="mt-4 flex flex-wrap gap-2">
              {placeStats.needs.map(({ need: item, adverts }) => (
                <li key={item.slug}>
                  <Link
                    href={areaPath(place, item)}
                    aria-current={need?.slug === item.slug ? "page" : undefined}
                    className={clsx("chip px-3.5 py-1.5 text-[14px]", need?.slug === item.slug && "chip-active")}
                  >
                    {item.phrase} <span className="ml-1 tabular-nums text-ink-faint">{adverts}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {neighbourhoods.length > 0 && (
          <section className="mt-10">
            <h2 className="text-[22px]">{need ? `${need.phrase} by area` : "Areas"} in {place.name}</h2>
            <ul className="mt-4 grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
              {neighbourhoods.map(({ place: area, adverts }) => (
                <li key={area.slug}>
                  <Link href={areaPath(area, need)} className="flex justify-between gap-3 border-b border-line py-2 text-[15px] hover:text-pine-dark">
                    <span>{areaTitle(area, need)}</span>
                    <span className="tabular-nums text-ink-faint">{adverts}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {faqs.length > 0 && (
          <section className="mt-12 max-w-3xl">
            <h2 className="text-[24px]">Questions people ask</h2>
            <div className="mt-4 divide-y divide-line border-y border-line">
              {faqs.map((faq) => (
                <details key={faq.q} className="group py-4">
                  <summary className="cursor-pointer list-none text-[16px] font-semibold [&::-webkit-details-marker]:hidden">{faq.q}</summary>
                  <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{faq.a}</p>
                </details>
              ))}
            </div>
          </section>
        )}

        <p className="mt-10 max-w-3xl text-[13px] leading-relaxed text-ink-faint">
          RoomsNow lists adverts from independent providers. Figures come from live adverts and change as rooms fill. The provider is responsible for the property,
          assessment and placement decision. <Link href="/next-steps" className="underline">What happens after you ask for a room</Link>.
        </p>
      </div>
    </>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white px-4 py-4">
      <dt className="text-[12.5px] text-ink-faint">{label}</dt>
      <dd className="mt-1 text-[20px] font-semibold tabular-nums text-ink">{value}</dd>
    </div>
  );
}

function faqsFor({ place, need, stats }: AreaPageData) {
  if (!stats.adverts) return [];
  const what = need ? need.phrase.toLowerCase() : "supported housing";
  const faqs: { q: string; a: string }[] = [];
  if (stats.typicalRent) {
    faqs.push({
      q: `How much does ${what} cost in ${place.name}?`,
      a: `Across ${stats.adverts} live advert${stats.adverts === 1 ? "" : "s"} on RoomsNow, rent starts from ${money(stats.lowestRent)} a week, and a typical advert asks ${money(stats.typicalRent)} a week. ${stats.billsIncluded} include bills.`,
    });
  }
  faqs.push({
    q: `Can Housing Benefit pay the rent?`,
    a: `${stats.housingBenefit} of ${stats.adverts} adverts here accept Housing Benefit. In supported housing the rent is usually paid by Housing Benefit from the local council, even if you get Universal Credit. You may still pay a small weekly amount for bills or food.`,
  });
  faqs.push({
    q: `Do I need a referral?`,
    a: stats.selfReferral
      ? `${stats.selfReferral} of ${stats.adverts} adverts let you apply yourself. The others ask for a referral from a support worker, probation, a social worker or the council.`
      : `The adverts here ask for a referral, from a support worker, probation, a social worker or the council. Your support worker can send one through RoomsNow.`,
  });
  faqs.push({
    q: `How quickly can I move in?`,
    a: `${stats.roomsFree} room${stats.roomsFree === 1 ? " is" : "s are"} free right now. Providers usually arrange a viewing and a short chat about support first. How long it takes after that depends on the provider and on your Housing Benefit claim.`,
  });
  return faqs;
}

