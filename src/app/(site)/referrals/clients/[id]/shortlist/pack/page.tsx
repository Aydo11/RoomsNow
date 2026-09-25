import Link from "next/link";
import { notFound } from "next/navigation";
import { requireReferrer } from "@/lib/rbac";
import { PrintButton } from "@/components/shortlist-controls";
import { loadShortlist } from "@/server/shortlist";
import { SHORTLIST_ROWS, shortlistFacts } from "@/lib/shortlist-facts";
import { matchBand } from "@/lib/client-matching";
import { coverImage } from "@/lib/cover-image";
import { demoListingImage } from "@/lib/demo-listings";
import { supportLabel } from "@/lib/taxonomy";

export const metadata = { title: "Referral pack", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/**
 * Printable referral pack: the client's shortlist as an A4 document for a
 * manager or placement panel. "Download PDF" uses the browser's own
 * print-to-PDF, so it works on any device without extra software. It only
 * includes the client's first name, initial, area and support needs, never
 * the risk assessment.
 */
export default async function ReferralPackPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, user] = await Promise.all([params, requireReferrer()]);
  const data = await loadShortlist(id, user.id);
  if (!data) notFound();
  const { client, items } = data;
  const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const name = `${client.firstName} ${client.lastName.charAt(0)}.`;

  return (
    <div className="bg-paper-sunk py-6 print:bg-white print:py-0">
      <style>{PACK_CSS}</style>
      <div className="mx-auto mb-4 flex max-w-[820px] flex-wrap items-center justify-between gap-3 px-4 print:hidden">
        <Link href={`/referrals/clients/${client.id}/shortlist`} className="btn-ghost">
          ← Back to the shortlist
        </Link>
        <PrintButton />
      </div>

      <article className="pack mx-auto max-w-[820px] bg-white px-10 py-10 text-ink shadow-raise print:max-w-none print:px-0 print:py-0 print:shadow-none">
        <header className="flex items-start justify-between gap-6 border-b-2 border-pine pb-5">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-pine-dark">Accommodation options</p>
            <h1 className="mt-1 text-[28px] font-bold leading-tight">Referral pack for {name}</h1>
            <p className="mt-1 text-[13px] text-ink-soft">
              Prepared by {user.firstName} {user.lastName} on {today}
            </p>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/roomsnow-logo-fullcolor.svg" alt="RoomsNow" className="h-9 w-auto" />
        </header>

        <section className="mt-5 grid grid-cols-2 gap-4 rounded-[10px] bg-paper-sunk p-4 text-[13px] print:bg-[#f3f6f9]">
          <div>
            <p className="font-semibold text-ink-faint">Area wanted</p>
            <p className="mt-0.5 text-ink">{client.preferredLocation || "Not recorded"}</p>
          </div>
          <div>
            <p className="font-semibold text-ink-faint">Support needs</p>
            <p className="mt-0.5 text-ink">{client.supportTypes.length ? client.supportTypes.map(supportLabel).join(", ") : "Not recorded"}</p>
          </div>
        </section>

        {items.length === 0 ? (
          <p className="mt-8 text-[15px] text-ink-soft">No rooms are shortlisted yet.</p>
        ) : (
          <>
            <h2 className="mt-7 text-[18px] font-bold">At a glance</h2>
            <table className="mt-3 w-full border-collapse text-[12px]">
              <thead>
                <tr className="bg-pine text-left text-white">
                  <th className="px-2.5 py-2 font-semibold">Option</th>
                  <th className="px-2.5 py-2 font-semibold">Match</th>
                  <th className="px-2.5 py-2 font-semibold">Rent</th>
                  <th className="px-2.5 py-2 font-semibold">Housing Benefit</th>
                  <th className="px-2.5 py-2 font-semibold">Room free</th>
                </tr>
              </thead>
              <tbody>
                {items.map(({ listing, match }, index) => {
                  const facts = shortlistFacts(listing, match.room);
                  return (
                    <tr key={listing.id} className="border-b border-line">
                      <td className="px-2.5 py-2">
                        <strong>{index + 1}.</strong> {listing.title}
                      </td>
                      <td className="px-2.5 py-2 tabular-nums">{match.score}%</td>
                      <td className="px-2.5 py-2">{facts.Rent}</td>
                      <td className="px-2.5 py-2">{facts["Housing Benefit"]}</td>
                      <td className="px-2.5 py-2">{facts["Room free"]}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {items.map(({ listing, match, note, distance }, index) => {
              const facts = shortlistFacts(listing, match.room);
              const cover = coverImage(listing.media);
              const band = matchBand(match.score);
              return (
                <section key={listing.id} className="pack-option mt-8 border-t border-line pt-6">
                  <div className="grid grid-cols-[200px_1fr] gap-5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={cover && !cover.isVideoFile ? cover.url : demoListingImage(listing.id).url}
                      alt=""
                      className="h-[140px] w-[200px] rounded-[10px] object-cover"
                    />
                    <div>
                      <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-pine-dark">Option {index + 1}</p>
                      <h3 className="mt-1 text-[18px] font-bold leading-snug">{listing.title}</h3>
                      <p className="mt-0.5 text-[13px] text-ink-soft">
                        {[listing.property.area, listing.property.city, listing.property.postcode.split(" ")[0]].filter(Boolean).join(", ")}
                        {distance !== null ? ` · ${distance < 1 ? "under a mile" : `${distance.toFixed(1)} miles`} from the area wanted` : ""}
                      </p>
                      <p className="mt-2 text-[13px]">
                        <strong>
                          {match.score}% · {band.label}
                        </strong>
                      </p>
                    </div>
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1.5 text-[12.5px]">
                    {SHORTLIST_ROWS.map((row) => (
                      <div key={row} className="flex gap-2 border-b border-dotted border-line py-1">
                        <dt className="w-[120px] shrink-0 text-ink-faint">{row}</dt>
                        <dd className="text-ink">{facts[row]}</dd>
                      </div>
                    ))}
                  </dl>
                  {(match.reasons.length > 0 || match.blockers.length > 0 || match.flags.length > 0) && (
                    <ul className="mt-3 space-y-0.5 text-[12.5px]">
                      {match.blockers.map((b) => (
                        <li key={b}>✕ {b}</li>
                      ))}
                      {match.reasons.slice(0, 5).map((r) => (
                        <li key={r}>✓ {r}</li>
                      ))}
                      {match.flags.slice(0, 3).map((f) => (
                        <li key={f}>! {f}</li>
                      ))}
                    </ul>
                  )}
                  {note && (
                    <p className="mt-3 rounded-[8px] bg-pine-light/60 p-3 text-[12.5px] print:bg-[#eaf2fa]">
                      <strong>Notes:</strong> {note}
                    </p>
                  )}
                  <p className="mt-2 text-[11.5px] text-ink-faint">www.roomsnow.co.uk/listings/{listing.id}</p>
                </section>
              );
            })}
          </>
        )}

        <footer className="mt-10 border-t border-line pt-4 text-[11px] leading-relaxed text-ink-faint">
          Match scores compare what was recorded about the client with what each provider states in their advert. They are a shortlisting aid, not an
          eligibility or suitability decision; each provider assesses every referral. Availability and prices can change, so check the live advert before
          referring. Produced with RoomsNow.
        </footer>
      </article>
    </div>
  );
}

const PACK_CSS = `
@page { size: A4; margin: 14mm; }
@media print {
  .pack-option { break-inside: avoid; }
  .pack { font-size: 12px; }
  html, body { background: #fff !important; }
}
`;
