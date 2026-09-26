import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { businessTrust, recordServiceEvent, requireFullMarketplace } from "@/server/service-marketplace";
import { BusinessLogo, InsuranceStatus, PaymentsNote, ServiceVerifiedBadge } from "@/components/service-ui";
import { ServicesTabs } from "@/components/service-cards";
import { ReportForm } from "@/components/report-form";
import { Stars } from "@/components/star-rating";
import { categoryLabel, EVIDENCE_LABELS, priceLabel, responseLabel, serviceSubscriptionActive } from "@/lib/service-marketplace";
import { monthYear, shortDate } from "@/lib/format";

export const metadata = { title: "Service business", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type Social = { platform: string; url: string };

export default async function ServiceBusinessProfile({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await requireFullMarketplace(`/services/business/${slug}`);
  const business = await db.serviceBusiness.findUnique({
    where: { slug },
    include: { subscription: true, adverts: { where: { status: "ACTIVE" }, orderBy: { publishedAt: "desc" } } },
  });
  if (!business || business.status !== "APPROVED" || !serviceSubscriptionActive(business.subscription)) notFound();

  const counted = await rateLimit(`view:service-business:${business.id}:${user.id}`, LIMITS.view);
  const [trust] = await Promise.all([
    businessTrust(business.id),
    counted.ok ? db.serviceBusiness.update({ where: { id: business.id }, data: { profileViews: { increment: 1 } } }) : null,
    counted.ok ? recordServiceEvent({ businessId: business.id, type: "PROFILE_VIEW" }) : null,
  ]);
  const name = business.tradingName || business.name;
  const socials = (Array.isArray(business.socialLinks) ? business.socialLinks : []) as Social[];
  const response = responseLabel(trust.responseMinutes);
  const scores: Array<[string, number | null]> = [["Quality", trust.summary.quality], ["Communication", trust.summary.communication], ["Timeliness", trust.summary.timeliness], ["Value", trust.summary.value]];

  return (
    <div className="shell py-6 sm:py-8">
      <div className="flex justify-end"><ServicesTabs active="browse" /></div>
      <header className="card mt-4 overflow-hidden">
        {business.coverUrl ? <img src={business.coverUrl} alt="" className="h-36 w-full object-cover sm:h-48" /> : <div aria-hidden="true" className="h-20 bg-gradient-to-r from-brand/15 to-pine-light" />}
        <div className="flex flex-wrap items-end gap-4 p-5">
          <div className="-mt-12 rounded-[14px] bg-white p-1 shadow-raise"><BusinessLogo src={business.logoUrl} name={name} size={80} /></div>
          <div className="min-w-0 flex-1">
            <h1 className="text-[26px] leading-tight sm:text-[30px]">{name}</h1>
            <p className="text-[14px] text-ink-soft">
              {business.categories.map(categoryLabel).join(" · ")}
              {business.tradingName && business.tradingName !== business.name ? ` · trading name of ${business.name}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {trust.verified && <ServiceVerifiedBadge />}
            <InsuranceStatus state={trust.insurance.state} expiresAt={trust.insurance.expiresAt} />
          </div>
        </div>
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-5">
          {business.description && (
            <section className="card p-5">
              <h2 className="text-[18px]">About</h2>
              <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed">{business.description}</p>
            </section>
          )}

          <section className="card p-5">
            <h2 className="text-[18px]">Services</h2>
            {business.adverts.length === 0 ? (
              <p className="mt-2 text-[14px] text-ink-soft">No live adverts right now.</p>
            ) : (
              <ul className="mt-3 divide-y divide-line">
                {business.adverts.map((advert) => (
                  <li key={advert.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                    <div className="min-w-0">
                      <Link href={`/services/ad/${advert.id}`} className="font-medium text-ink hover:underline">{advert.title}</Link>
                      <p className="text-[13px] text-ink-faint">{categoryLabel(advert.category)} · {advert.nationwide ? "Nationwide" : advert.locations.join(", ")}</p>
                    </div>
                    <span className="text-[14px] font-semibold">{priceLabel(advert)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {business.portfolio.length > 0 && (
            <section className="card p-5">
              <h2 className="text-[18px]">Recent work</h2>
              <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {business.portfolio.map((image, index) => <li key={image}><img src={image} alt={`Work by ${name} — ${index + 1}`} className="aspect-[4/3] w-full rounded-[10px] object-cover" loading="lazy" /></li>)}
              </ul>
            </section>
          )}

          <section className="card p-5" id="reviews">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-[18px]">Reviews from providers</h2>
              {trust.summary.rating !== null && <span className="flex items-center gap-1.5 text-[14px]"><Stars rating={trust.summary.rating} /> {trust.summary.rating.toFixed(1)} from {trust.summary.count}</span>}
            </div>
            {trust.summary.count > 0 && (
              <dl className="mt-3 grid grid-cols-2 gap-2 text-[13px] sm:grid-cols-4">
                {scores.map(([label, value]) => <div key={label} className="rounded-[10px] bg-paper-sunk px-3 py-2"><dt className="text-ink-faint">{label}</dt><dd className="font-semibold">{value?.toFixed(1)}</dd></div>)}
              </dl>
            )}
            {trust.reviews.length === 0 ? (
              <p className="mt-2 text-[14px] text-ink-soft">No reviews yet. Only providers who completed a job through RoomsNow can review.</p>
            ) : (
              <ul className="mt-4 space-y-4">
                {trust.reviews.map((review) => (
                  <li key={review.id} className="border-t border-line pt-4 first:border-0 first:pt-0">
                    <div className="flex items-center gap-2"><Stars rating={review.rating} /><span className="text-[13px] text-ink-faint">{review.quote.service} · {monthYear(review.createdAt)} · Verified job</span></div>
                    {review.comment && <p className="mt-1.5 text-[15px]">{review.comment}</p>}
                    {review.reply && (
                      <div className="mt-2 rounded-[10px] bg-paper-sunk px-3 py-2 text-[14px]">
                        <p className="text-[12px] font-semibold text-ink-soft">Reply from {name}</p>
                        <p className="mt-0.5">{review.reply}</p>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
          <ReportForm targetType="SERVICE_BUSINESS" targetId={business.id} label="Report this business" title="Report this business" />
        </div>

        <aside className="space-y-4">
          <section className="card space-y-3 p-5 text-[14px]">
            <h2 className="text-[16px]">Contact</h2>
            <p>{business.contactName}</p>
            {business.phone && <p><a className="text-brand hover:underline" href={`tel:${business.phone.replace(/\s/g, "")}`}>{business.phone}</a></p>}
            <p><a className="break-all text-brand hover:underline" href={`mailto:${business.email}`}>{business.email}</a></p>
            {business.website && <p><a className="break-all text-brand hover:underline" href={business.website} target="_blank" rel="noopener noreferrer nofollow">{business.website.replace(/^https?:\/\//, "")}</a></p>}
            {socials.length > 0 && <ul className="flex flex-wrap gap-2">{socials.map((s) => <li key={s.url}><a className="chip" href={s.url} target="_blank" rel="noopener noreferrer nofollow">{s.platform}</a></li>)}</ul>}
            {business.adverts[0] && <Link href={`/services/ad/${business.adverts[0].id}#quote`} className="btn-primary w-full">Request a quote</Link>}
          </section>
          <section className="card p-5 text-[14px]">
            <h2 className="text-[16px]">At a glance</h2>
            <dl className="mt-2 space-y-2">
              <div><dt className="text-ink-faint">Covers</dt><dd>{business.nationalCoverage ? "Nationwide" : [...business.areas, ...business.postcodes].join(", ") || "—"}</dd></div>
              {business.openingHours && <div><dt className="text-ink-faint">Hours</dt><dd>{business.openingHours}</dd></div>}
              <div><dt className="text-ink-faint">Emergencies</dt><dd>{business.emergencyAvailable ? "Yes, call-outs available" : "No"}</dd></div>
              {response && <div><dt className="text-ink-faint">Response</dt><dd>{response}</dd></div>}
              {business.yearsExperience !== null && <div><dt className="text-ink-faint">Experience</dt><dd>{business.yearsExperience} years</dd></div>}
              <div><dt className="text-ink-faint">Jobs through RoomsNow</dt><dd>{trust.completedJobs}</dd></div>
              <div><dt className="text-ink-faint">Member since</dt><dd>{monthYear(trust.memberSince)}</dd></div>
              {business.companyNumber && <div><dt className="text-ink-faint">Registration</dt><dd>Registered company</dd></div>}
              {business.pricingSummary && <div><dt className="text-ink-faint">Pricing</dt><dd>{business.pricingSummary}</dd></div>}
            </dl>
          </section>
          {trust.accreditations.length > 0 && (
            <section className="card p-5 text-[14px]">
              <h2 className="text-[16px]">Checked documents</h2>
              <ul className="mt-2 space-y-2">
                {trust.accreditations.map((item) => (
                  <li key={`${item.type}-${item.label}`}><span className="font-medium">{item.label}</span><span className="block text-[13px] text-ink-faint">{EVIDENCE_LABELS[item.type]}{item.issuer ? ` · ${item.issuer}` : ""}{item.expiresAt ? ` · until ${shortDate(item.expiresAt)}` : ""}</span></li>
                ))}
              </ul>
            </section>
          )}
          {(business.terms || business.cancellationPolicy) && (
            <details className="card p-5 text-[14px]">
              <summary className="cursor-pointer font-medium">Terms and cancellation</summary>
              {business.terms && <p className="mt-2 whitespace-pre-line text-ink-soft">{business.terms}</p>}
              {business.cancellationPolicy && <p className="mt-2 whitespace-pre-line text-ink-soft">{business.cancellationPolicy}</p>}
            </details>
          )}
          <PaymentsNote />
        </aside>
      </div>
    </div>
  );
}
