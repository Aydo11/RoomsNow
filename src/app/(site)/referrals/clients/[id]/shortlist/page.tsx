import Link from "next/link";
import { notFound } from "next/navigation";
import { requireReferrer } from "@/lib/rbac";
import { DashboardShell } from "@/components/dashboard-shell";
import { RemoveFromShortlist, ShortlistNote } from "@/components/shortlist-controls";
import { loadShortlist } from "@/server/shortlist";
import { SHORTLIST_ROWS, shortlistFacts } from "@/lib/shortlist-facts";
import { matchBand } from "@/lib/client-matching";
import { coverImage } from "@/lib/cover-image";
import { demoListingImage } from "@/lib/demo-listings";
import { clsx } from "@/lib/clsx";
import { referrerNav } from "../../../nav";

export const metadata = { title: "Compare shortlist" };
export const dynamic = "force-dynamic";

/** Up to five shortlisted rooms side by side, with notes, ready to print as a referral pack. */
export default async function ShortlistPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, user] = await Promise.all([params, requireReferrer()]);
  const [data, nav] = await Promise.all([loadShortlist(id, user.id), referrerNav(user.id)]);
  if (!data) notFound();
  const { client, items, gone } = data;

  return (
    <DashboardShell
      title={`Shortlist for ${client.firstName}`}
      subtitle="Compare the rooms you've picked side by side, add notes, and download a referral pack for your manager or panel."
      nav={nav}
      active="/referrals/clients"
      action={
        <div className="flex flex-wrap gap-2">
          <Link href={`/referrals/clients/${client.id}/matches`} className="btn-secondary">
            Add more rooms
          </Link>
          {items.length > 0 && (
            <Link href={`/referrals/clients/${client.id}/shortlist/pack`} className="btn-primary">
              Referral pack (PDF)
            </Link>
          )}
        </div>
      }
    >
      {gone.length > 0 && (
        <div className="card mb-4 border-clay/30 bg-clay/5 p-4 text-[14px] text-ink-soft">
          {gone.length === 1 ? "One room is" : `${gone.length} rooms are`} no longer advertised: {gone.map((item) => item.title).join(", ")}.
        </div>
      )}

      {items.length === 0 ? (
        <div className="card px-6 py-10 text-center">
          <h2 className="text-[18px]">No rooms shortlisted yet</h2>
          <p className="mx-auto mt-2 max-w-[52ch] text-[14px] text-ink-soft">
            On {client.firstName}&apos;s matches, tap <strong>Shortlist</strong> on up to five rooms. They&apos;ll appear here side by side.
          </p>
          <Link href={`/referrals/clients/${client.id}/matches`} className="btn-primary mt-5">
            See {client.firstName}&apos;s matches
          </Link>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left text-[14px]">
            <thead>
              <tr className="align-top">
                <th className="sticky left-0 z-10 w-[150px] bg-paper-card p-4" scope="col">
                  <span className="sr-only">Detail</span>
                </th>
                {items.map(({ listing, match }) => {
                  const band = matchBand(match.score);
                  const cover = coverImage(listing.media);
                  return (
                    <th key={listing.id} scope="col" className="min-w-[210px] border-l border-line p-4 font-normal">
                      <div className="relative h-28 overflow-hidden rounded-[10px] bg-paper-sunk">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={cover && !cover.isVideoFile ? cover.url : demoListingImage(listing.id).url} alt="" className="absolute inset-0 h-full w-full object-cover" />
                      </div>
                      <span className={clsx("mt-3 inline-flex rounded-pill px-2.5 py-1 text-[12px] font-semibold tabular-nums", band.tone)}>
                        {match.score}% · {band.label}
                      </span>
                      <Link href={`/listings/${listing.id}`} className="mt-2 line-clamp-2 block text-[15px] font-semibold text-ink hover:text-pine-dark">
                        {listing.title}
                      </Link>
                      <p className="mt-0.5 text-[13px] text-ink-faint">{[listing.property.area, listing.property.city].filter(Boolean).join(", ")}</p>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {SHORTLIST_ROWS.map((row) => (
                <tr key={row} className="border-t border-line align-top">
                  <th scope="row" className="sticky left-0 z-10 bg-paper-card px-4 py-3 text-[13px] font-medium text-ink-faint">
                    {row}
                  </th>
                  {items.map(({ listing, match }) => (
                    <td key={listing.id} className="border-l border-line px-4 py-3 text-ink">
                      {shortlistFacts(listing, match.room)[row]}
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="border-t border-line align-top">
                <th scope="row" className="sticky left-0 z-10 bg-paper-card px-4 py-3 text-[13px] font-medium text-ink-faint">
                  Fit
                </th>
                {items.map(({ listing, match }) => (
                  <td key={listing.id} className="border-l border-line px-4 py-3">
                    <ul className="space-y-1 text-[13px]">
                      {match.blockers.map((b) => (
                        <li key={b} className="text-red-700">✕ {b}</li>
                      ))}
                      {match.reasons.slice(0, 4).map((r) => (
                        <li key={r} className="text-pine-dark">✓ {r}</li>
                      ))}
                      {match.flags.slice(0, 3).map((f) => (
                        <li key={f} className="text-clay">! {f}</li>
                      ))}
                    </ul>
                  </td>
                ))}
              </tr>
              <tr className="border-t border-line align-top">
                <th scope="row" className="sticky left-0 z-10 bg-paper-card px-4 py-3 text-[13px] font-medium text-ink-faint">
                  Your notes
                </th>
                {items.map(({ listing, note }) => (
                  <td key={listing.id} className="border-l border-line px-4 py-3">
                    <ShortlistNote clientId={client.id} listingId={listing.id} initial={note} />
                  </td>
                ))}
              </tr>
              <tr className="border-t border-line align-top">
                <th scope="row" className="sticky left-0 z-10 bg-paper-card px-4 py-3">
                  <span className="sr-only">Actions</span>
                </th>
                {items.map(({ listing }) => (
                  <td key={listing.id} className="border-l border-line px-4 py-3">
                    <div className="flex flex-col gap-2">
                      <Link href={`/referrals/new?clientId=${client.id}&listingId=${listing.id}`} className="btn-primary justify-center">
                        Refer
                      </Link>
                      <RemoveFromShortlist clientId={client.id} listingId={listing.id} />
                    </div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </DashboardShell>
  );
}
