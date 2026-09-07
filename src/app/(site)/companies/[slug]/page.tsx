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
  const company = await db.company.findUnique({ where: { slug }, select: { name: true, about: true, city: true, status: true, logoUrl: true } });
  if (!company) return { title: "Accommodation provider", robots: { index: false, follow: true } };
  const title = `${company.name}${company.city ? ` — ${company.city} Accommodation Provider` : " — Accommodation Provider"}`;
  const description = company.about ?? `View accommodation and live room vacancies from ${company.name}${company.city ? ` in ${company.city}` : ""} on RoomsNow.`;
  const url = absoluteUrl(`/companies/${slug}`);
  return {
    title,
    description,
    alternates: { canonical: url },
    robots: { index: company.status === "ACTIVE", follow: true },
    openGraph: { type: "website", siteName: "RoomsNow", locale: "en_GB", url, title, description, ...(company.logoUrl ? { images: [absoluteUrl(company.logoUrl)] } : {}) },
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
      <header className="card p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-[32px] leading-tight">{company.name}</h1>
            <p className="mt-1.5 text-[15px] text-ink-soft">
              {ORG_TYPES[company.orgType]}
              {company.city ? ` · ${company.city}` : ""}
            </p>
          </div>
          {company.verification === "APPROVED" && <VerifiedBadge />}
        </div>

        {company.about && <p className="mt-5 max-w-[70ch] text-[16px] leading-relaxed text-ink-soft">{company.about}</p>}

        {company.supportTypes.length > 0 && (
          <div className="mt-5">
            <h2 className="text-[15px] font-medium">Support categories</h2>
            <p className="mt-2 flex flex-wrap gap-1.5">
              {company.supportTypes.map((slug) => (
                <span key={slug} className="chip">{supportLabel(slug)}</span>
              ))}
            </p>
          </div>
        )}

        {company.operatingAreas.length > 0 && (
          <p className="mt-4 text-[14px] text-ink-soft">
            Operating in {company.operatingAreas.join(", ")}
          </p>
        )}

        <p className="mt-6 text-[13px] text-ink-faint">
          Contact this provider through an advert below — messages stay inside the platform.
        </p>
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
