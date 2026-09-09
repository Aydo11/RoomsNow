import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { ListingCard } from "@/components/listing-card";
import { VerifiedBadge } from "@/components/badges";
import { ORG_TYPES, supportLabel } from "@/lib/taxonomy";
import { JsonLd, absoluteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const company = await db.company.findUnique({ where: { slug }, select: { name: true, about: true, city: true, status: true, logoUrl: true, bannerUrl: true } });
  if (!company) return { title: "Accommodation provider", robots: { index: false, follow: true } };
  const title = `${company.name}${company.city ? ` — ${company.city} Accommodation Provider` : " — Accommodation Provider"}`;
  const description = company.about ?? `View accommodation and live room vacancies from ${company.name}${company.city ? ` in ${company.city}` : ""} on RoomsNow.`;
  const url = absoluteUrl(`/companies/${slug}`);
  return {
    title,
    description,
    alternates: { canonical: url },
    robots: { index: company.status === "ACTIVE", follow: true },
    openGraph: { type: "website", siteName: "RoomsNow", locale: "en_GB", url, title, description, ...(company.bannerUrl || company.logoUrl ? { images: [absoluteUrl(company.bannerUrl ?? company.logoUrl!)] } : {}) },
  };
}

export default async function CompanyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const company = await db.company.findUnique({
    where: { slug },
    include: {
      listings: {
        where: { status: "ACTIVE" },
        include: {
          company: { select: { id: true, name: true, slug: true, logoUrl: true, verification: true } },
          property: { select: { city: true, area: true, postcode: true, showExactAddress: true, addressLine1: true, latitude: true, longitude: true, verification: true } },
          media: { where: { type: "IMAGE" }, orderBy: [{ isPrimary: "desc" }, { position: "asc" }], take: 1 },
          rooms: { select: { status: true } },
        },
      },
    },
  });

  if (!company || company.status !== "ACTIVE") notFound();

  const companyUrl = absoluteUrl(`/companies/${company.slug}`);
  const websiteHref = company.website
    ? /^https?:\/\//i.test(company.website) ? company.website : `https://${company.website}`
    : null;
  const socialLinks = Array.isArray(company.socialLinks)
    ? (company.socialLinks as { platform: string; url: string }[])
    : [];

  return (
    <div className="shell py-10">
      <JsonLd data={[
        {
          "@context": "https://schema.org",
          "@type": "Organization",
          name: company.name,
          url: companyUrl,
          description: company.about ?? undefined,
          logo: company.logoUrl ? absoluteUrl(company.logoUrl) : undefined,
          address: company.city ? { "@type": "PostalAddress", addressLocality: company.city, addressCountry: "GB" } : undefined,
          areaServed: company.operatingAreas,
        },
        {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
            { "@type": "ListItem", position: 2, name: "Accommodation providers", item: absoluteUrl("/search") },
            { "@type": "ListItem", position: 3, name: company.name, item: companyUrl },
          ],
        },
      ]} />
      <header className="card overflow-hidden">
        <div className="h-44 bg-gradient-to-br from-pine-dark via-pine to-pine-light sm:h-56">
          {company.bannerUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={company.bannerUrl} alt="" className="h-full w-full object-cover" />
          )}
        </div>
        <div className="relative px-6 pb-7 sm:px-8">
          <div className="-mt-12 flex flex-wrap items-end justify-between gap-4">
            <div className="flex min-w-0 items-end gap-4">
              {company.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={company.logoUrl} alt={`${company.name} profile`} className="h-24 w-24 shrink-0 rounded-full border-4 border-white bg-white object-cover shadow-raise sm:h-28 sm:w-28" />
              ) : (
                <span className="grid h-24 w-24 shrink-0 place-items-center rounded-full border-4 border-white bg-pine-light text-[22px] font-bold uppercase text-pine-dark shadow-raise sm:h-28 sm:w-28">
                  {company.name.split(/\s+/).slice(0, 2).map((word) => word[0]).join("")}
                </span>
              )}
              <div className="min-w-0 translate-y-2 pb-1">
                <h1 className="truncate text-[28px] leading-tight sm:text-[34px]">{company.name}</h1>
                <p className="mt-1 text-[14px] text-ink-soft">
                  {ORG_TYPES[company.orgType]}{company.city ? ` · ${company.city}` : ""}
                </p>
              </div>
            </div>
            {company.verification === "APPROVED" && <VerifiedBadge />}
          </div>

          <div className="mt-7 grid gap-7 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div>
              <h2 className="text-[19px]">About this provider</h2>
              <p className="mt-2 max-w-[72ch] whitespace-pre-line text-[15px] leading-relaxed text-ink-soft">
                {company.about || "This provider has not added an organisation introduction yet."}
              </p>

              {company.supportTypes.length > 0 && (
                <div className="mt-5">
                  <h2 className="text-[15px] font-medium">Support categories</h2>
                  <p className="mt-2 flex flex-wrap gap-1.5">
                    {company.supportTypes.map((slug) => <span key={slug} className="chip">{supportLabel(slug)}</span>)}
                  </p>
                </div>
              )}
            </div>

            <aside className="rounded-[12px] bg-paper p-4 text-[14px]">
              <h2 className="font-semibold text-ink">Provider information</h2>
              {company.operatingAreas.length > 0 && <p className="mt-2 text-ink-soft">Operating in {company.operatingAreas.join(", ")}</p>}
              {websiteHref && (
                <a href={websiteHref} target="_blank" rel="noopener noreferrer" className="btn-secondary mt-4 w-full">
                  Visit provider website
                </a>
              )}
              {socialLinks.length > 0 && (
                <p className="mt-3 flex flex-wrap gap-2">
                  {socialLinks.map((link, index) => (
                    <a
                      key={index}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="chip capitalize hover:border-pine hover:text-pine-dark"
                    >
                      {link.platform}
                    </a>
                  ))}
                </p>
              )}
              <p className="mt-3 text-[12px] leading-relaxed text-ink-faint">Use an advert below to contact the provider through RoomsNow.</p>
            </aside>
          </div>
        </div>
      </header>

      <h2 className="mt-10 text-[24px]">
        {company.listings.length} live advert{company.listings.length === 1 ? "" : "s"}
      </h2>
      <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {company.listings.map((listing) => (
          <ListingCard key={listing.id} listing={{ ...listing, distanceMiles: null }} />
        ))}
      </div>
    </div>
  );
}
