import Link from "next/link";
import { redirect } from "next/navigation";
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
  // A referral always goes to a specific advert, so its provider is known. With
  // a client but no advert, send the referrer to that client's ranked matches.
  if (!query.listingId && query.clientId) redirect(`/referrals/clients/${encodeURIComponent(query.clientId)}/matches`);

  const nav = await referrerNav(user.id);

  if (!query.listingId) {
    const clients = await db.client.findMany({
      where: { referrerId: user.id, deletedAt: null, status: "ACTIVE" },
      orderBy: { updatedAt: "desc" },
      take: 50,
      select: { id: true, firstName: true, lastName: true, preferredLocation: true },
    });
    return (
      <DashboardShell
        title="Make a referral"
        subtitle="Referrals go to a specific advert, so the provider receives it straight away. Choose who you're referring and we'll rank the adverts that fit them."
        nav={nav}
        active="/referrals/new"
      >
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="card p-5">
            <h2 className="text-[18px]">Who are you referring?</h2>
            {clients.length === 0 ? (
              <p className="mt-2 text-[14px] text-ink-soft">You haven&apos;t added any active clients yet.</p>
            ) : (
              <ul className="mt-3 divide-y divide-line">
                {clients.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-[15px] text-ink">{c.firstName} {c.lastName}</p>
                      {c.preferredLocation && <p className="truncate text-[12.5px] text-ink-faint">{c.preferredLocation}</p>}
                    </div>
                    <Link href={`/referrals/clients/${c.id}/matches`} className="btn-primary shrink-0 py-1.5 text-[14px]">
                      Find an advert
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <aside className="space-y-3">
            <div className="card p-5 text-[14px] text-ink-soft">
              <h2 className="text-[16px] text-ink">Someone new?</h2>
              <p className="mt-1">Add them as a client first — it only takes a minute and keeps their details ready for next time.</p>
              <Link href="/referrals/clients/new" className="btn-secondary mt-3 w-full justify-center">Add a client</Link>
            </div>
            <div className="card p-5 text-[14px] text-ink-soft">
              <h2 className="text-[16px] text-ink">Already found a room?</h2>
              <p className="mt-1">Open the advert and press Refer — the referral goes straight to that provider.</p>
              <Link href="/search" className="btn-secondary mt-3 w-full justify-center">Search accommodation</Link>
            </div>
          </aside>
        </div>
      </DashboardShell>
    );
  }

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

  if (!listing) {
    return (
      <DashboardShell title="Make a referral" subtitle="That advert is no longer live." nav={nav} active="/referrals/new">
        <div className="card px-6 py-10 text-center">
          <h2 className="text-[18px]">This advert isn&apos;t taking referrals</h2>
          <p className="mx-auto mt-2 max-w-[50ch] text-[14px] text-ink-soft">It may have been paused or filled. Pick another advert instead.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {client && <Link href={`/referrals/clients/${client.id}/matches`} className="btn-primary">See {client.firstName}&apos;s matches</Link>}
            <Link href="/search" className="btn-secondary">Search accommodation</Link>
          </div>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      title="Make a referral"
      subtitle={
        listing
          ? `To ${listing.company.name} — ${listing.title}, ${listing.property.city}`
          : "That advert is no longer live. Choose another from the client's matches."
      }
      nav={nav}
      active="/referrals/new"
    >
      <section className="card mb-6 flex flex-wrap items-center justify-between gap-3 border-pine/30 bg-pine-light/40 p-5">
        <div className="min-w-0">
          <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-pine-dark">Sending to</p>
          <p className="mt-1 text-[17px] font-semibold text-ink">{listing.company.name}</p>
          <p className="text-[14px] text-ink-soft">
            {listing.title} · {listing.property.city}
            {client ? ` · for ${client.firstName} ${client.lastName}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/listings/${listing.id}`} className="btn-secondary py-1.5 text-[14px]">View advert</Link>
          {client && <Link href={`/referrals/clients/${client.id}/matches`} className="btn-secondary py-1.5 text-[14px]">Choose a different advert</Link>}
        </div>
      </section>

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
