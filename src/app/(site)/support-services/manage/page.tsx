import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSupportOrganisation } from "@/server/support-directory";
import { removeSupportLocationAction, removeSupportPostAction } from "@/server/actions/support-directory";
import { postIsCurrent } from "@/lib/support-directory";
import { SupportLocationForm, SupportOrganisationForm, SupportPostForm } from "@/components/support-forms";
import { SupportPostCard } from "@/components/support-directory-ui";
import { SubmitButton } from "@/components/ui";

export const metadata = { title: "Manage your support service", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const STATUS_COPY = {
  PENDING: { label: "Waiting for approval", tone: "bg-clay-light text-clay", body: "Our team is checking your listing. It will appear in Support services once approved, usually within a working day." },
  APPROVED: { label: "Live", tone: "bg-pine-light text-pine-dark", body: "Your listing is showing in Support services." },
  REJECTED: { label: "Not approved", tone: "bg-clay-light text-clay", body: "Update your details and contact us if you think this is a mistake." },
  SUSPENDED: { label: "Hidden", tone: "bg-clay-light text-clay", body: "Your listing has been hidden by our team." },
} as const;

export default async function ManageSupportOrganisationPage({ searchParams }: { searchParams: Promise<{ org?: string; created?: string }> }) {
  const { org: orgId, created } = await searchParams;
  const { organisation, isAdmin } = await requireSupportOrganisation(orgId);
  if (!organisation) redirect("/support-services/join");
  const status = STATUS_COPY[organisation.status];
  const now = new Date();
  const livePosts = organisation.posts.filter((post) => postIsCurrent(post, now));

  return (
    <div className="shell max-w-5xl space-y-6 py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[12.5px] font-semibold uppercase tracking-[0.08em] text-pine-dark">Support services{isAdmin && orgId ? " · admin" : ""}</p>
          <h1 className="mt-1 text-[28px] leading-tight">{organisation.name}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-[14px] text-ink-soft">
            <span className={`rounded-pill px-2.5 py-0.5 text-[12.5px] font-semibold ${status.tone}`}>{status.label}</span>
            {organisation.views} page views
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/support-services/${organisation.slug}`} className="btn-secondary">View listing</Link>
          {isAdmin && <Link href="/admin/support-services" className="btn-ghost">All services</Link>}
        </div>
      </header>

      {created && <p className="rounded-[10px] border border-pine/25 bg-pine-light px-4 py-3 text-[14px] text-pine-dark" role="status">Thanks! Your listing has been sent to our team. Add your locations and any upcoming training below while you wait.</p>}
      <p className="text-[14px] text-ink-soft">{status.body}{organisation.statusReason ? ` Note from our team: ${organisation.statusReason}` : ""}</p>

      <section className="card p-5 sm:p-6" aria-labelledby="posts-heading">
        <h2 id="posts-heading" className="text-[20px]">Post training, an event or news</h2>
        <p className="mt-1 text-[14px] text-ink-soft">E.g. free drug awareness training for housing staff, a weekly drop-in, or a change to your opening hours.</p>
        <div className="mt-5"><SupportPostForm orgId={organisation.id} /></div>
        {livePosts.length > 0 && (
          <div className="mt-6 border-t border-line pt-5">
            <h3 className="text-[16px]">Showing now</h3>
            <ul className="mt-3 grid gap-3">
              {livePosts.map((post) => (
                <li key={post.id}>
                  <SupportPostCard post={post}>
                    <form action={removeSupportPostAction}>
                      <input type="hidden" name="postId" value={post.id} />
                      <SubmitButton className="text-[13px] font-medium text-clay hover:underline" pendingLabel="Removing…">Remove</SubmitButton>
                    </form>
                  </SupportPostCard>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="card p-5 sm:p-6" aria-labelledby="locations-heading">
        <h2 id="locations-heading" className="text-[20px]">Locations</h2>
        <p className="mt-1 text-[14px] text-ink-soft">Add each place people can visit. They appear on the map with directions.</p>
        {organisation.locations.length > 0 && (
          <ul className="mt-4 divide-y divide-line rounded-card border border-line">
            {organisation.locations.map((location) => (
              <li key={location.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-[14px]">
                <span>
                  <span className="font-semibold text-ink">{location.name}</span>
                  <span className="block text-ink-soft">{location.address}, {location.city} {location.postcode}{location.latitude == null ? " · finding on map…" : ""}</span>
                </span>
                <form action={removeSupportLocationAction}>
                  <input type="hidden" name="locationId" value={location.id} />
                  <SubmitButton className="text-[13px] font-medium text-clay hover:underline" pendingLabel="Removing…">Remove</SubmitButton>
                </form>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-5"><SupportLocationForm orgId={organisation.id} /></div>
      </section>

      <section className="card p-5 sm:p-6" aria-labelledby="details-heading">
        <h2 id="details-heading" className="text-[20px]">Organisation details</h2>
        <div className="mt-5">
          <SupportOrganisationForm orgId={organisation.id} isAdmin={isAdmin} defaults={organisation} />
        </div>
      </section>
    </div>
  );
}
