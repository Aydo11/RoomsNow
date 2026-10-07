import Link from "next/link";
import { ResilientImage } from "./resilient-image";
import { coverImage } from "@/lib/cover-image";
import { demoListingImage } from "@/lib/demo-listings";
import { rentRange } from "@/lib/format";

export type MarqueeRoom = {
  id: string;
  title: string;
  weeklyRentFrom: number | null;
  weeklyRentTo: number | null;
  property: { city: string; area: string | null };
  media: Array<{ type: string; url: string }>;
  rooms: Array<{ status: string }>;
};

/**
 * "Just listed": a slow, endless strip of real room photos on the homepage.
 * The track is rendered twice and slid by -50% so it loops without a seam; the
 * copy is hidden from screen readers and the keyboard. It pauses on hover or
 * focus, and becomes a plain swipeable row for anyone who prefers less motion.
 */
export function RoomMarquee({ rooms }: { rooms: MarqueeRoom[] }) {
  const withPhotos = rooms.filter((room) => {
    const cover = coverImage(room.media);
    return cover && !cover.isVideoFile;
  });
  if (withPhotos.length < 4) return null;

  const track = (copy: boolean) => (
    <ul className="room-marquee-track" aria-hidden={copy || undefined}>
      {withPhotos.map((room) => {
        const cover = coverImage(room.media)!;
        const free = room.rooms.filter((r) => r.status === "AVAILABLE").length;
        const place = room.property.area ? `${room.property.area}, ${room.property.city}` : room.property.city;
        return (
          <li key={room.id} className="room-marquee-item">
            <Link href={`/listings/${room.id}`} tabIndex={copy ? -1 : undefined} className="room-marquee-card group">
              <span className="relative block h-40 overflow-hidden bg-paper-sunk">
                <ResilientImage
                  src={cover.url}
                  fallbackSrc={demoListingImage(room.id).url}
                  alt={copy ? "" : `${room.title} photo`}
                  sizes="280px"
                  className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.05]"
                />
                {free > 0 && (
                  <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1.5 rounded-pill bg-black/65 px-2.5 py-1 text-[11px] font-semibold text-white">
                    <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#f5b544]" />
                    {free} room{free === 1 ? "" : "s"} free
                  </span>
                )}
              </span>
              <span className="block p-3.5">
                <span className="block truncate text-[15px] font-semibold text-ink group-hover:text-pine-dark">{room.title}</span>
                <span className="mt-0.5 block truncate text-[13px] text-ink-soft">{place}</span>
                <span className="mt-1.5 block text-[13px] font-semibold text-pine-dark">{rentRange(room.weeklyRentFrom, room.weeklyRentTo)}</span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );

  return (
    <section className="room-marquee-section border-b border-line" aria-labelledby="just-listed">
      <div className="shell flex flex-wrap items-end justify-between gap-3 pt-10 sm:pt-12">
        <div>
          <span className="inline-flex items-center gap-2 text-[12px] font-semibold tracking-[0.08em] text-pine-dark">
            <span aria-hidden="true" className="live-dot" />JUST LISTED
          </span>
          <h2 id="just-listed" className="mt-2 text-[28px]">Real rooms, newest first</h2>
        </div>
        <Link href="/search?sort=newest" className="text-[14px] font-semibold text-pine-dark hover:underline">
          See the newest rooms <span aria-hidden="true" className="nudge-arrow">→</span>
        </Link>
      </div>
      <div className="room-marquee" style={{ ["--marquee-duration" as string]: `${Math.max(40, withPhotos.length * 6)}s` }}>
        <div className="room-marquee-rail">
          {track(false)}
          {track(true)}
        </div>
      </div>
    </section>
  );
}
