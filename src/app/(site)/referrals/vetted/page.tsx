import { requireReferrer } from "@/lib/rbac";
import { DashboardShell } from "@/components/dashboard-shell";
import { VettedProvidersView, type VettedParams } from "@/components/vetted-providers-view";
import { referrerNav } from "../nav";

export const metadata = { title: "Vetted providers" };
export const dynamic = "force-dynamic";

export default async function VettedProvidersPage({ searchParams }: { searchParams: Promise<VettedParams> }) {
  const user = await requireReferrer();
  const [params, nav] = await Promise.all([searchParams, referrerNav(user.id)]);
  return (
    <DashboardShell
      title="Vetted providers"
      subtitle="Only providers with a CQC registration or BVSC recognition that RoomsNow has checked against evidence — and only their adverts."
      nav={nav}
      active="/referrals/vetted"
    >
      <VettedProvidersView params={params} basePath="/referrals/vetted" />
    </DashboardShell>
  );
}
