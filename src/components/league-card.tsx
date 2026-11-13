import Link from "next/link";
import { formatReplyTime, LEAGUE_DAYS } from "@/lib/response-league";
import { responseLeague } from "@/server/response-league";

/** Provider dashboard: where they sit in the fastest-replying league, with a share link. */
export async function LeagueCard({ companyId }: { companyId: string }) {
  const league = await responseLeague(null, 500).catch(() => []);
  const me = league.find((entry) => entry.companyId === companyId);
  const url = "https://www.roomsnow.co.uk/fastest-providers";
  return (
    <section className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-card border border-[#e0a83a]/50 bg-caution-surface p-5 text-ink">
      <div className="min-w-0">
        <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-caution">⚡ Fastest-replying providers</p>
        {me ? (
          <p className="mt-1 text-[16px]">
            You're <strong>#{me.rank}</strong> on RoomsNow over the last {LEAGUE_DAYS} days, with a typical reply of <strong>{formatReplyTime(me.minutes)}</strong>. Share it with referrers.
          </p>
        ) : (
          <p className="mt-1 text-[16px]">Reply to new enquiries quickly to join the public league and earn the Top responder badge on your adverts.</p>
        )}
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        {me && (
          <a href={`https://wa.me/?text=${encodeURIComponent(`We're #${me.rank} of the fastest-replying accommodation providers on RoomsNow: ${url}`)}`} target="_blank" rel="noopener" className="btn-secondary">Share</a>
        )}
        <Link href="/fastest-providers" className="btn-primary">See the league</Link>
      </div>
    </section>
  );
}
