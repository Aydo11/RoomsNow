import Link from "next/link";
import { db } from "@/lib/db";
import { JsonLd, absoluteUrl, pageMetadata } from "@/lib/seo";
import { AREA_NEEDS, areaPath, inPlace } from "@/lib/area-pages";
import { livePlaces } from "@/server/area-pages";

export const dynamic = "force-dynamic";

export const metadata = pageMetadata({
  title: "Supported Housing by Area",
  description: "Find supported housing near you. Browse live adverts by town and neighbourhood, and by type of support: mental health, homelessness, care leavers, prison leavers and more.",
  path: "/supported-housing",
});

/** Hub linking every live area page, grouped by town. */
export default async function SupportedHousingHubPage() {
  const [places, listings] = await Promise.all([
    livePlaces(),
    db.listing.findMany({
      where: { status: "ACTIVE", company: { status: "ACTIVE" } },
      select: { supportTypes: true, property: { select: { city: true, area: true } } },
      take: 5000,
    }),
  ]);
  const inside = (place: (typeof places)[number]) => listings.filter((listing) => inPlace(place, listing.property));
  const count = (place: (typeof places)[number]) => inside(place).length;
  const towns = places
    .filter((place) => place.kind === "city")
    .map((town) => ({
      town,
      adverts: count(town),
      needs: AREA_NEEDS.filter((need) => inside(town).some((listing) => listing.supportTypes.includes(need.support))),
      areas: places
        .filter((place) => place.kind === "area" && place.city.toLowerCase() === town.city.toLowerCase())
        .map((area) => ({ area, adverts: count(area) }))
        .sort((a, b) => b.adverts - a.adverts),
    }))
    .filter((row) => row.adverts > 0)
    .sort((a, b) => b.adverts - a.adverts);

  return (
    <>
      <JsonLd data={{ "@context": "https://schema.org", "@type": "CollectionPage", name: "Supported housing by area", url: absoluteUrl("/supported-housing") }} />
      <section className="surface-home border-b border-line">
        <div className="shell py-10 sm:py-14">
          <h1 className="text-[36px] font-bold leading-tight sm:text-[48px]">Supported housing by area</h1>
          <p className="mt-4 max-w-[60ch] text-[17px] leading-relaxed text-ink-soft">
            Every town and neighbourhood with live supported housing adverts on RoomsNow. Pick a place to see rooms free now, typical rent and who can apply.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link href="/search" className="btn-primary">
              Search all rooms
            </Link>
            <Link href="/eligibility" className="btn-secondary">
              Am I eligible?
            </Link>
          </div>
        </div>
      </section>
      <div className="shell py-10">
        {towns.length === 0 ? (
          <p className="text-[15px] text-ink-soft">No live adverts yet. Check back soon.</p>
        ) : (
          <div className="grid gap-8 md:grid-cols-2">
            {towns.map(({ town, adverts, needs, areas }) => (
              <section key={town.slug} className="rounded-card border border-line bg-white p-5">
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="text-[22px]">
                    <Link href={areaPath(town)} className="hover:text-pine-dark">
                      {town.name}
                    </Link>
                  </h2>
                  <span className="text-[13px] tabular-nums text-ink-faint">
                    {adverts} advert{adverts === 1 ? "" : "s"}
                  </span>
                </div>
                {needs.length > 0 && (
                  <ul className="mt-3 flex flex-wrap gap-1.5">
                    {needs.map((need) => (
                      <li key={need.slug}>
                        <Link href={areaPath(town, need)} className="chip px-2.5 py-1 text-[13px]">
                          {need.phrase}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                {areas.length > 0 && (
                  <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1 text-[14px]">
                    {areas.map(({ area, adverts: n }) => (
                      <li key={area.slug}>
                        <Link href={areaPath(area)} className="flex justify-between gap-2 py-1 text-ink-soft hover:text-pine-dark">
                          <span className="truncate">{area.name}</span>
                          <span className="tabular-nums text-ink-faint">{n}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
