import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { businessTrust, marketplaceViewer, recordServiceEvent, requireFullMarketplace } from "@/server/service-marketplace";
import { MessageServiceBusinessForm, ServiceFavouriteButton, ServiceQuoteRequestForm } from "@/components/service-buyer-forms";
import { BusinessLogo, InsuranceStatus, PaymentsNote, ServiceVerifiedBadge } from "@/components/service-ui";
import { ServicesTabs } from "@/components/service-cards";
import { ReportForm } from "@/components/report-form";
import { Stars } from "@/components/star-rating";
import { canContactServiceBusiness, categoryLabel, EVIDENCE_LABELS, isAdvertPublic, priceLabel, responseLabel } from "@/lib/service-marketplace";
import { monthYear, shortDate } from "@/lib/format";

export const metadata = { title: "Service", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function ServiceAdvertDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ from?: string }> }) {
  const [{ id }, { from }] = await Promise.all([params, searchParams]);
  const user = await requireFullMarketplace(`/services/ad/${id}`);
  const advert = await db.serviceAdvert.findUnique({ where: { id }, include: { business: { include: { subscription: true } } } });
  if (!advert || !isAdvertPublic(advert, advert.business, advert.business.subscription)) notFound();
  const business = advert.business;

  const counted = await rateLimit(`view:service-advert:${advert.id}:${user.id}`, LIMITS.view);
  const now = new Date();
  const [trust, favourite, others] = await Promise.all([
    businessTrust(business.id),
    db.serviceFavourite.findUnique({ where: { userId_advertId: { userId: user.id, advertId: advert.id } }, select: { id: true } }),
    db.serviceAdvert.findMany({ where: { businessId: business.id, status: "ACTIVE", id: { not: advert.id } }, select: { id: true, title: true }, take: 6 }),
    counted.ok ? db.serviceAdvert.update({ where: { id: advert.id }, data: { views: { increment: 1 } } }) : null,
    counted.ok ? recordServiceEvent({ businessId: business.id, advertId: advert.id, type: "ADVERT_VIEW", category: advert.category }) : null,
    counted.ok && from === "boost"
      ? db.serviceBoost.updateMany({ where: { advertId: advert.id, startsAt: { lte: now }, endsAt: { gt: now } }, data: { clicks: { increment: 1 } } })
      : null,
  ]);
  const canContact = canContactServiceBusiness(marketplaceViewer(user));
  const name = business.tradingName || business.name;
  const area = advert.nationwide ? "Nationwide" : advert.locations.join(", ");
  const response = responseLabel(trust.responseMinutes);

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
          <header className="card p-5">
            <div className="flex items-start gap-4">
              <BusinessLogo src={business.logoUrl} name={name} size={64} />
              <div className="min-w-0 flex-1">
                <Link href={`/services/business/${business.slug}`} className="text-[14px] font-medium text-brand hover:underline">{name}</Link>
                <h1 className="mt-0.5 text-[24px] leading-tight sm:text-[28px]">{advert.title}</h1>
                <p className="mt-1 text-[14px] text-ink-soft">{categoryLabel(advert.category)}{advert.subcategory ? ` · ${advert.subcategory}` : ""} · {area}</p>
              </div>
              {canContact && <ServiceFavouriteButton advertId={advert.id} saved={Boolean(favourite)} />}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {trust.verified && <ServiceVerifiedBadge />}
              <InsuranceStatus state={trust.insurance.state} expiresAt={trust.insurance.expiresAt} />
              {advert.emergency && <span className="rounded-pill bg-clay-light px-2.5 py-1 text-[12px] font-medium text-clay">Emergency call-outs</span>}
              {advert.sameDay && <span className="rounded-pill bg-clay-light px-2.5 py-1 text-[12px] font-medium text-clay">Same-day service</span>}
            </div>
          </header>

          {advert.images.length > 0 && (
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {advert.images.map((image, index) => (
                <li key={image} className={index === 0 ? "col-span-2 row-span-2" : ""}>
                  <a href={image} target="_blank" rel="noreferrer"><img src={image} alt={`${advert.title} — photo ${index + 1}`} className="h-full w-full rounded-card object-cover" loading={index ? "lazy" : "eager"} /></a>
                </li>
              ))}
            </ul>
          )}

          <section className="card p-5">
            <h2 className="text-[18px]">About this service</h2>
            <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-ink">{advert.description}</p>
            <dl className="mt-5 grid gap-4 text-[14px] sm:grid-cols-2">
              <div><dt className="text-ink-faint">Price</dt><dd className="font-semibold text-ink">{priceLabel(advert)}</dd></div>
              {advert.availability && <div><dt className="text-ink-faint">Availability</dt><dd className="text-ink">{advert.availability}</dd></div>}
              {advert.qualifications && <div className="sm:col-span-2"><dt className="text-ink-faint">Qualifications</dt><dd className="whitespace-pre-line text-ink">{advert.qualifications}</dd></div>}
            </dl>
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
          <section className="card space-y-1.5 p-5 text-[14px]">
            <h2 className="text-[16px]">Contact details</h2>
            {business.phone && <p><a className="text-brand hover:underline" href={`tel:${business.phone.replace(/\s/g, "")}`}>{business.phone}</a></p>}
            <p><a className="break-all text-brand hover:underline" href={`mailto:${business.email}`}>{business.email}</a></p>
            {(advert.website || business.website) && <p><a className="break-all text-brand hover:underline" href={(advert.website || business.website)!} target="_blank" rel="noopener noreferrer nofollow">{(advert.website || business.website)!.replace(/^https?:\/\//, "")}</a></p>}
          </section>
          <PaymentsNote />
        </aside>
      </div>
    </div>
  );
}
