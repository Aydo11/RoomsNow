import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { businessTrust, loadPublicAdverts, marketplaceViewer, recordServiceEvent, requireFullMarketplace, viewerAccess } from "@/server/service-marketplace";
import { getCurrentUser } from "@/lib/session";
import { MessageServiceBusinessForm, ServiceFavouriteButton, ServiceQuoteRequestForm } from "@/components/service-buyer-forms";
import { BusinessLogo, InsuranceStatus, PaymentsNote, ServiceVerifiedBadge } from "@/components/service-ui";
import { ServiceAdvertCard, ServicesTabs } from "@/components/service-cards";
import { ServiceCategoryIcon } from "@/components/service-marketplace-ui";
import { ReportForm } from "@/components/report-form";
import { Stars } from "@/components/star-rating";
import { Gallery } from "@/components/gallery";
import { ServiceAreaMap } from "@/components/service-area-map";
import { canContactServiceBusiness, categoryLabel, EVIDENCE_LABELS, isAdvertPublic, priceLabel, rankAdverts, responseLabel } from "@/lib/service-marketplace";
import { monthYear, shortDate } from "@/lib/format";
import { resolveArea } from "@/lib/geo";
import { optimisedImage } from "@/lib/image-url";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  // Only paying providers may learn what an advert is, so the tab title stays generic for everyone else.
  const advert = viewerAccess(user) === "full" ? await db.serviceAdvert.findUnique({ where: { id }, select: { title: true } }) : null;
  return { title: advert ? `${advert.title} · Provider Services` : "Provider Services", robots: { index: false, follow: false } };
}
export const dynamic = "force-dynamic";

export default async function ServiceAdvertDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ from?: string }> }) {
  const [{ id }, { from }] = await Promise.all([params, searchParams]);
  const user = await requireFullMarketplace(`/services/ad/${id}`);
  const advert = await db.serviceAdvert.findUnique({ where: { id }, include: { business: { include: { subscription: true } } } });
  if (!advert || !isAdvertPublic(advert, advert.business, advert.business.subscription)) notFound();
  const business = advert.business;

  const counted = await rateLimit(`view:service-advert:${advert.id}:${user.id}`, LIMITS.view);
  const now = new Date();
  const [trust, favourite, others, market] = await Promise.all([
    businessTrust(business.id),
    db.serviceFavourite.findUnique({ where: { userId_advertId: { userId: user.id, advertId: advert.id } }, select: { id: true } }),
    db.serviceAdvert.findMany({ where: { businessId: business.id, status: "ACTIVE", id: { not: advert.id } }, select: { id: true, title: true }, take: 6 }),
    loadPublicAdverts(now),
    counted.ok ? db.serviceAdvert.update({ where: { id: advert.id }, data: { views: { increment: 1 } } }) : null,
    counted.ok ? recordServiceEvent({ businessId: business.id, advertId: advert.id, type: "ADVERT_VIEW", category: advert.category }) : null,
    counted.ok && from === "boost"
      ? db.serviceBoost.updateMany({ where: { advertId: advert.id, startsAt: { lte: now }, endsAt: { gt: now } }, data: { clicks: { increment: 1 } } })
      : null,
    counted.ok && from === "sponsor"
      ? db.serviceAdvert.update({ where: { id: advert.id }, data: { sponsoredClicks: { increment: 1 } } })
      : null,
  ]);
  const canContact = canContactServiceBusiness(marketplaceViewer(user));
  const name = business.tradingName || business.name;
  const area = advert.nationwide ? "Nationwide" : advert.locations.join(", ");
  const response = responseLabel(trust.responseMinutes);
  const galleryImages = [...new Set([...advert.images, ...business.portfolio])].slice(0, 12);
  const coverage = advert.nationwide || business.nationalCoverage
    ? "Nationwide"
    : [...new Set([...advert.locations, ...business.areas])].filter(Boolean).join(", ") || "Ask the supplier";
  const businessPoint = business.latitude !== null && business.longitude !== null ? { latitude: business.latitude, longitude: business.longitude } : null;
  const mapPoint = businessPoint ?? await resolveArea(advert.locations[0] ?? business.areas[0]);
  const descriptionBlocks = advert.description
    .replace(/([^\s\d])(\d+\.\s*)/g, "$1\n$2")
    .split(/\n+/)
    .map((block) => block.trim())
    .filter(Boolean);
  // Similar services: same category, other businesses, ordered the same way as search.
  const similar = rankAdverts(market.filter((a) => a.category === advert.category && a.business.id !== business.id), {}, `${now.toISOString().slice(0, 10)}:${user.id}`).slice(0, 3);
  const similarSaved = similar.length
    ? new Set((await db.serviceFavourite.findMany({ where: { userId: user.id, advertId: { in: similar.map((a) => a.id) } }, select: { advertId: true } })).map((f) => f.advertId))
    : new Set<string>();
  const scoreRows = [
    ["Quality", trust.summary.quality],
    ["Communication", trust.summary.communication],
    ["Timeliness", trust.summary.timeliness],
    ["Value", trust.summary.value],
  ] as const;

  return (
    <div className="shell py-6 sm:py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Breadcrumb" className="text-[14px] text-ink-soft">
          <Link href="/services" className="hover:underline">Provider Services</Link> / <Link href={`/services?category=${advert.category}`} className="hover:underline">{categoryLabel(advert.category)}</Link>
        </nav>
        <ServicesTabs active="browse" />
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <article className="min-w-0 space-y-5">
          <header className="card overflow-hidden">
            {business.coverUrl ? (
              <div className="relative h-32 overflow-hidden sm:h-44">
                <img src={optimisedImage(business.coverUrl, 960)} alt={`${name} cover`} className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" aria-hidden="true" />
              </div>
            ) : (
              <div className="relative h-24 overflow-hidden bg-gradient-to-br from-brand/25 via-sky-light to-pine-light sm:h-32" aria-hidden="true">
                <span className="absolute -right-10 -top-16 h-48 w-48 rounded-full border-[28px] border-white/20" />
                <span className="absolute bottom-[-55px] left-[18%] h-36 w-36 rounded-full bg-white/15" />
              </div>
            )}
            <div className="p-5">
              <div className="flex flex-wrap items-start gap-4">
                <div className="-mt-12 shrink-0 rounded-[16px] border-4 border-paper bg-paper shadow-raise sm:-mt-14">
                  <BusinessLogo src={business.logoUrl} name={name} size={80} />
                </div>
                <div className="min-w-0 flex-1">
                  <Link href={`/services/business/${business.slug}`} className="text-[14px] font-semibold text-brand hover:underline">{name}</Link>
                  <h1 className="mt-0.5 text-[24px] leading-tight sm:text-[30px]">{advert.title}</h1>
                  <p className="mt-1 text-[14px] text-ink-soft">{categoryLabel(advert.category)}{advert.subcategory ? ` · ${advert.subcategory}` : ""} · {area}</p>
                </div>
                {canContact && <div className="flex gap-2"><a href="#quote" className="btn-primary">Request a quote</a><ServiceFavouriteButton advertId={advert.id} saved={Boolean(favourite)} /></div>}
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {trust.verified && <ServiceVerifiedBadge />}
                <InsuranceStatus state={trust.insurance.state} expiresAt={trust.insurance.expiresAt} />
                {advert.emergency && <span className="rounded-pill bg-clay-light px-2.5 py-1 text-[12px] font-medium text-clay">Emergency call-outs</span>}
                {advert.sameDay && <span className="rounded-pill bg-clay-light px-2.5 py-1 text-[12px] font-medium text-clay">Same-day service</span>}
              </div>
              <dl className="mt-5 grid gap-3 border-t border-line pt-4 text-[14px] sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-[10px] bg-paper-sunk px-3 py-2.5"><dt className="text-ink-faint">Pricing</dt><dd className="mt-0.5 font-semibold text-ink">{priceLabel(advert)}</dd></div>
                <div className="rounded-[10px] bg-paper-sunk px-3 py-2.5"><dt className="text-ink-faint">Coverage</dt><dd className="mt-0.5 font-medium text-ink">{coverage}</dd></div>
                <div className="rounded-[10px] bg-paper-sunk px-3 py-2.5"><dt className="text-ink-faint">Availability</dt><dd className="mt-0.5 font-medium text-ink">{advert.availability || (advert.sameDay ? "Same-day available" : "Contact for availability")}</dd></div>
                <div className="rounded-[10px] bg-paper-sunk px-3 py-2.5"><dt className="text-ink-faint">Response</dt><dd className="mt-0.5 font-medium text-ink">{response || business.responseTarget || "Ask the supplier"}</dd></div>
              </dl>
            </div>
            <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-line pt-4 sm:grid-cols-4">
              <div><dt className="text-[12px] text-ink-faint">Price</dt><dd className="text-[15px] font-semibold text-ink">{priceLabel(advert)}</dd></div>
              <div><dt className="text-[12px] text-ink-faint">Rating</dt><dd className="text-[15px] font-semibold text-ink">{trust.summary.rating !== null ? `${trust.summary.rating.toFixed(1)} ★ (${trust.summary.count})` : "New"}</dd></div>
              <div><dt className="text-[12px] text-ink-faint">Jobs via RoomsNow</dt><dd className="text-[15px] font-semibold tabular-nums text-ink">{trust.completedJobs}</dd></div>
              <div><dt className="text-[12px] text-ink-faint">Replies</dt><dd className="text-[15px] font-semibold text-ink">{response ? response.replace("Usually replies ", "") : "—"}</dd></div>
            </dl>
            {canContact && <a href="#quote" className="btn-primary mt-4 w-full justify-center lg:hidden">Request a quote</a>}
          </header>

          {galleryImages.length > 0 && (
            <Gallery
              listingId={`service-${advert.id}`}
              title={advert.title}
              media={galleryImages.map((url, index) => ({ id: `${advert.id}-${index}`, type: "IMAGE", url, caption: index < advert.images.length ? `Service photo ${index + 1}` : `Recent work by ${name}`, illustrative: false }))}
            />
          )}
          {galleryImages.length === 0 && (
            <div className="grid aspect-[21/8] place-items-center rounded-card bg-gradient-to-br from-brand/15 via-brand/5 to-pine-light/60 text-brand">
              <ServiceCategoryIcon slug={advert.category} className="h-14 w-14 opacity-80" />
            </div>
          )}

          <section className="card p-5">
            <h2 className="text-[18px]">About this service</h2>
            <div className="mt-3 space-y-3 text-[15px] leading-7 text-ink">
              {descriptionBlocks.map((block, index) => <p key={`${index}-${block.slice(0, 20)}`}>{block}</p>)}
            </div>
            <dl className="mt-5 grid gap-4 text-[14px] sm:grid-cols-2">
              <div><dt className="text-ink-faint">Price</dt><dd className="font-semibold text-ink">{priceLabel(advert)}</dd></div>
              {advert.availability && <div><dt className="text-ink-faint">Availability</dt><dd className="text-ink">{advert.availability}</dd></div>}
              {advert.qualifications && <div className="sm:col-span-2"><dt className="text-ink-faint">Qualifications</dt><dd className="whitespace-pre-line text-ink">{advert.qualifications}</dd></div>}
            </dl>
          </section>

          <section className="card overflow-hidden" aria-labelledby="coverage-heading">
            <div className="p-5">
              <h2 id="coverage-heading" className="text-[18px]">Locations and service area</h2>
              <p className="mt-1 text-[14px] text-ink-soft">{coverage}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {[...new Set([...advert.locations, ...business.areas])].map((location) => <span key={location} className="chip">{location}</span>)}
                {business.radiusMiles && <span className="chip">Up to {business.radiusMiles} miles from their base</span>}
                {business.nationalCoverage && <span className="chip chip-active">Nationwide coverage</span>}
              </div>
            </div>
            {mapPoint ? (
              <>
                <ServiceAreaMap latitude={mapPoint.latitude} longitude={mapPoint.longitude} name={name} radiusMiles={businessPoint ? business.radiusMiles : null} />
                <p className="border-t border-line px-5 py-3 text-[12px] text-ink-faint">{businessPoint ? "The pin is approximate and shows the supplier's service base, not a customer or job address." : "The map is centred on the first area named in this advert. Ask the supplier to confirm coverage for your property's postcode."}</p>
              </>
            ) : (
              <p className="border-t border-line bg-paper-sunk px-5 py-4 text-[13px] text-ink-soft">This supplier has listed their coverage above. Ask them to confirm availability for your property&apos;s postcode.</p>
            )}
          </section>

          <section className="card p-5">
            <h2 className="text-[18px]">Checks and track record</h2>
            <dl className="mt-3 grid gap-4 text-[14px] sm:grid-cols-3">
              <div><dt className="text-ink-faint">Rating</dt><dd className="flex items-center gap-1.5">{trust.summary.rating !== null ? <><Stars rating={trust.summary.rating} /> {trust.summary.rating.toFixed(1)} ({trust.summary.count})</> : "No reviews yet"}</dd></div>
              <div><dt className="text-ink-faint">Jobs completed through RoomsNow</dt><dd>{trust.completedJobs}</dd></div>
              <div><dt className="text-ink-faint">Member since</dt><dd>{monthYear(trust.memberSince)}</dd></div>
              {response && <div><dt className="text-ink-faint">Response</dt><dd>{response}</dd></div>}
              {business.responseTarget && <div><dt className="text-ink-faint">They aim to reply</dt><dd>{business.responseTarget}</dd></div>}
            </dl>
            {trust.accreditations.length > 0 && (
              <ul className="mt-4 flex flex-wrap gap-2">
                {trust.accreditations.map((item) => (
                  <li key={`${item.type}-${item.label}`} className="rounded-[10px] border border-line px-3 py-2 text-[13px]">
                    <span className="block font-medium text-ink">{item.label}</span>
                    <span className="text-ink-faint">{EVIDENCE_LABELS[item.type]}{item.issuer ? ` · ${item.issuer}` : ""}{item.expiresAt ? ` · until ${shortDate(item.expiresAt)}` : ""}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-4 text-[12.5px] text-ink-faint">RoomsNow checks documents when they&apos;re uploaded. Always confirm certificates and insurance directly before work starts.</p>
          </section>

          <section className="card p-5" id="reviews">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <h2 className="text-[18px]">Reviews from providers</h2>
              {trust.summary.count > 3 && <Link href={`/services/business/${business.slug}#reviews`} className="text-[14px] text-brand hover:underline">All {trust.summary.count} reviews →</Link>}
            </div>
            {trust.summary.rating === null ? (
              <p className="mt-2 text-[14px] text-ink-soft">No reviews yet. Only providers who complete a job through RoomsNow can leave one, so every review is from real work.</p>
            ) : (
              <>
                <div className="mt-4 grid gap-5 sm:grid-cols-[160px_minmax(0,1fr)]">
                  <div>
                    <p className="font-display text-[40px] font-bold leading-none tabular-nums">{trust.summary.rating.toFixed(1)}</p>
                    <div className="mt-1.5"><Stars rating={trust.summary.rating} /></div>
                    <p className="mt-1 text-[13px] text-ink-faint">{trust.summary.count} verified {trust.summary.count === 1 ? "job" : "jobs"}</p>
                  </div>
                  <dl className="space-y-2">
                    {scoreRows.map(([label, value]) => (
                      <div key={label} className="grid grid-cols-[110px_minmax(0,1fr)_32px] items-center gap-2 text-[13px]">
                        <dt className="text-ink-soft">{label}</dt>
                        <dd className="h-2 overflow-hidden rounded-full bg-paper-sunk"><span className="block h-full rounded-full bg-brand" style={{ width: `${((value ?? 0) / 5) * 100}%` }} /></dd>
                        <dd className="text-right tabular-nums text-ink">{value?.toFixed(1)}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
                <ul className="mt-5 space-y-4">
                  {trust.reviews.slice(0, 3).map((review) => (
                    <li key={review.id} className="border-t border-line pt-4">
                      <div className="flex flex-wrap items-center gap-2"><Stars rating={review.rating} /><span className="text-[13px] text-ink-faint">{review.quote.service} · {monthYear(review.createdAt)} · Verified job</span></div>
                      {review.comment && <p className="mt-1.5 text-[15px]">{review.comment}</p>}
                      {review.reply && <p className="mt-2 rounded-[10px] bg-paper-sunk px-3 py-2 text-[13.5px] text-ink-soft"><span className="font-medium text-ink">Reply from {name}:</span> {review.reply}</p>}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>

          {others.length > 0 && (
            <section className="card p-5">
              <h2 className="text-[16px]">More from {name}</h2>
              <ul className="mt-2 space-y-1.5 text-[14px]">{others.map((o) => <li key={o.id}><Link href={`/services/ad/${o.id}`} className="text-brand hover:underline">{o.title}</Link></li>)}</ul>
            </section>
          )}
          <ReportForm targetType="SERVICE_ADVERT" targetId={advert.id} label="Report this listing" title="Report this listing" />
        </article>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          {canContact ? (
            <>
              <section className="card p-5" id="quote">
                <h2 className="text-[18px]">Request a quote</h2>
                <p className="mb-4 mt-1 text-[13px] text-ink-soft">It goes to {name} and opens a conversation in your Messages (Services tab).</p>
                <ServiceQuoteRequestForm advertId={advert.id} service={advert.subcategory ?? advert.title} defaultLocation={user.staffOf[0]?.company.city ?? ""} />
              </section>
              <section className="card p-5">
                <MessageServiceBusinessForm advertId={advert.id} businessName={name} />
              </section>
            </>
          ) : (
            <p className="card p-5 text-[14px] text-ink-soft">You&apos;re viewing as an admin. Contact tools are for accommodation providers.</p>
          )}
          <section className="card p-5 text-[14px]">
            <h2 className="text-[16px]">Supplier at a glance</h2>
            <dl className="mt-3 grid grid-cols-2 gap-3">
              <div><dt className="text-ink-faint">Services</dt><dd className="mt-0.5 font-medium">{business.categories.map(categoryLabel).join(", ")}</dd></div>
              <div><dt className="text-ink-faint">Coverage</dt><dd className="mt-0.5 font-medium">{coverage}</dd></div>
              {business.yearsExperience !== null && <div><dt className="text-ink-faint">Experience</dt><dd className="mt-0.5 font-medium">{business.yearsExperience} years</dd></div>}
              <div><dt className="text-ink-faint">Call-outs</dt><dd className="mt-0.5 font-medium">{business.emergencyAvailable || advert.emergency ? "Emergency available" : "Planned work"}</dd></div>
              {business.openingHours && <div className="col-span-2"><dt className="text-ink-faint">Opening hours</dt><dd className="mt-0.5 font-medium">{business.openingHours}</dd></div>}
              {business.pricingSummary && <div className="col-span-2"><dt className="text-ink-faint">Typical pricing</dt><dd className="mt-0.5 font-medium">{business.pricingSummary}</dd></div>}
            </dl>
            <Link href={`/services/business/${business.slug}`} className="mt-4 inline-flex items-center gap-1 font-semibold text-brand hover:underline">View full company profile <span aria-hidden="true">→</span></Link>
          </section>
          <section className="card space-y-1.5 p-5 text-[14px]">
            <h2 className="text-[16px]">Contact details</h2>
            {business.phone && <p><a className="text-brand hover:underline" href={`tel:${business.phone.replace(/\s/g, "")}`}>{business.phone}</a></p>}
            <p><a className="break-all text-brand hover:underline" href={`mailto:${business.email}`}>{business.email}</a></p>
            {(advert.website || business.website) && <p><a className="break-all text-brand hover:underline" href={(advert.website || business.website)!} target="_blank" rel="noopener noreferrer nofollow">{(advert.website || business.website)!.replace(/^https?:\/\//, "")}</a></p>}
          </section>
          <PaymentsNote />
        </aside>
      </div>

      {similar.length > 0 && (
        <section className="mt-10" aria-labelledby="similar-heading">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <h2 id="similar-heading" className="text-[20px] font-bold">Similar {categoryLabel(advert.category).toLowerCase()} services</h2>
            <Link href={`/services?category=${advert.category}`} className="text-[14px] font-medium text-brand hover:underline">See all →</Link>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {similar.map((item) => <li key={item.id}><ServiceAdvertCard advert={item} promoted={false} saved={similarSaved.has(item.id)} canSave={canContact} /></li>)}
          </ul>
        </section>
      )}
    </div>
  );
}
