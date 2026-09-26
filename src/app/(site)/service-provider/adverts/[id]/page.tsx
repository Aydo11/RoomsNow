import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { DashboardShell, StatCard } from "@/components/dashboard-shell";
import { ServiceAdvertForm, ServiceAdvertStatusButtons } from "@/components/service-forms";
import { AdvertStatusPill, BoostedLabel } from "@/components/service-ui";
import { SubmitButton } from "@/components/ui";
import { requireServiceBusiness } from "@/server/service-marketplace";
import { boostServiceAdvertAction } from "@/server/actions/service-business";
import { canSubmitAnotherAdvert, COUNTED_ADVERT_STATUSES, isAdvertPublic, SERVICE_BOOSTS, SERVICE_PLANS, servicePlanFor } from "@/lib/service-marketplace";
import { money, shortDate } from "@/lib/format";
import { serviceProviderNav } from "../../nav";

export const metadata = { title: "Edit advert" };
export const dynamic = "force-dynamic";

const BOOST_MESSAGES: Record<string, string> = {
  complete: "Boost active. Your advert now appears above matching results, labelled as boosted.",
  cancelled: "Checkout cancelled — nothing was charged.",
  "no-credits": "You don't have any boost credits left this month.",
  unavailable: "Only live adverts can be boosted.",
};

export default async function ServiceAdvertPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ boost?: string }> }) {
  const [{ id }, { boost }] = await Promise.all([params, searchParams]);
  const { user, business } = await requireServiceBusiness();
  const now = new Date();
  const advert = await db.serviceAdvert.findFirst({
    where: { id, businessId: business.id },
    include: { boosts: { orderBy: { endsAt: "desc" }, take: 5 } },
  });
  if (!advert) notFound();
  const [nav, live, quotes, favourites] = await Promise.all([
    serviceProviderNav(user.id),
    db.serviceAdvert.count({ where: { businessId: business.id, status: { in: COUNTED_ADVERT_STATUSES }, id: { not: advert.id } } }),
    db.serviceQuoteRequest.count({ where: { advertId: advert.id } }),
    db.serviceFavourite.count({ where: { advertId: advert.id } }),
  ]);
  const plan = servicePlanFor(business.subscription) ?? SERVICE_PLANS.STANDARD;
  const isPublic = isAdvertPublic(advert, business, business.subscription, now);
  const currentBoost = advert.boosts.find((b) => b.endsAt > now);
  const credits = business.subscription?.boostCredits ?? 0;

  return (
    <DashboardShell
      title={advert.title}
      nav={nav}
      active="/service-provider/adverts"
      action={<Link href="/service-provider/adverts" className="btn-secondary">All adverts</Link>}
    >
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <AdvertStatusPill status={advert.status} />
        {currentBoost && <BoostedLabel />}
        {advert.status === "ACTIVE" && !isPublic && <span className="text-[13px] text-clay">Approved, but hidden until your business is approved and your plan is active.</span>}
        {advert.status === "ACTIVE" && isPublic && <span className="text-[13px] text-pine-dark">Visible to paying providers</span>}
      </div>
      {advert.status === "REJECTED" && advert.reviewNote && (
        <div className="card mb-5 border-clay/30 bg-clay-light/40 p-4 text-[14px]">
          <p className="font-semibold text-clay">What to change</p>
          <p className="mt-1">{advert.reviewNote}</p>
        </div>
      )}
      {boost && BOOST_MESSAGES[boost] && <p className="mb-5 rounded-[10px] bg-pine-light px-4 py-3 text-[14px] text-pine-dark" role="status">{BOOST_MESSAGES[boost]}</p>}

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard compact label="Views" value={advert.views} />
        <StatCard compact label="Enquiries" value={advert.enquiries} />
        <StatCard compact label="Quote requests" value={quotes} />
        <StatCard compact label="Saved" value={favourites} />
      </div>

      <div className="mb-6"><ServiceAdvertStatusButtons id={advert.id} status={advert.status} /></div>

      {isPublic && advert.status === "ACTIVE" && (
        <section className="card mb-6 p-5" aria-labelledby="boost-heading">
          <h2 id="boost-heading" className="text-[18px]">Boost this advert</h2>
          <p className="mt-1 max-w-[65ch] text-[14px] text-ink-soft">
            Boosted adverts appear above organic results — clearly labelled — when a provider searches for your category or one of your areas. A new boost starts
            when any current one ends.
            {currentBoost && ` Currently boosted until ${shortDate(currentBoost.endsAt)} (${currentBoost.impressions} top-slot views, ${currentBoost.clicks} clicks).`}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {credits > 0 && (
              <form action={boostServiceAdvertAction}>
                <input type="hidden" name="advertId" value={advert.id} />
                <input type="hidden" name="pack" value="CREDIT" />
                <SubmitButton className="btn-primary" pendingLabel="Boosting…">Use a credit — 7 days ({credits} left)</SubmitButton>
              </form>
            )}
            {Object.values(SERVICE_BOOSTS).map((pack) => (
              <form key={pack.key} action={boostServiceAdvertAction}>
                <input type="hidden" name="advertId" value={advert.id} />
                <input type="hidden" name="pack" value={pack.key} />
                <SubmitButton className="btn-secondary" pendingLabel="Opening checkout…">{pack.days} days · {money(pack.amount)}</SubmitButton>
              </form>
            ))}
          </div>
        </section>
      )}

      <ServiceAdvertForm
        maxAreas={plan.maxServiceAreas}
        canSubmit={canSubmitAnotherAdvert(business.subscription, live).ok}
        values={{
          id: advert.id,
          status: advert.status,
          title: advert.title,
          category: advert.category,
          subcategory: advert.subcategory,
          description: advert.description,
          locations: advert.locations,
          nationwide: advert.nationwide,
          priceType: advert.priceType,
          priceFrom: advert.priceFrom,
          priceTo: advert.priceTo,
          priceUnit: advert.priceUnit,
          availability: advert.availability,
          emergency: advert.emergency,
          sameDay: advert.sameDay,
          qualifications: advert.qualifications,
          website: advert.website,
          images: advert.images,
        }}
      />
    </DashboardShell>
  );
}
