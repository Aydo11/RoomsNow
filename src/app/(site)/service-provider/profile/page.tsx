import { DashboardShell } from "@/components/dashboard-shell";
import { ServiceProfileForm } from "@/components/service-forms";
import type { SocialLink } from "@/components/social-links-field";
import { requireServiceBusiness } from "@/server/service-marketplace";
import { SERVICE_PLANS, servicePlanFor } from "@/lib/service-marketplace";
import { serviceProviderNav } from "../nav";

export const metadata = { title: "Business profile" };
export const dynamic = "force-dynamic";

export default async function ServiceProfilePage() {
  const { user, business } = await requireServiceBusiness();
  const nav = await serviceProviderNav(user.id);
  const plan = servicePlanFor(business.subscription) ?? SERVICE_PLANS.STANDARD;
  return (
    <DashboardShell
      title="Business profile"
      subtitle="What paying accommodation providers see when they find you. Free providers only ever see your category and area."
      nav={nav}
      active="/service-provider/profile"
    >
      <ServiceProfileForm
        maxAreas={plan.maxServiceAreas}
        portfolioLimit={plan.enhancedProfile ? 12 : 3}
        values={{
          name: business.name,
          tradingName: business.tradingName,
          contactName: business.contactName,
          email: business.email,
          phone: business.phone,
          website: business.website,
          socialLinks: Array.isArray(business.socialLinks) ? (business.socialLinks as SocialLink[]) : [],
          companyNumber: business.companyNumber,
          categories: business.categories,
          areas: business.areas,
          postcodes: business.postcodes,
          nationalCoverage: business.nationalCoverage,
          basePostcode: business.basePostcode,
          radiusMiles: business.radiusMiles,
          description: business.description,
          yearsExperience: business.yearsExperience,
          openingHours: business.openingHours,
          emergencyAvailable: business.emergencyAvailable,
          pricingSummary: business.pricingSummary,
          quoteOnly: business.quoteOnly,
          terms: business.terms,
          cancellationPolicy: business.cancellationPolicy,
          responseTarget: business.responseTarget,
          logoUrl: business.logoUrl,
          coverUrl: business.coverUrl,
          portfolio: business.portfolio,
        }}
      />
    </DashboardShell>
  );
}
