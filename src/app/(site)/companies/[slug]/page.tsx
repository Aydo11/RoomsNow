import { notFound } from "next/navigation";
import Image from "next/image";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { canActForCompany } from "@/lib/rbac";
import { hasAdminPermission } from "@/lib/admin-permissions";
import { ListingCard } from "@/components/listing-card";
import { AccreditationBadge, VerifiedBadge } from "@/components/badges";
import { DirectMessageForm } from "@/components/direct-message-form";
import { VerificationPanel } from "@/components/verification-panel";
import { ProviderReviews } from "@/components/provider-reviews";
import { ResidentReviews } from "@/components/resident-reviews";
import { residentReviewsFor } from "@/server/resident-reviews";
import { ORG_TYPES, supportLabel } from "@/lib/taxonomy";
import { JsonLd, absoluteUrl } from "@/lib/seo";
import { COVER_MEDIA } from "@/lib/cover-image";

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
      accreditations: {
        where: {
          OR: [
            { status: "UNDER_ASSESSMENT" },
            { status: "APPROVED", OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }] },
          ],
        },
        orderBy: [{ status: "asc" }, { reviewedAt: "desc" }],
      },
      listings: {
        where: { status: "ACTIVE" },
        include: {
          company: { select: { id: true, name: true, slug: true, logoUrl: true, verification: true, responseMinutes: true, responseSampleSize: true } },
          property: { select: { city: true, area: true, postcode: true, showExactAddress: true, addressLine1: true, latitude: true, longitude: true, verification: true } },
          media: COVER_MEDIA,
          rooms: { select: { status: true } },
        },
      },
    },
  });
  const user = await getCurrentUser();

  if (!company || company.status !== "ACTIVE") notFound();

  const verificationDetail = company.verification === "APPROVED"
    ? await db.verificationRequest.findFirst({
        where: { companyId: company.id, type: "COMPANY", status: "APPROVED" },
        orderBy: { reviewedAt: "desc" },
        select: {
          insuranceExpiresAt: true,
          registrationChecked: true,
          insuranceChecked: true,
          governanceChecked: true,
          safeguardingChecked: true,
          identityChecked: true,
        },
      })
    : null;

  const [reviewAgg, reviewRows, residents] = await Promise.all([
    db.providerReview.aggregate({ where: { companyId: company.id }, _avg: { rating: true }, _count: true }),
    db.providerReview.findMany({
      where: { companyId: company.id },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { id: true, rating: true, comment: true, createdAt: true, referral: { select: { organisation: true } } },
    }),
    residentReviewsFor(company.id, { take: 20 }),
  ]);
  const reviews = reviewRows.map((review) => ({ ...review, organisation: review.referral.organisation }));

  const canDirectMessage = Boolean(
    user &&
      (user.role === "REFERRER" || hasAdminPermission(user)) &&
      !canActForCompany(user, company.id),
  );

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
          ...((websiteHref || socialLinks.length > 0)
            ? { sameAs: [websiteHref, ...socialLinks.map((link) => link.url)].filter((url): url is string => Boolean(url)) }
            : {}),
          ...(reviewAgg._count > 0
            ? {
                aggregateRating: {
                  "@type": "AggregateRating",
                  ratingValue: Number((reviewAgg._avg.rating ?? 0).toFixed(1)),
                  reviewCount: reviewAgg._count,
                  bestRating: 5,
                  worstRating: 1,
                },
              }
            : {}),
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
        <div className="relative h-44 bg-gradient-to-br from-pine-dark via-pine to-pine-light sm:h-56">
          {company.bannerUrl && (
            <Image
              src={company.bannerUrl}
              alt=""
              fill
              sizes="100vw"
              priority
              className="object-cover"
            />
          )}
        </div>
        <div className="relative px-6 pb-7 sm:px-8">
          <div className="-mt-12">
            {company.logoUrl ? (
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border-4 border-white bg-white shadow-raise sm:h-28 sm:w-28">
                <Image
                  src={company.logoUrl}
                  alt={`${company.name} profile`}
                  fill
                  sizes="112px"
                  className="object-cover"
                />
              </div>
            ) : (
              <span className="grid h-24 w-24 shrink-0 place-items-center rounded-full border-4 border-white bg-pine-light text-[22px] font-bold uppercase text-pine-dark shadow-raise sm:h-28 sm:w-28">
                {company.name.split(/\s+/).slice(0, 2).map((word) => word[0]).join("")}
              </span>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="truncate text-[28px] leading-tight sm:text-[34px]">{company.name}</h1>
              <p className="mt-1 text-[14px] text-ink-soft">
                {ORG_TYPES[company.orgType]}{company.city ? ` · ${company.city}` : ""}
              </p>
            </div>
            {company.verification === "APPROVED" && <VerifiedBadge />}
          </div>

          {company.verification === "APPROVED" && (
            <VerificationPanel verifiedAt={company.verifiedAt} detail={verificationDetail} />
          )}

          {company.accreditations.length > 0 && (
            <section className="mt-5 rounded-[12px] border border-line bg-paper/70 p-4" aria-labelledby="provider-accreditations">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h2 id="provider-accreditations" className="text-[16px] font-semibold">Accreditations and ratings</h2>
                  <p className="mt-0.5 text-[12px] text-ink-faint">Approved badges have been checked against evidence. “Under assessment” is not an approval.</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {company.accreditations.map((item) => (
                  item.publicUrl && item.status === "APPROVED" ? (
                    <a key={item.id} href={item.publicUrl} target="_blank" rel="noopener noreferrer" className="rounded-[10px] focus:outline-none focus:ring-2 focus:ring-brand/40">
                      <AccreditationBadge scheme={item.scheme} name={item.name} rating={item.rating} status={item.status} />
                    </a>
                  ) : <AccreditationBadge key={item.id} scheme={item.scheme} name={item.name} rating={item.rating} status={item.status} />
                ))}
              </div>
            </section>
          )}

          {reviewAgg._count > 0 && (
            <ProviderReviews average={reviewAgg._avg.rating ?? 0} count={reviewAgg._count} reviews={reviews} />
          )}

          <ResidentReviews summary={residents.summary} reviews={residents.reviews} />

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
              {canDirectMessage ? (
                <div className="mt-4 border-t border-line pt-4">
                  <h3 className="text-[13px] font-medium text-ink-soft">Message this provider</h3>
                  <p className="mt-1 text-[12px] leading-relaxed text-ink-faint">
                    Send a general enquiry, or use an advert below to ask about a specific room.
                  </p>
                  <div className="mt-3">
                    <DirectMessageForm
                      companyId={company.id}
                      subject={`Enquiry via ${company.name}'s profile`}
                      label="Message provider"
                      placeholder={`Hi — I'm getting in touch about a placement with ${company.name}…`}
                      compact
                    />
                  </div>
                </div>
              ) : (
                <p className="mt-3 text-[12px] leading-relaxed text-ink-faint">Use an advert below to contact the provider through RoomsNow.</p>
              )}
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
