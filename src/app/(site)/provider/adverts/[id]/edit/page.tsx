import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireCompany } from "@/lib/rbac";
import { AdvertForm } from "@/components/advert-form";
import { DashboardShell } from "@/components/dashboard-shell";
import { providerNav } from "../../../nav";

export const metadata = { title: "Edit advert" };
export const dynamic = "force-dynamic";

const pounds = (pence: number | null) => (pence == null ? "" : (pence / 100).toFixed(2));
const day = (value: Date | null) => value?.toISOString().slice(0, 10) ?? "";

export default async function EditAdvertPage({ params }: { params: Promise<{ id: string }> }) {
  const { companyId } = await requireCompany();
  const { id } = await params;
  const listing = await db.listing.findFirst({
    where: { id, companyId },
    include: { property: true },
  });
  if (!listing) notFound();

  const nav = await providerNav(companyId);

  return (
    <DashboardShell
      title="Edit advert"
      subtitle="Changes to a live advert go back for review if they alter the support or eligibility."
      nav={nav}
      active="/provider/adverts"
    >
      <AdvertForm
        defaults={{
          id: listing.id,
          propertyName: listing.property.name,
          city: listing.property.city,
          area: listing.property.area ?? "",
          postcode: listing.property.postcode,
          addressLine1: listing.property.addressLine1 ?? "",
          showExactAddress: listing.property.showExactAddress,
          title: listing.title,
          summary: listing.summary ?? "",
          accommodationType: listing.accommodationType,
          bedrooms: listing.property.bedrooms,
          ensuite: listing.ensuite,
          furnished: listing.furnished,
          selfContained: listing.selfContained,
          sharedFacilities: listing.sharedFacilities,
          wheelchairAccess: listing.wheelchairAccess,
          accessibilityNotes: listing.accessibilityNotes ?? "",
          petsAllowed: listing.petsAllowed,
          weeklyRentFrom: pounds(listing.weeklyRentFrom),
          weeklyRentTo: pounds(listing.weeklyRentTo),
          billsIncluded: listing.billsIncluded,
          housingBenefit: listing.housingBenefit,
          availableFrom: day(listing.availableFrom),
          genderArrangement: listing.genderArrangement,
          minAge: listing.minAge?.toString() ?? "",
          maxAge: listing.maxAge?.toString() ?? "",
          supportTypes: listing.supportTypes,
          supportDescription: listing.supportDescription ?? "",
          supportAvailability: listing.supportAvailability ?? "",
          supportProvider: listing.supportProvider ?? "",
          referralRoutes: listing.referralRoutes,
          eligibility: listing.eligibility ?? "",
          referralProcess: listing.referralProcess ?? "",
          houseRules: listing.houseRules ?? "",
          description: listing.description ?? "",
        }}
      />
    </DashboardShell>
  );
}
