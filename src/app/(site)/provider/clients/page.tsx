import Link from "next/link";
import { db } from "@/lib/db";
import { requireCompany } from "@/lib/rbac";
import { DashboardShell } from "@/components/dashboard-shell";
import { EmptyState } from "@/components/ui";
import { providerNav } from "../nav";
import { supportLabel } from "@/lib/taxonomy";
import { ageFrom, shortDate } from "@/lib/format";
import { ClientAvatar } from "@/components/client-avatar";
import { clientPhotoSrc } from "@/lib/client-card";

export const metadata = { title: "Shared profiles" };
export const dynamic = "force-dynamic";

export default async function ProviderClientsPage() {
  const { companyId } = await requireCompany();
  const [nav, shares] = await Promise.all([
    providerNav(companyId),
    db.clientShare.findMany({
      where: { companyId, revokedAt: null, client: { deletedAt: null } },
      orderBy: { createdAt: "desc" },
      include: {
        client: { select: { id: true, firstName: true, lastName: true, dateOfBirth: true, preferredLocation: true, supportTypes: true, status: true, photoUrl: true, updatedAt: true } },
        sharedBy: { select: { firstName: true, lastName: true } },
      },
    }),
  ]);

  return (
    <DashboardShell
      title="Shared profiles"
      subtitle="Referrers who want you to consider a specific person share their profile here. It's a heads-up, not an application — reach out if you have something suitable."
      nav={nav}
      active="/provider/clients"
    >
      {shares.length === 0 ? (
        <EmptyState title="Nothing shared with you yet" body="When a referrer shares a client profile, it appears here." />
      ) : (
        <ul className="grid animate-fade-in-up gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {shares.map((share) => (
            <li key={share.id}>
              <Link href={`/provider/clients/${share.client.id}`} className="interactive-card card block h-full p-5">
                <div className="flex items-center gap-3">
                  <ClientAvatar name={`${share.client.firstName} ${share.client.lastName}`} src={clientPhotoSrc(share.client)} />
                  <h2 className="text-[17px]">
                    {share.client.firstName} {share.client.lastName}
                  </h2>
                </div>
                <p className="mt-1 text-[13px] text-ink-faint">
                  {share.client.dateOfBirth ? `${ageFrom(share.client.dateOfBirth)} · ` : ""}
                  {share.client.preferredLocation || "No preferred area set"}
                </p>
                {share.client.supportTypes.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {share.client.supportTypes.slice(0, 3).map((slug) => (
                      <span key={slug} className="chip">{supportLabel(slug)}</span>
                    ))}
                  </div>
                )}
                <p className="mt-4 text-[13px] text-ink-faint">
                  Shared by {share.sharedBy.firstName} {share.sharedBy.lastName} · {shortDate(share.createdAt)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </DashboardShell>
  );
}
