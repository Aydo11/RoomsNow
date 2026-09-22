import { db } from "@/lib/db";
import { requireReferrer } from "@/lib/rbac";
import { DashboardShell } from "@/components/dashboard-shell";
import { ReferrerProfileForm } from "@/components/referrer-profile-form";
import { referrerNav } from "../nav";

export const metadata = { title: "Agency profile" };
export const dynamic = "force-dynamic";

export default async function ReferrerProfilePage() {
  const user = await requireReferrer();
  const [nav, profile] = await Promise.all([
    referrerNav(user.id),
    db.referrerProfile.findUnique({ where: { userId: user.id } }),
  ]);

  return (
    <DashboardShell
      title="Agency profile"
      subtitle="Your agency's page on RoomsNow — what providers see when you share a client or send a referral."
      nav={nav}
      active="/referrals/profile"
    >
      <ReferrerProfileForm
        user={{
          id: user.id,
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
          agencyType: profile?.agencyType ?? "",
          about: profile?.about ?? "",
          website: profile?.website ?? "",
          publicEmail: profile?.publicEmail ?? "",
          publicPhone: profile?.publicPhone ?? "",
          areasCovered: profile?.areasCovered ?? [],
          specialisms: profile?.specialisms ?? [],
          bannerUrl: profile?.bannerUrl ?? null,
          logoUrl: profile?.logoUrl ?? null,
        }}
      />
    </DashboardShell>
  );
}
