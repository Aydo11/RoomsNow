import { requireUser } from "@/lib/rbac";
import { DashboardShell } from "@/components/dashboard-shell";
import { ProfileForm } from "@/components/profile-form";
import { userNav } from "../nav";

export const metadata = { title: "My profile" };
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await requireUser("/dashboard/profile");
  const nav = await userNav(user.id);

  return (
    <DashboardShell
      title="My profile"
      subtitle="Everything here is private by default. You decide what providers can see."
      nav={nav}
      active="/dashboard/profile"
    >
      <ProfileForm
        user={{
          firstName: user.firstName,
          lastName: user.lastName,
          locationLabel: user.locationLabel ?? "",
        }}
        profile={{
          photoUrl: user.profile?.photoUrl ?? null,
          about: user.profile?.about ?? "",
          accommodationNeeds: user.profile?.accommodationNeeds ?? "",
          supportNeeds: user.profile?.supportNeeds ?? "",
          accessibilityNeeds: user.profile?.accessibilityNeeds ?? "",
          otherRequirements: user.profile?.otherRequirements ?? "",
          preferredLocations: user.profile?.preferredLocations ?? [],
          preferredTypes: user.profile?.preferredTypes ?? [],
          supportTypes: user.profile?.supportTypes ?? [],
          genderArrangement: user.profile?.genderArrangement ?? "ANY",
          dateOfBirth: user.profile?.dateOfBirth?.toISOString().slice(0, 10) ?? "",
          availableFrom: user.profile?.availableFrom?.toISOString().slice(0, 10) ?? "",
          publicProfile: user.profile?.publicProfile ?? false,
          showPhoto: user.profile?.showPhoto ?? false,
          showAge: user.profile?.showAge ?? true,
          showLocation: user.profile?.showLocation ?? true,
          discoverable: user.profile?.discoverable ?? false,
          socialLinks: Array.isArray(user.profile?.socialLinks)
            ? (user.profile!.socialLinks as { platform: string; url: string }[])
            : [],
        }}
      />
    </DashboardShell>
  );
}
