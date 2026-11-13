import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { pageMetadata } from "@/lib/seo";
import { MetricBar, StatCard } from "@/components/dashboard-shell";
import { councilStats } from "@/server/council";
import { liveCities, responseLeague } from "@/server/response-league";
import { formatReplyTime } from "@/lib/response-league";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ city?: string }> };
const DAYS = 90;

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { city } = await searchParams;
  const place = city?.trim() || "your area";
  return pageMetadata({
    title: `Supported Housing & HMO Rooms in ${place}: Live Data`,
    description: `Live supply and demand for supported accommodation and HMO rooms in ${place}: rooms available now, referrals, placements and how fast providers reply.`,
    path: `/insights${city ? `?city=${encodeURIComponent(city)}` : ""}`,
  });
}

const days = (value: number | null) => (value === null ? "Not enough data" : value < 1 ? "Under a day" : `${Math.round(value)} day${Math.round(value) === 1 ? "" : "s"}`);

/**
 * Public area dashboard for councils, commissioners and partners: counts only,
 * nobody can be identified. The fuller private version is the council view.
 */
export default async function InsightsPage({ searchParams }: Props) {
  const query = await searchParams;
  const cities = await liveCities();
  const city = cities.find((c) => c.toLowerCase() === query.city?.trim().toLowerCase()) ?? cities.find((c) => c.toLowerCase() === "birmingham") ?? cities[0] ?? null;

  const since = new Date(Date.now() - DAYS * 24 * 60 * 60_000);
  const [stats, requests, league] = city
    ? await Promise.all([
        councilStats([city], "90"),
        db.accommodationRequest.count({ where: { createdAt: { gte: since }, listing: { property: { city: { equals: city, mode: "insensitive" } } } } }),
        responseLeague(city, 3),
      ])
    : [null, 0, []];
  const maxRooms = Math.max(1, ...(stats?.areas.map((a) => a.rooms) ?? [0]));
  const maxDemand = Math.max(1, ...(stats?.support.map((s) => Math.max(s.referrals, s.rooms)) ?? [0]));

  return (
    <>
      <section className="surface-home border-b border-line">
        <div className="shell py-12 sm:py-16">
          <span className="eyebrow">LIVE AREA DATA · LAST {DAYS} DAYS</span>
          <h1 className="mt-4 max-w-[24ch] text-[34px] leading-tight sm:text-[46px]">Supported housing in {city ?? "your area"}, by the numbers</h1>
          <p className="mt-4 max-w-[64ch] text-[17px] leading-relaxed text-ink-soft">
            Rooms available right now, how many people are looking, and how quickly they're placed. Updated live from RoomsNow. Counts only: nobody can be identified.
          </p>
          <nav aria-label="Choose an area" className="mt-6 flex flex-wrap gap-2">
            {cities.map((c) => (
              <Link key={c} href={`/insights?city=${encodeURIComponent(c)}`} className={c === city ? "chip chip-active" : "chip"} aria-current={c === city ? "page" : undefined}>{c}</Link>
            ))}
          </nav>
        </div>
      </section>

      <div className="shell py-10 sm:py-12">
        {!stats ? (
          <p className="text-[16px] text-ink-soft">No live adverts yet.</p>
        ) : (
          <>
            <h2 className="text-[20px]">Supply</h2>
            <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard label="Rooms available now" value={stats.roomsFree} hint={`across ${stats.adverts} live adverts`} />
              <StatCard label="Providers advertising" value={stats.providers} />
              <StatCard label="Accept Housing Benefit" value={stats.adverts ? `${Math.round((stats.housingBenefitAdverts / stats.adverts) * 100)}%` : "—"} hint="of live adverts" />
              <StatCard label="Fastest typical reply" value={league[0] ? formatReplyTime(league[0].minutes) : "—"} hint={league[0] ? `by ${league[0].company.name}` : "Not enough data yet"} />
            </div>

            <h2 className="mt-10 text-[20px]">Demand and outcomes</h2>
            <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard label="Room requests" value={requests} hint="from people searching" />
              <StatCard label="Professional referrals" value={stats.referralsMade} hint={`from ${stats.agencies} referrer${stats.agencies === 1 ? "" : "s"}`} />
              <StatCard label="Typical time to first reply" value={days(stats.medianDaysToReply)} hint="on referrals" />
              <StatCard label="Typical time to move in" value={days(stats.medianDaysToPlace)} hint={`${stats.placed} placement${stats.placed === 1 ? "" : "s"}`} />
            </div>

            <div className="mt-10 grid gap-6 lg:grid-cols-2">
              {stats.areas.length > 0 && (
                <section className="card p-5 sm:p-6">
                  <h2 className="text-[18px]">Rooms available by neighbourhood</h2>
                  <div className="mt-4 space-y-3">
                    {stats.areas.slice(0, 10).map((area) => <MetricBar key={area.name} label={area.name} value={area.rooms} total={maxRooms} />)}
                  </div>
                </section>
              )}
              {stats.support.length > 0 && (
                <section className="card p-5 sm:p-6">
                  <h2 className="text-[18px]">Support needs: referrals vs rooms</h2>
                  <p className="mt-1 text-[13px] text-ink-soft">Where referrals outnumber rooms, more supply is needed.</p>
                  <div className="mt-4 space-y-4">
                    {stats.support.slice(0, 8).map((s) => (
                      <div key={s.label} className="space-y-1.5">
                        <MetricBar label={`${s.label}: referrals`} value={s.referrals} total={maxDemand} tone="bg-clay" />
                        <MetricBar label="Rooms available" value={s.rooms} total={maxDemand} />
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>

            {league.length > 0 && (
              <section className="card mt-6 p-5 sm:p-6">
                <h2 className="text-[18px]">Fastest-replying providers in {city}</h2>
                <ol className="mt-3 space-y-1.5 text-[15px]">
                  {league.map((entry) => (
                    <li key={entry.companyId}>{entry.rank}. <Link href={`/companies/${entry.company.slug}`} className="font-semibold hover:text-pine-dark">{entry.company.name}</Link> <span className="text-ink-soft">· typically {formatReplyTime(entry.minutes)}</span></li>
                  ))}
                </ol>
                <Link href={`/fastest-providers?city=${encodeURIComponent(city!)}`} className="mt-3 inline-block text-[14px] font-semibold text-pine-dark underline">See the full league</Link>
              </section>
            )}
          </>
        )}

        <section className="mt-10 rounded-card bg-[#17202e] p-6 text-white sm:p-8">
          <h2 className="text-[22px] text-white">Work for a council or commissioner?</h2>
          <p className="mt-2 max-w-[64ch] text-[15px] leading-relaxed text-[#c6d3e1]">
            Get the full council view for your area: placement outcomes, 4 and 12-week check-ins, placements at risk and a printable report for your supported housing strategy.
          </p>
          <Link href="/for-councils#pilot" className="mt-4 inline-flex rounded-[10px] bg-[#ffd56b] px-5 py-3 font-bold text-[#17202e] hover:brightness-95">Request a council pilot</Link>
        </section>
      </div>
    </>
  );
}
