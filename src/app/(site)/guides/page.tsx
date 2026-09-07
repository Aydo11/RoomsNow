import Link from "next/link";
import { guides } from "@/lib/guides";
import { JsonLd, absoluteUrl, pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "HMO & Supported Accommodation Guides",
  description: "Practical UK guides for finding and viewing HMO rooms, understanding shared housing and making supported accommodation referrals.",
  path: "/guides",
});

export default function GuidesPage() {
  return (
    <>
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: "RoomsNow accommodation guides",
        description: "Practical guides for people looking for HMO rooms and professionals arranging supported accommodation.",
        url: absoluteUrl("/guides"),
        hasPart: guides.map((guide) => ({
          "@type": "Article",
          headline: guide.title,
          url: absoluteUrl(`/guides/${guide.slug}`),
        })),
      }} />

      <section className="surface-home border-b border-line">
        <div className="shell py-14 sm:py-20">
          <span className="eyebrow">ROOMSNOW GUIDES</span>
          <h1 className="mt-5 max-w-[18ch] text-[40px] font-bold leading-[1.08] sm:text-[54px]">Straightforward help with finding accommodation</h1>
          <p className="mt-5 max-w-[68ch] text-[18px] leading-relaxed text-ink-soft">
            Practical checklists and plain-English guides for people searching for a room and professionals arranging a placement.
          </p>
          <Link href="/search" className="btn-primary mt-8">Search available accommodation</Link>
        </div>
      </section>

      <main className="shell py-12 sm:py-16">
        <div className="grid gap-5 md:grid-cols-2">
          {guides.map((guide, index) => (
            <Link
              key={guide.slug}
              href={`/guides/${guide.slug}`}
              className={`card interactive-card group flex min-h-[245px] flex-col p-6 sm:p-7 ${index === 0 ? "border-pine/30 bg-pine-light/30" : ""}`}
            >
              <div className="flex flex-wrap items-center gap-2 text-[12px] font-semibold tracking-[0.06em] text-pine-dark">
                <span>{guide.eyebrow}</span>
                <span aria-hidden="true">•</span>
                <span className="font-medium tracking-normal text-ink-faint">{guide.readTime}</span>
              </div>
              <h2 className="mt-4 text-[25px] leading-tight transition-colors group-hover:text-pine-dark">{guide.title}</h2>
              <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">{guide.description}</p>
              <span className="mt-auto pt-6 text-[14px] font-semibold text-pine-dark">Read guide →</span>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
