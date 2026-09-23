import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireReferrer } from "@/lib/rbac";
import { DashboardShell } from "@/components/dashboard-shell";
import { VerifiedBadge } from "@/components/badges";
import { matchesForClient } from "@/server/client-matches";
import { assessmentCompleteness, parseAssessment } from "@/lib/assessment";
import { clientAreas, matchBand } from "@/lib/client-matching";
import { coverImage, videoPosterSrc } from "@/lib/cover-image";
import { demoListingImage } from "@/lib/demo-listings";
import { ACCOMMODATION_TYPES, supportLabel } from "@/lib/taxonomy";
import { clsx } from "@/lib/clsx";
import { referrerNav } from "../../../nav";
import { teamMemberIds } from "@/lib/referral-team";

export const metadata = { title: "Match to an advert" };
export const dynamic = "force-dynamic";

const PAGE = 30;

export default async function ClientMatchesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ vetted?: string; all?: string; more?: string }>;
}) {
  const [{ id }, query, user] = await Promise.all([params, searchParams, requireReferrer()]);
  const teamIds = await teamMemberIds(user.id);
  const client = await db.client.findFirst({
    where: { id, referrerId: { in: teamIds } },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      dateOfBirth: true,
      preferredLocation: true,
      supportTypes: true,
      assessment: true,
      deletedAt: true,
      referrals: { select: { listingId: true } },
    },
  });
  if (!client) notFound();
  if (client.deletedAt) redirect(`/referrals/clients/${client.id}`);

  const vettedOnly = query.vetted === "1";
  const showPoor = query.all === "1";
  const limit = query.more === "1" ? 200 : PAGE;

  const [nav, { rows, considered }] = await Promise.all([referrerNav(user.id), matchesForClient(client, { vettedOnly })]);
  const assessment = parseAssessment(client.assessment);
  const completeness = assessmentCompleteness(assessment);
  const referred = new Set(client.referrals.map((r) => r.listingId).filter(Boolean));
  const visible = rows.filter((r) => showPoor || r.match.score >= 46);
  const hidden = rows.length - visible.length;
  const areas = clientAreas({ ...client, assessment });

  const href = (next: Record<string, string | undefined>) => {
    const qs = new URLSearchParams();
    const merged = { vetted: vettedOnly ? "1" : undefined, all: showPoor ? "1" : undefined, ...next };
    for (const [k, v] of Object.entries(merged)) if (v) qs.set(k, v);
    const s = qs.toString();
    return `/referrals/clients/${client.id}/matches${s ? `?${s}` : ""}`;
  };

  return (
    <DashboardShell
      title={`Refer ${client.firstName} to an advert`}
      subtitle="Live adverts ranked by how well they fit what you've recorded. Pick one to refer — the referral goes straight to that provider."
      nav={nav}
      active="/referrals/clients"
      action={
        <Link href={`/referrals/clients/${client.id}`} className="btn-secondary">
          Back to {client.firstName}
        </Link>
      }
    >
      <section className="card flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 space-y-1.5 text-[14px]">
          <p className="text-ink-soft">
            Matching on{" "}
            <span className="text-ink">{areas.length ? areas.join(", ") : "any area"}</span>
            {assessment.radiusMiles ? ` (+${assessment.radiusMiles} miles)` : ""}
            {client.supportTypes.length > 0 && (
              <>
                {" · "}
                <span className="text-ink">{client.supportTypes.map(supportLabel).join(", ")}</span>
              </>
            )}
            {assessment.accommodationTypes?.length ? ` · ${assessment.accommodationTypes.map((t) => ACCOMMODATION_TYPES[t]).join(", ")}` : ""}
          </p>
          <div className="flex items-center gap-3">
            <div className="h-1.5 w-40 overflow-hidden rounded-full bg-paper-sunk" aria-hidden="true">
              <div className="h-full rounded-full bg-pine" style={{ width: `${completeness}%` }} />
            </div>
            <span className="text-[13px] text-ink-faint">Needs &amp; risk assessment {completeness}% complete</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/referrals/clients/${client.id}/assessment`} className="btn-secondary">
            {completeness ? "Update assessment" : "Add assessment for sharper matches"}
          </Link>
        </div>
      </section>

      <div className="mt-5 flex flex-wrap items-center gap-2 text-[14px]">
        <Link
          href={href({ vetted: vettedOnly ? undefined : "1", more: undefined })}
          aria-pressed={vettedOnly}
          className={clsx("rounded-pill border px-3.5 py-1.5", vettedOnly ? "border-ink bg-ink text-white" : "border-line bg-white text-ink-soft hover:text-ink")}
        >
          CQC / BVSC vetted only
        </Link>
        <Link
          href={href({ all: showPoor ? undefined : "1", more: undefined })}
          aria-pressed={showPoor}
          className={clsx("rounded-pill border px-3.5 py-1.5", showPoor ? "border-ink bg-ink text-white" : "border-line bg-white text-ink-soft hover:text-ink")}
        >
          Show poor fits{hidden > 0 && !showPoor ? ` (${hidden})` : ""}
        </Link>
        <span className="ml-auto text-[13px] text-ink-faint">
          {visible.length} of {considered} live adverts
        </span>
      </div>

      {visible.length === 0 ? (
        <div className="card mt-4 px-6 py-10 text-center">
          <h2 className="text-[18px]">No good matches right now</h2>
          <p className="mx-auto mt-2 max-w-[55ch] text-[14px] text-ink-soft">
            {considered === 0
              ? vettedOnly
                ? "No vetted provider has a room free at the moment."
                : "There are no live adverts with rooms free at the moment."
              : "Nothing scores well against what you've recorded. Show poor fits to see everything, widen the area in the assessment, or search all accommodation."}
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {hidden > 0 && <Link href={href({ all: "1" })} className="btn-primary">Show poor fits</Link>}
            <Link href="/search" className="btn-secondary">Search all accommodation</Link>
          </div>
        </div>
      ) : (
        <ol className="mt-4 space-y-3">
          {visible.slice(0, limit).map(({ listing, match, distance }) => {
            const band = matchBand(match.score);
            const cover = coverImage(listing.media);
            const room = match.room;
            const rent = room?.weeklyRent ?? listing.weeklyRentFrom;
            return (
              <li key={listing.id} className="card grid gap-4 p-4 sm:grid-cols-[150px_minmax(0,1fr)] lg:grid-cols-[150px_minmax(0,1fr)_220px]">
                <Link href={`/listings/${listing.id}`} className="relative block h-28 overflow-hidden rounded-[10px] bg-paper-sunk sm:h-full sm:min-h-28">
                  {cover?.isVideoFile ? (
                    <video src={videoPosterSrc(cover.url)} preload="metadata" muted playsInline className="absolute inset-0 h-full w-full bg-black object-cover" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={cover?.url ?? demoListingImage(listing.id).url} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  )}
                </Link>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={clsx("rounded-pill px-2.5 py-1 text-[13px] font-semibold tabular-nums", band.tone)}>
                      {match.score}% · {band.label}
                    </span>
                    {referred.has(listing.id) && <span className="chip text-[12px]">Already referred</span>}
                    {listing.company.accreditations.map((a) => (
                      <span key={a.scheme} className="rounded-pill border border-line bg-white px-2 py-0.5 text-[11px] font-semibold text-ink-soft">
                        {a.scheme}{a.rating ? ` · ${a.rating}` : ""}
                      </span>
                    ))}
                    {listing.company.verification === "APPROVED" && <VerifiedBadge compact />}
                  </div>
                  <Link href={`/listings/${listing.id}`} className="mt-2 block truncate text-[16px] font-semibold text-ink hover:text-pine-dark">
                    {listing.title}
                  </Link>
                  <p className="truncate text-[13px] text-ink-faint">
                    {listing.company.name} · {[listing.property.area, listing.property.city].filter(Boolean).join(", ")}
                    {distance !== null ? ` · ${distance < 1 ? "under a mile" : `${distance.toFixed(1)} miles`}` : ""}
                  </p>
                  <p className="mt-1 text-[13px] text-ink-soft">
                    {room ? (
                      <>
                        Best room: <span className="text-ink">{room.name}</span>
                        {room.ensuite ? " · en-suite" : ""}
                        {rent ? ` · £${Math.round(rent / 100)}/wk` : ""}
                      </>
                    ) : rent ? (
                      `From £${Math.round(rent / 100)}/wk`
                    ) : (
                      "Rent on request"
                    )}
                  </p>
                  <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px]">
                    {match.blockers.map((b) => (
                      <li key={b} className="flex items-center gap-1 text-red-700">
                        <span aria-hidden="true">✕</span> {b}
                      </li>
                    ))}
                    {match.reasons.slice(0, 5).map((r) => (
                      <li key={r} className="flex items-center gap-1 text-pine-dark">
                        <span aria-hidden="true">✓</span> {r}
                      </li>
                    ))}
                    {match.flags.slice(0, 4).map((f) => (
                      <li key={f} className="flex items-center gap-1 text-clay">
                        <span aria-hidden="true">!</span> {f}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex flex-col justify-center gap-2 sm:col-span-2 lg:col-span-1">
                  <Link href={`/referrals/new?clientId=${client.id}&listingId=${listing.id}`} className="btn-primary w-full justify-center">
                    Refer to this advert
                  </Link>
                  <Link href={`/listings/${listing.id}`} className="btn-secondary w-full justify-center">
                    View advert
                  </Link>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {visible.length > limit && (
        <div className="mt-5 text-center">
          <Link href={href({ more: "1" })} className="btn-secondary">
            Show {Math.min(visible.length, 200) - limit} more
          </Link>
        </div>
      )}

      <p className="mt-6 max-w-[80ch] text-[12.5px] leading-relaxed text-ink-faint">
        The match percentage compares what you&apos;ve recorded with what each provider says in their advert. It&apos;s a
        shortlisting aid, not an eligibility or suitability decision — the provider still assesses every referral. Risk
        information only ever raises flags; it isn&apos;t shared unless you choose to include it.
      </p>
    </DashboardShell>
  );
}
