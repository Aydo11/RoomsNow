import { requireReferrer } from "@/lib/rbac";
import { DashboardShell } from "@/components/dashboard-shell";
import { ReferrerProfileForm } from "@/components/referrer-profile-form";
import { referrerNav } from "../nav";

export const metadata = { title: "My profile" };
export const dynamic = "force-dynamic";

export default async function ReferrerProfilePage() {
  const user = await requireReferrer();
  const nav = await referrerNav(user.id);

  return (
    <DashboardShell
      title="My profile"
      subtitle="How providers and colleagues see you on RoomsNow."
      nav={nav}
      active="/referrals/profile"
    >
      <ReferrerProfileForm
        user={{
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone ?? "",
          locationLabel: user.locationLabel ?? "",
          organisation: user.organisation ?? "",
          jobTitle: user.jobTitle ?? "",
          avatarUrl: user.avatarUrl ?? null,
          socialLinks: Array.isArray(user.socialLinks)
            ? (user.socialLinks as { platform: string; url: string }[])
            : [],
        }}
      />
    </DashboardShell>
  );
}
