import Link from "next/link";
import { emptyFor, pounds, type VoidCost } from "@/lib/void-cost";
import { clsx } from "@/lib/clsx";

/**
 * "Empty rooms are costing you £X a week": lost rent on every AVAILABLE or
 * VOID room, longest empty first, with the quickest fixes next to each one.
 */
export function VoidCostPanel({ cost, limit = 5, className }: { cost: VoidCost; limit?: number; className?: string }) {
  if (cost.emptyRooms === 0) {
    return (
      <section className={clsx("card flex flex-wrap items-center gap-3 p-5", className)}>
        <span className="grid h-9 w-9 place-items-center rounded-full bg-pine-light text-pine-dark" aria-hidden="true">
          ✓
        </span>
        <p className="text-[15px] text-ink-soft">
          <strong className="text-ink">Every room is filled.</strong> No rent is being lost to empty rooms right now.
        </p>
      </section>
    );
  }

  const shown = cost.rooms.slice(0, limit);
  return (
    <section className={clsx("card overflow-hidden", className)} aria-labelledby="void-cost-heading">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line bg-clay/5 px-5 py-4">
        <div>
          <p id="void-cost-heading" className="text-[13px] font-semibold uppercase tracking-[0.06em] text-clay">
            Empty rooms are costing you
          </p>
          <p className="mt-1 font-display text-[34px] leading-none text-ink tabular-nums">
            {pounds(cost.weeklyCost)}
            <span className="ml-1 text-[16px] font-normal text-ink-soft">a week</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-[22px] font-semibold tabular-nums text-ink">{pounds(cost.lostSoFar)}</p>
          <p className="text-[12.5px] text-ink-faint">
            lost so far across {cost.emptyRooms} empty room{cost.emptyRooms === 1 ? "" : "s"}
          </p>
        </div>
      </div>
      <ul className="divide-y divide-line">
        {shown.map((room) => (
          <li key={room.id} className="grid gap-2 px-5 py-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center sm:gap-5">
            <div className="min-w-0">
              <p className="truncate text-[14.5px] font-medium text-ink">
                {room.name}
                {room.listingTitle ? <span className="font-normal text-ink-soft"> · {room.listingTitle}</span> : null}
              </p>
              <p className="text-[12.5px] text-ink-faint">
                Empty {emptyFor(room.weeksEmpty)}
                {room.weeklyRent ? ` · ${pounds(room.weeklyRent)} a week` : " · rent not set"}
              </p>
            </div>
            <p className={clsx("text-[14px] font-semibold tabular-nums", room.weeksEmpty >= 4 ? "text-clay" : "text-ink")}>
              {room.weeklyRent ? `${pounds(room.lostSoFar)} lost` : "—"}
            </p>
            {room.listingId && (
              <div className="flex gap-2">
                <Link href={`/provider/adverts/${room.listingId}/edit`} className="btn-ghost px-2.5 py-1 text-[13px]">
                  Improve advert
                </Link>
                <Link href={`/provider/adverts/${room.listingId}#boost`} className="btn-ghost px-2.5 py-1 text-[13px]">
                  Promote
                </Link>
              </div>
            )}
          </li>
        ))}
      </ul>
      <p className="border-t border-line px-5 py-3 text-[12.5px] leading-relaxed text-ink-faint">
        Counts rooms marked Available or Void, at each room&apos;s weekly rent (or the advert&apos;s lowest rent).
        {cost.unpriced > 0 && ` ${cost.unpriced} room${cost.unpriced === 1 ? " has" : "s have"} no rent set, so ${cost.unpriced === 1 ? "isn't" : "aren't"} counted.`}{" "}
        Replying to requests quickly and keeping photos and availability up to date are the fastest ways to fill a room.
      </p>
    </section>
  );
}
