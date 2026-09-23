import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireReferrer } from "@/lib/rbac";
import { DashboardShell } from "@/components/dashboard-shell";
import { ClientForm } from "@/components/client-form";
import { referrerNav } from "../../../nav";
import { clientPhotoSrc } from "@/lib/client-card";
import { teamMemberIds } from "@/lib/referral-team";

export const metadata = { title: "Edit client" };
export const dynamic = "force-dynamic";

export default async function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireReferrer();
  const teamIds = await teamMemberIds(user.id);
  const client = await db.client.findFirst({ where: { id, referrerId: { in: teamIds }, deletedAt: null } });
  if (!client) notFound();

  const nav = await referrerNav(user.id);

  return (
    <DashboardShell title="Edit client" nav={nav} active="/referrals/clients">
      <ClientForm
        defaults={{
          id: client.id,
          firstName: client.firstName,
          lastName: client.lastName,
          dateOfBirth: client.dateOfBirth?.toISOString().slice(0, 10) ?? "",
          phone: client.phone ?? "",
          email: client.email ?? "",
          preferredLocation: client.preferredLocation ?? "",
          accommodationNeeds: client.accommodationNeeds ?? "",
          supportNeeds: client.supportNeeds ?? "",
          supportTypes: client.supportTypes,
          riskNotes: client.riskNotes ?? "",
          status: client.status,
          photo: clientPhotoSrc(client),
        }}
      />
    </DashboardShell>
  );
}
