import { db } from "@/lib/db";
import { DashboardShell } from "@/components/dashboard-shell";
import { ServiceAdvertForm } from "@/components/service-forms";
import { requireServiceBusiness } from "@/server/service-marketplace";
import { canSubmitAnotherAdvert, COUNTED_ADVERT_STATUSES, SERVICE_PLANS, servicePlanFor } from "@/lib/service-marketplace";
import { serviceProviderNav } from "../../nav";

export const metadata = { title: "New advert" };
export const dynamic = "force-dynamic";

export default async function NewServiceAdvertPage() {
  const { user, business } = await requireServiceBusiness();
  const [nav, live] = await Promise.all([
    serviceProviderNav(user.id),
    db.serviceAdvert.count({ where: { businessId: business.id, status: { in: COUNTED_ADVERT_STATUSES } } }),
  ]);
  const plan = servicePlanFor(business.subscription) ?? SERVICE_PLANS.STANDARD;
  const allowed = canSubmitAnotherAdvert(business.subscription, live);
  return (
    <DashboardShell title="New advert" subtitle={allowed.ok ? "Our team checks every advert before providers can see it." : `${allowed.reason} You can still save a draft.`} nav={nav} active="/service-provider/adverts">
      <ServiceAdvertForm
        maxAreas={plan.maxServiceAreas}
        canSubmit={allowed.ok}
        values={{
          title: "",
          category: business.categories[0] ?? "",
          subcategory: null,
          description: "",
          locations: business.areas.slice(0, plan.maxServiceAreas),
          nationwide: business.nationalCoverage,
          priceType: "QUOTE",
          priceFrom: null,
          priceTo: null,
          priceUnit: null,
          availability: business.openingHours,
          emergency: business.emergencyAvailable,
          sameDay: false,
          qualifications: null,
          website: business.website,
          images: [],
        }}
      />
    </DashboardShell>
  );
}
