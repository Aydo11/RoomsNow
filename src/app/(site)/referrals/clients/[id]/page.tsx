import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireReferrer } from "@/lib/rbac";
import { DashboardShell } from "@/components/dashboard-shell";
import { ShareClientPanel } from "@/components/share-client-panel";
import { ClientActions, DeletedClientBanner } from "@/components/client-actions";
import { ClientAvatar } from "@/components/client-avatar";
import { suggestProvidersForClient } from "@/lib/client-sharing";
import { CLIENT_STATUS_LABEL, CLIENT_STATUS_STYLE, clientPhotoSrc } from "@/lib/client-card";
import { PIPELINE_LABELS, supportLabel } from "@/lib/taxonomy";
import { ageFrom, shortDate, timeAgo } from "@/lib/format";
import { clsx } from "@/lib/clsx";
import { referrerNav } from "../../nav";

export const dynamic = "force-dynamic";

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
      messages: {
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          createdAt: true,
          conversationId: true,
          conversation: {
            select: {
              participants: {
                where: { userId: { not: user.id } },
                select: { user: { select: { firstName: true, lastName: true } }, companyId: true },
                take: 1,
              },
              companyId: true,
            },
          },
        },
      },
    },
  });
  if (!client) notFound();

  const deleted = Boolean(client.deletedAt);
  const companyIds = Array.from(
    new Set(client.messages.map((m) => m.conversation.companyId ?? m.conversation.participants[0]?.companyId).filter(Boolean) as string[]),
  );
  const [nav, suggestions, companies] = await Promise.all([
    referrerNav(user.id),
    deleted ? Promise.resolve([]) : suggestProvidersForClient(client),
    companyIds.length ? db.company.findMany({ where: { id: { in: companyIds } }, select: { id: true, name: true } }) : Promise.resolve([]),
  ]);
  const companyName = new Map(companies.map((c) => [c.id, c.name]));

  // One row per conversation: the most recent time this client was raised in it.
  const contacts = Array.from(
    client.messages
      .reduce((map, message) => {
        if (!map.has(message.conversationId)) map.set(message.conversationId, message);
        return map;
      }, new Map<string, (typeof client.messages)[number]>())
      .values(),
  );

  const name = `${client.firstName} ${client.lastName}`;
  const statusKey = deleted ? "DELETED" : client.status;
  const age = client.dateOfBirth ? ageFrom(client.dateOfBirth) : null;

  return (
    <DashboardShell
      title={name}
      subtitle={[age !== null ? `Age ${age}` : null, client.preferredLocation, `added ${shortDate(client.createdAt)}`].filter(Boolean).join(" · ")}
      nav={nav}
      active="/referrals/clients"
      action={
        deleted ? undefined : (
          <div className="flex flex-wrap gap-2">
            <Link href={`/referrals/new?clientId=${client.id}`} className="btn-primary">
              Refer to an advert
            </Link>
            <Link href={`/referrals/clients/${client.id}/edit`} className="btn-secondary">
              Edit
            </Link>
          </div>
        )
      }
    >
      {deleted && (
        <div className="mb-6">
          <DeletedClientBanner clientId={client.id} deletedOn={shortDate(client.deletedAt)} />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-6">
          <section className="card p-6">
            <div className="flex flex-wrap items-center gap-4">
              <ClientAvatar name={name} src={clientPhotoSrc(client)} size="lg" />
              <div className="min-w-0">
                <span className={clsx("rounded-pill px-2.5 py-1 text-[12px] font-medium", CLIENT_STATUS_STYLE[statusKey])}>
                  {deleted ? "Deleted" : CLIENT_STATUS_LABEL[client.status]}
                </span>
                <p className="mt-2 text-[13px] text-ink-faint">Last updated {timeAgo(client.updatedAt)}</p>
              </div>
            </div>

            <dl className="mt-5 grid gap-4 text-[15px] sm:grid-cols-2">
              {client.phone && (
                <div>
                  <dt className="text-[13px] text-ink-faint">Phone</dt>
                  <dd>{client.phone}</dd>
                </div>
              )}
              {client.email && (
                <div className="min-w-0">
                  <dt className="text-[13px] text-ink-faint">Email</dt>
                  <dd className="break-words">{client.email}</dd>
                </div>
              )}
              {client.preferredLocation && (
                <div>
                  <dt className="text-[13px] text-ink-faint">Preferred area</dt>
                  <dd>{client.preferredLocation}</dd>
                </div>
              )}
              {client.dateOfBirth && (
                <div>
                  <dt className="text-[13px] text-ink-faint">Date of birth</dt>
                  <dd>{shortDate(client.dateOfBirth)}</dd>
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
                No referrals made for {client.firstName} yet. Refer them to a live advert when you find one.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-line">
                {client.referrals.map((referral) => (
                  <li key={referral.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <Link href={`/referrals/${referral.id}`} className="block truncate text-[14px] text-pine-dark hover:underline">
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

          <section className="card p-6">
            <h2 className="text-[18px]">Providers contacted</h2>
            {contacts.length === 0 ? (
              <p className="mt-2 text-[14px] text-ink-soft">
                Conversations where you&apos;ve sent {client.firstName}&apos;s profile appear here, so you can see who
                you&apos;ve already asked.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-line">
                {contacts.map((message) => {
                  const other = message.conversation.participants[0];
                  const orgId = message.conversation.companyId ?? other?.companyId;
                  const label = (orgId && companyName.get(orgId)) || (other ? `${other.user.firstName} ${other.user.lastName}` : "Conversation");
                  return (
                    <li key={message.conversationId} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-[14px] text-ink">{label}</p>
                        <p className="text-[12px] text-ink-faint">Profile sent {shortDate(message.createdAt)}</p>
                      </div>
                      <Link href={`/messages/${message.conversationId}`} className="shrink-0 text-[13px] text-pine-dark hover:underline">
                        Open messages
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {!deleted && <ClientActions clientId={client.id} status={client.status} />}
        </div>

        {!deleted && (
          <aside className="min-w-0">
            <ShareClientPanel
              clientId={client.id}
              firstName={client.firstName}
              suggestions={suggestions}
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
        )}
      </div>
    </DashboardShell>
  );
}
