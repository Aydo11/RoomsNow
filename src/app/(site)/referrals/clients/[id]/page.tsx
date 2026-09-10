import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireReferrer } from "@/lib/rbac";
import { DashboardShell } from "@/components/dashboard-shell";
import { ShareClientPanel } from "@/components/share-client-panel";
import { ClientActions } from "@/components/client-actions";
import { PIPELINE_LABELS } from "@/lib/taxonomy";
import { supportLabel } from "@/lib/taxonomy";
import { ageFrom, shortDate } from "@/lib/format";
import { referrerNav } from "../../nav";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = { ACTIVE: "Active", PLACED: "Placed", ARCHIVED: "Archived" };

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireReferrer();

  const client = await db.client.findFirst({
    where: { id, referrerId: user.id },
    include: {
      referrals: {
        orderBy: { createdAt: "desc" },
        include: { listing: { select: { id: true, title: true, company: { select: { name: true } } } } },
      },
      shares: {
        orderBy: { createdAt: "desc" },
        include: { company: { select: { name: true } } },
      },
    },
  });
  if (!client) notFound();

  const nav = await referrerNav(user.id);

  return (
    <DashboardShell
      title={`${client.firstName} ${client.lastName}`}
      subtitle={
        client.dateOfBirth
          ? `${ageFrom(client.dateOfBirth)} · ${STATUS_LABEL[client.status]}`
          : STATUS_LABEL[client.status]
      }
      nav={nav}
      active="/referrals/clients"
      action={
        <div className="flex flex-wrap gap-2">
          <Link href={`/referrals/new?clientId=${client.id}`} className="btn-primary">
            Refer to an advert
          </Link>
          <Link href={`/referrals/clients/${client.id}/edit`} className="btn-secondary">
            Edit
          </Link>
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <section className="card p-6">
            <h2 className="text-[18px]">Profile</h2>
            <dl className="mt-4 grid gap-4 text-[15px] sm:grid-cols-2">
              {client.phone && (
                <div>
                  <dt className="text-[13px] text-ink-faint">Phone</dt>
                  <dd>{client.phone}</dd>
                </div>
              )}
              {client.email && (
                <div>
                  <dt className="text-[13px] text-ink-faint">Email</dt>
                  <dd>{client.email}</dd>
                </div>
              )}
              {client.preferredLocation && (
                <div>
                  <dt className="text-[13px] text-ink-faint">Preferred area</dt>
                  <dd>{client.preferredLocation}</dd>
                </div>
              )}
            </dl>

            {client.supportTypes.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {client.supportTypes.map((slug) => (
                  <span key={slug} className="chip">{supportLabel(slug)}</span>
                ))}
              </div>
            )}

            {client.accommodationNeeds && (
              <div className="mt-5">
                <h3 className="text-[14px] font-medium text-ink-soft">Accommodation needs</h3>
                <p className="mt-1 whitespace-pre-line text-[15px] leading-relaxed">{client.accommodationNeeds}</p>
              </div>
            )}
            {client.supportNeeds && (
              <div className="mt-5">
                <h3 className="text-[14px] font-medium text-ink-soft">Support needs</h3>
                <p className="mt-1 whitespace-pre-line text-[15px] leading-relaxed">{client.supportNeeds}</p>
              </div>
            )}
            {client.riskNotes && (
              <div className="mt-5 rounded-[10px] bg-paper-sunk px-4 py-3">
                <h3 className="text-[13px] font-medium text-ink-soft">Private notes — never shared</h3>
                <p className="mt-1 whitespace-pre-line text-[14px] leading-relaxed text-ink-soft">{client.riskNotes}</p>
              </div>
            )}
          </section>

          <section className="card p-6">
            <h2 className="text-[18px]">Referral history</h2>
            {client.referrals.length === 0 ? (
              <p className="mt-2 text-[14px] text-ink-soft">
                No referrals made from this client yet. Refer them to a live advert when you find one.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-line">
                {client.referrals.map((referral) => (
                  <li key={referral.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <Link href={`/referrals/${referral.id}`} className="truncate text-[14px] text-pine-dark hover:underline">
                        {referral.listing ? referral.listing.title : referral.reference}
                      </Link>
                      <p className="truncate text-[12px] text-ink-faint">
                        {referral.listing?.company.name ?? "No advert attached"} · {shortDate(referral.createdAt)}
                      </p>
                    </div>
                    <span className="shrink-0 chip">{PIPELINE_LABELS[referral.status] ?? referral.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <ClientActions clientId={client.id} status={client.status} />
        </div>

        <aside>
          <ShareClientPanel
            clientId={client.id}
            clientName={`${client.firstName} ${client.lastName}`}
            activeShares={client.shares
              .filter((share) => !share.revokedAt)
              .map((share) => ({
                id: share.id,
                companyName: share.company.name,
                note: share.note,
                createdAt: share.createdAt.toISOString(),
              }))}
            revokedShares={client.shares
              .filter((share) => share.revokedAt)
              .map((share) => ({
                id: share.id,
                companyName: share.company.name,
                note: share.note,
                createdAt: share.createdAt.toISOString(),
              }))}
          />
        </aside>
      </div>
    </DashboardShell>
  );
}
