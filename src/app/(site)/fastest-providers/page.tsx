import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import { VerifiedBadge } from "@/components/badges";
import { formatReplyTime, LEAGUE_DAYS, LEAGUE_MIN_REPLIES } from "@/lib/response-league";
import { liveCities, responseLeague } from "@/server/response-league";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ city?: string }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { city } = await searchParams;
  const place = city?.trim() ? ` in ${city.trim()}` : "";
  return pageMetadata({
    title: `Fastest-replying accommodation providers${place}`,
    description: `The supported and HMO accommodation providers${place} who reply to enquiries fastest on RoomsNow, ranked over the last ${LEAGUE_DAYS} days.`,
    path: `/fastest-providers${city ? `?city=${encodeURIComponent(city)}` : ""}`,
  });
}

const MEDALS = ["🥇", "🥈", "🥉"];

/** Public monthly league: providers ranked by how quickly they reply to new enquiries. */
export default async function FastestProvidersPage({ searchParams }: Props) {
  const query = await searchParams;
  const cities = await liveCities();
  const city = cities.find((c) => c.toLowerCase() === query.city?.trim().toLowerCase()) ?? null;
  const league = await responseLeague(city);
  const place = city ?? "the UK";
  const shareUrl = `https://www.roomsnow.co.uk/fastest-providers${city ? `?city=${encodeURIComponent(city)}` : ""}`;

  return (
    <>
      <section className="surface-home border-b border-line">
        <div className="shell py-12 sm:py-16">
          <span className="eyebrow">MONTHLY LEAGUE · LAST {LEAGUE_DAYS} DAYS</span>
          <h1 className="mt-4 max-w-[22ch] text-[34px] leading-tight sm:text-[46px]">Fastest-replying providers in {place}</h1>
          <p className="mt-4 max-w-[62ch] text-[17px] leading-relaxed text-ink-soft">
            When you need a room, a quick answer matters. These providers reply to new enquiries fastest on RoomsNow.
          </p>
          <nav aria-label="Choose a city" className="mt-6 flex flex-wrap gap-2">
            <Link href="/fastest-providers" className={city ? "chip" : "chip chip-active"} aria-current={city ? undefined : "page"}>All areas</Link>
            {cities.map((c) => (
              <Link key={c} href={`/fastest-providers?city=${encodeURIComponent(c)}`} className={c === city ? "chip chip-active" : "chip"} aria-current={c === city ? "page" : undefined}>{c}</Link>
            ))}
          </nav>
        </div>
      </section>

      <div className="shell max-w-4xl py-10 sm:py-12">
        {league.length === 0 ? (
          <div className="card p-6 text-center">
            <h2 className="text-[20px]">Not enough replies yet</h2>
            <p className="mx-auto mt-2 max-w-[52ch] text-[15px] text-ink-soft">
              Providers join the league once they've replied to at least {LEAGUE_MIN_REPLIES} new enquiries in the last {LEAGUE_DAYS} days. Check back soon.
            </p>
          </div>
        ) : (
          <ol className="space-y-3">
            {league.map((entry) => (
              <li key={entry.companyId} className={`card flex items-center gap-4 p-4 sm:p-5 ${entry.rank <= 3 ? "ring-1 ring-[#e0a83a]/50" : ""}`}>
                <span className="w-10 shrink-0 text-center text-[26px] font-bold tabular-nums text-ink-faint" aria-label={`Number ${entry.rank}`}>
                  {MEDALS[entry.rank - 1] ?? entry.rank}
                </span>
                {entry.company.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- provider logos come from storage at varying sizes
                  <img src={entry.company.logoUrl} alt="" className="h-12 w-12 shrink-0 rounded-full border border-line bg-white object-contain" />
                ) : (
                  <span aria-hidden="true" className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-pine text-[18px] font-bold text-white">{entry.company.name.charAt(0)}</span>
                )}
                <div className="min-w-0 flex-1">
                  <Link href={`/companies/${entry.company.slug}`} className="block truncate text-[17px] font-semibold hover:text-pine-dark">{entry.company.name}</Link>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {entry.minutes <= 60 && <span className="rounded-pill bg-[#fdf0e3] px-2 py-0.5 text-[11.5px] font-semibold text-[#8a4410]">⚡ Top responder</span>}
                    {entry.company.verification === "APPROVED" && <VerifiedBadge compact />}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[18px] font-bold tabular-nums text-pine-dark">{formatReplyTime(entry.minutes)}</p>
                  <p className="text-[12px] text-ink-faint">typical reply · {entry.replies} enquiries</p>
                </div>
              </li>
            ))}
          </ol>
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          <a href={`https://wa.me/?text=${encodeURIComponent(`Fastest-replying accommodation providers in ${place} on RoomsNow: ${shareUrl}`)}`} target="_blank" rel="noopener" className="btn-secondary">Share on WhatsApp</a>
          <Link href={city ? `/search?where=${encodeURIComponent(city)}` : "/search"} className="btn-primary">See rooms in {place}</Link>
        </div>

        <aside className="mt-8 rounded-card border border-line bg-paper-sunk p-5 text-[14px] leading-relaxed text-ink-soft">
          <strong className="text-ink">How it works:</strong> we measure the time from someone's first message to a provider's first reply, for conversations started in the last {LEAGUE_DAYS} days.
          The figure shown is the typical (median) reply time. Unanswered messages count as a week, so ignoring enquiries lowers a provider's place.
          Providers need at least {LEAGUE_MIN_REPLIES} enquiries, and a typical reply within a day, to appear. <Link href="/advertise-accommodation" className="font-semibold text-pine-dark underline">Are you a provider? List your rooms free.</Link>
        </aside>
      </div>
    </>
  );
}
