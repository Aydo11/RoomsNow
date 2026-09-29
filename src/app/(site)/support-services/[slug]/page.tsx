import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { hasAdminPermission } from "@/lib/admin-permissions";
import { JsonLd, absoluteUrl } from "@/lib/seo";
import { directionsHref, postIsCurrent, supportCategoryLabel, telHref } from "@/lib/support-directory";
import { ensureSupportSeed } from "@/server/support-directory";
import { CrisisStrip, PhoneIcon, SupportCategoryIcon, SupportPostCard } from "@/components/support-directory-ui";
import { SupportMap } from "@/components/support-map";

export const dynamic = "force-dynamic";

async function load(slug: string) {
  await ensureSupportSeed();
  return db.supportOrganisation.findUnique({
    where: { slug },
    include: {
      locations: { orderBy: { createdAt: "asc" } },
      posts: { where: { removedAt: null }, orderBy: [{ startsAt: "asc" }, { createdAt: "desc" }] },
    },
  });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const org = await load(slug);
  if (!org || org.status !== "APPROVED") return { title: "Support service" };
  const where = org.scope === "NATIONAL" ? "UK" : org.areas[0] ?? org.locations[0]?.city ?? "";
  return {
    title: `${org.name}${where ? ` – ${where}` : ""} | Support services`,
    description: `${org.summary}${org.phone ? ` Call ${org.phone}.` : ""}`,
    alternates: { canonical: absoluteUrl(`/support-services/${org.slug}`) },
  };
}

export default async function SupportOrganisationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [org, user] = await Promise.all([load(slug), getCurrentUser()]);
  if (!org) notFound();
  const canManage = Boolean(user && (org.ownerId === user.id || hasAdminPermission(user, "MODERATION")));
  if (org.status !== "APPROVED" && !canManage) notFound();
  if (!canManage) await db.supportOrganisation.update({ where: { id: org.id }, data: { views: { increment: 1 } } }).catch(() => undefined);

  const now = new Date();
  const posts = org.posts.filter((post) => postIsCurrent(post, now));
  const pins = org.locations
    .filter((location) => location.latitude != null && location.longitude != null)
    .map((location) => ({
      id: location.id,
      name: location.name,
      organisation: org.name,
      address: `${location.address}, ${location.city} ${location.postcode}`,
      latitude: location.latitude!,
      longitude: location.longitude!,
    }));

  return (
    <div className="shell py-6 sm:py-8">
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "Organization",
        name: org.name,
        description: org.summary,
        url: org.website ?? absoluteUrl(`/support-services/${org.slug}`),
        telephone: org.phone ?? undefined,
        email: org.email ?? undefined,
        address: org.locations.map((location) => ({ "@type": "PostalAddress", streetAddress: location.address, addressLocality: location.city, postalCode: location.postcode, addressCountry: "GB" })),
      }} />
      <nav aria-label="Breadcrumb" className="mb-4 text-[13px] text-ink-faint">
        <Link href="/support-services" className="hover:text-ink">Support services</Link>
        <span className="mx-2">/</span>
        <span className="text-ink-soft">{org.name}</span>
      </nav>

      {org.status !== "APPROVED" && (
        <p className="mb-5 rounded-[10px] border border-clay/30 bg-clay-light px-4 py-3 text-[14px] text-clay">
          Only you can see this page until our team approves it.
        </p>
      )}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-8">
          <header>
            <div className="flex items-start gap-4">
              <span aria-hidden="true" className={org.crisis ? "grid h-14 w-14 shrink-0 place-items-center rounded-[14px] bg-clay-light text-clay" : "grid h-14 w-14 shrink-0 place-items-center rounded-[14px] bg-pine-light text-pine-dark"}>
                <SupportCategoryIcon slug={org.categories[0] ?? "health-wellbeing"} className="h-7 w-7" />
              </span>
              <div className="min-w-0">
                <h1 className="text-balance text-[28px] leading-tight sm:text-[32px]">{org.name}</h1>
                <p className="mt-1 text-[15px] text-ink-soft">{org.scope === "NATIONAL" ? "UK-wide service" : `Serving ${org.areas.join(", ") || org.locations[0]?.city || "the local area"}`}</p>
              </div>
            </div>
            <p className="mt-4 max-w-[65ch] text-[17px] leading-relaxed text-ink">{org.summary}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {org.categories.map((category) => (
                <Link key={category} href={`/support-services?category=${category}`} className="chip">{supportCategoryLabel(category)}</Link>
              ))}
            </div>
            {org.description && <p className="mt-5 max-w-[65ch] whitespace-pre-line text-[15.5px] leading-relaxed text-ink-soft">{org.description}</p>}
            {org.howToAccess && (
              <div className="mt-5 rounded-card border border-line bg-paper-sunk/50 p-4">
                <p className="text-[13px] font-semibold uppercase tracking-[0.06em] text-pine-dark">How to get help</p>
                <p className="mt-1 whitespace-pre-line text-[15px] text-ink">{org.howToAccess}</p>
              </div>
            )}
          </header>

          {org.locations.length > 0 && (
            <section aria-labelledby="locations-heading">
              <h2 id="locations-heading" className="text-[22px]">Where to find {org.locations.length > 1 ? "us" : "it"}</h2>
              {pins.length > 0 && <div className="card mt-4 overflow-hidden"><SupportMap pins={pins} height={320} /></div>}
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {org.locations.map((location) => {
                  const address = `${location.address}, ${location.city} ${location.postcode}`;
                  return (
                    <li key={location.id} className="card p-4">
                      <p className="font-semibold text-ink">{location.name}</p>
                      <p className="mt-1 text-[14px] text-ink-soft">{location.address}<br />{location.city} {location.postcode}</p>
                      {location.hours && <p className="mt-1 text-[13px] text-ink-faint">{location.hours}</p>}
                      <div className="mt-3 flex flex-wrap gap-3 text-[14px]">
                        <a href={directionsHref(address)} target="_blank" rel="noopener noreferrer" className="font-semibold text-pine-dark hover:underline">Get directions</a>
                        {location.phone && <a href={telHref(location.phone)} className="font-medium text-pine-dark hover:underline">{location.phone}</a>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {posts.length > 0 && (
            <section aria-labelledby="posts-heading">
              <h2 id="posts-heading" className="text-[22px]">Events, training and news</h2>
              <ul className="mt-4 grid gap-4">
                {posts.map((post) => <li key={post.id}><SupportPostCard post={post} /></li>)}
              </ul>
            </section>
          )}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <section className="card p-5" aria-labelledby="contact-heading">
            <h2 id="contact-heading" className="text-[18px]">Contact</h2>
            <dl className="mt-3 space-y-3 text-[14px]">
              {org.phone && (
                <div>
                  <dt className="text-ink-faint">Phone</dt>
                  <dd>
                    <a href={telHref(org.phone)} className="btn-primary mt-1 w-full justify-center text-[16px]"><PhoneIcon /> Call {org.phone}</a>
                    {org.phoneNote && <span className="mt-1 block text-[12.5px] text-ink-faint">{org.phoneNote}</span>}
                  </dd>
                </div>
              )}
              {org.otherPhones.length > 0 && (
                <div>
                  <dt className="text-ink-faint">Other numbers</dt>
                  <dd className="mt-1 space-y-1">
                    {org.otherPhones.map((line) => {
                      const number = line.match(/(\+?\d[\d\s]{6,}\d)/)?.[1];
                      return <p key={line}>{number ? <>{line.replace(number, "").replace(/[:\s]+$/, "")}: <a href={telHref(number)} className="font-medium text-pine-dark hover:underline">{number}</a></> : line}</p>;
                    })}
                  </dd>
                </div>
              )}
              {org.textNumber && (
                <div><dt className="text-ink-faint">Text</dt><dd className="font-medium text-ink">{org.textNumber}</dd></div>
              )}
              {org.email && (
                <div><dt className="text-ink-faint">Email</dt><dd><a href={`mailto:${org.email}`} className="break-all font-medium text-pine-dark hover:underline">{org.email}</a></dd></div>
              )}
              {org.website && (
                <div><dt className="text-ink-faint">Website</dt><dd><a href={org.website} target="_blank" rel="noopener noreferrer" className="break-all font-medium text-pine-dark hover:underline">{org.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}</a></dd></div>
              )}
              {org.hours && (
                <div><dt className="text-ink-faint">Opening hours</dt><dd className="text-ink">{org.hours}</dd></div>
              )}
            </dl>
            {org.verifiedAt && <p className="mt-4 border-t border-line pt-3 text-[12px] text-ink-faint">Details checked {org.verifiedAt.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}. Call ahead before travelling.</p>}
          </section>
          {canManage && <Link href={org.ownerId === user?.id ? "/support-services/manage" : `/support-services/manage?org=${org.id}`} className="btn-secondary w-full justify-center">Edit this listing</Link>}
          {!org.crisis && <CrisisStrip stacked />}
        </aside>
      </div>
    </div>
  );
}
