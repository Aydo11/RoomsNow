import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireCompany } from "@/lib/rbac";
import { DashboardShell } from "@/components/dashboard-shell";
import { DirectMessageForm } from "@/components/direct-message-form";
import { providerNav } from "../../nav";
import { supportLabel } from "@/lib/taxonomy";
import { ageFrom, shortDate } from "@/lib/format";
import Link from "next/link";
import { ClientAvatar } from "@/components/client-avatar";
import { clientPhotoSrc } from "@/lib/client-card";
import { ClientSuitabilityReview } from "@/components/client-suitability-review";

export const dynamic = "force-dynamic";

export default async function ProviderClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { companyId } = await requireCompany();

  const share = await db.clientShare.findFirst({
    where: { clientId: id, companyId, revokedAt: null, client: { deletedAt: null } },
    include: {
      sharedBy: { select: { id: true, firstName: true, lastName: true, email: true, organisation: true } },
      // Deliberately not selecting the client's riskNotes — that field is the
      // referrer's own working notes, and sharing a profile is a promise it
      // stays that way.
      client: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          dateOfBirth: true,
          phone: true,
          email: true,
          preferredLocation: true,
          accommodationNeeds: true,
          supportNeeds: true,
          supportTypes: true,
          status: true,
          photoUrl: true,
          updatedAt: true,
        },
      },
    },
  });
  if (!share) notFound();

  const nav = await providerNav(companyId);
  const { client } = share;

  return (
    <DashboardShell
      title={`${client.firstName} ${client.lastName}`}
      subtitle={`Shared by ${share.sharedBy.firstName} ${share.sharedBy.lastName} on ${shortDate(share.createdAt)}`}
      nav={nav}
      active="/provider/clients"
    >
      <section className="card p-5 sm:p-7">
        <div className="flex flex-wrap items-center gap-4 border-b border-line pb-5">
          <ClientAvatar name={`${client.firstName} ${client.lastName}`} src={clientPhotoSrc(client)} size="lg" />
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-wide text-pine-dark">Shared accommodation profile</p>
            <h2 className="mt-0.5 text-[20px]">Profile overview</h2>
            <p className="mt-1 text-[14px] text-ink-soft">
              {[client.dateOfBirth ? `${ageFrom(client.dateOfBirth)} years old` : null, client.preferredLocation].filter(Boolean).join(" · ") || "Age and preferred area not provided"}
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <section className="rounded-[12px] border border-line bg-paper-card p-4 sm:p-5">
            <h3 className="text-[16px] font-semibold">Accommodation needs</h3>
            <p className="mt-2 whitespace-pre-line text-[15px] leading-7 text-ink">{client.accommodationNeeds || "No specific accommodation needs have been added."}</p>
          </section>
          <section className="rounded-[12px] border border-line bg-paper-card p-4 sm:p-5">
            <h3 className="text-[16px] font-semibold">Support needs</h3>
            <p className="mt-2 whitespace-pre-line text-[15px] leading-7 text-ink">{client.supportNeeds || "No detailed support needs have been added."}</p>
          </section>
        </div>

        {client.supportTypes.length > 0 && (
          <div className="mt-5">
            <h3 className="text-[14px] font-medium text-ink-soft">Support categories</h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {client.supportTypes.map((slug) => <span key={slug} className="chip">{supportLabel(slug)}</span>)}
            </div>
          </div>
        )}

        {share.note && (
          <div className="mt-5 rounded-[10px] bg-pine-light px-4 py-3">
            <h3 className="text-[13px] font-medium text-pine-dark">Note from the referrer</h3>
            <p className="mt-1 whitespace-pre-line text-[14px] leading-relaxed text-pine-dark">{share.note}</p>
          </div>
        )}
      </section>

      <div className="mt-5 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <ClientSuitabilityReview shareId={share.id} initialStatus={share.reviewStatus} initialNote={share.reviewNote} />
        <aside className="card p-5 sm:p-6">
          <h2 className="text-[16px]">Get in touch</h2>
          <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">
            This is a heads-up, not an application — there's no referral form filled in yet. If you
            have somewhere suitable, message the referrer to connect.
          </p>
          <dl className="mt-4 space-y-3 text-[14px]">
            <div>
              <dt className="text-[13px] text-ink-faint">Referrer</dt>
              <dd>
                {share.sharedBy.firstName} {share.sharedBy.lastName}
                {share.sharedBy.organisation ? <span className="text-ink-faint"> · {share.sharedBy.organisation}</span> : null}
              </dd>
              <dd className="mt-1">
                <Link href={`/agencies/${share.sharedBy.id}`} className="text-[13px] text-pine-dark hover:underline">
                  View agency profile
                </Link>
              </dd>
            </div>
          </dl>
          <div className="mt-4 border-t border-line pt-4">
            <DirectMessageForm
              recipientUserId={share.sharedById}
              subject={`${client.firstName} ${client.lastName}`}
              label={`Message ${share.sharedBy.firstName}`}
              placeholder={`Hi ${share.sharedBy.firstName} — I've got a room that could suit ${client.firstName}. Are they still looking?`}
            />
          </div>
          <p className="mt-4 text-[12px] text-ink-faint">
            You can also email them directly at{" "}
            <a href={`mailto:${share.sharedBy.email}`} className="text-pine-dark hover:underline">
              {share.sharedBy.email}
            </a>
            . The referrer can revoke your access to this profile at any time.
          </p>
        </aside>
      </div>
    </DashboardShell>
  );
}
