import { db } from "@/lib/db";
import { requireReferrer } from "@/lib/rbac";
import { DashboardShell } from "@/components/dashboard-shell";
import { ReferralForm } from "@/components/referral-form";
import { referrerNav } from "../nav";

export const metadata = { title: "New referral" };
export const dynamic = "force-dynamic";

export default async function NewReferralPage({
  searchParams,
}: {
  searchParams: Promise<{ listingId?: string; clientId?: string }>;
}) {
  const query = await searchParams;
  const user = await requireReferrer();
  const nav = await referrerNav(user.id);

  const client = query.clientId
    ? await db.client.findFirst({ where: { id: query.clientId, referrerId: user.id, deletedAt: null } })
    : null;

  const listing = query.listingId
    ? await db.listing.findFirst({
        where: { id: query.listingId, status: "ACTIVE" },
        select: {
          id: true,
          title: true,
          referralProcess: true,
          eligibility: true,
          company: { select: { name: true } },
          property: { select: { city: true } },
        },
      })
    : null;

  return (
    <DashboardShell
      title="Make a referral"
      subtitle={
        listing
          ? `To ${listing.title}, ${listing.company.name} — ${listing.property.city}`
          : "Not tied to a particular advert. Providers you contact can pick it up."
      }
      nav={nav}
      active="/referrals/new"
    >
      {listing?.eligibility && (
        <section className="card mb-6 p-5">
          <h2 className="text-[18px]">Who this is for</h2>
          <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-ink-soft">
            {listing.eligibility}
          </p>
          {listing.referralProcess && (
            <>
              <h3 className="mt-4 text-[16px]">How referrals are handled</h3>
              <p className="mt-1 whitespace-pre-line text-[15px] leading-relaxed text-ink-soft">
                {listing.referralProcess}
              </p>
            </>
          )}
        </section>
      )}

      <ReferralForm
        listingId={listing?.id}
        clientId={client?.id}
        defaults={{
          organisation: user.staffOf[0]?.company?.name ?? "",
          applicantFirstName: client?.firstName,
          applicantLastName: client?.lastName,
          applicantDob: client?.dateOfBirth?.toISOString().slice(0, 10),
          applicantPhone: client?.phone ?? undefined,
          applicantEmail: client?.email ?? undefined,
          preferredLocation: client?.preferredLocation ?? undefined,
          accommodationNeeds: client?.accommodationNeeds ?? undefined,
          supportNeeds: client?.supportNeeds ?? undefined,
          supportTypes: client?.supportTypes,
        }}
      />
    </DashboardShell>
  );
}
