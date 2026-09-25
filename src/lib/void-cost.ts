/**
 * Void cost: what empty rooms are costing a provider in lost rent. Pure (no
 * database) so it can be tested. Amounts are in pence, like the rest of the app.
 */

export const EMPTY_ROOM_STATUSES = ["AVAILABLE", "VOID"] as const;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export type VoidRoomInput = {
  id: string;
  name: string;
  status: string;
  weeklyRent: number | null;
  monthlyRent: number | null;
  vacantSince: Date | null;
  updatedAt: Date;
  listing: { id: string; title: string; weeklyRentFrom: number | null; weeklyRentTo: number | null } | null;
};

export type VoidRoom = {
  id: string;
  name: string;
  listingId: string | null;
  listingTitle: string | null;
  weeklyRent: number | null;
  since: Date;
  weeksEmpty: number;
  lostSoFar: number;
};

export type VoidCost = {
  emptyRooms: number;
  /** Rent lost per week across all empty rooms with a known rent. */
  weeklyCost: number;
  /** Rent lost since each room became empty. */
  lostSoFar: number;
  /** Empty rooms whose rent isn't set, so they can't be costed. */
  unpriced: number;
  /** Longest empty first. */
  rooms: VoidRoom[];
};

/** Weekly rent for a room: its own weekly rent, its monthly rent, or its advert's lowest rent. */
export function weeklyRentFor(room: Pick<VoidRoomInput, "weeklyRent" | "monthlyRent" | "listing">): number | null {
  if (room.weeklyRent) return room.weeklyRent;
  if (room.monthlyRent) return Math.round((room.monthlyRent * 12) / 52);
  return room.listing?.weeklyRentFrom ?? room.listing?.weeklyRentTo ?? null;
}

export function isEmptyRoom(status: string) {
  return (EMPTY_ROOM_STATUSES as readonly string[]).includes(status);
}

export function voidCost(rooms: VoidRoomInput[], now = new Date()): VoidCost {
  const empty = rooms
    .filter((room) => isEmptyRoom(room.status))
    .map((room): VoidRoom => {
      const since = room.vacantSince ?? room.updatedAt;
      const weeksEmpty = Math.max(0, (now.getTime() - since.getTime()) / WEEK_MS);
      const weeklyRent = weeklyRentFor(room);
      return {
        id: room.id,
        name: room.name,
        listingId: room.listing?.id ?? null,
        listingTitle: room.listing?.title ?? null,
        weeklyRent,
        since,
        weeksEmpty,
        lostSoFar: weeklyRent ? Math.round(weeklyRent * weeksEmpty) : 0,
      };
    })
    .sort((a, b) => a.since.getTime() - b.since.getTime());

  return {
    emptyRooms: empty.length,
    weeklyCost: empty.reduce((sum, room) => sum + (room.weeklyRent ?? 0), 0),
    lostSoFar: empty.reduce((sum, room) => sum + room.lostSoFar, 0),
    unpriced: empty.filter((room) => !room.weeklyRent).length,
    rooms: empty,
  };
}

/** "3 days", "2 weeks", "5 months". */
export function emptyFor(weeks: number): string {
  const days = Math.floor(weeks * 7);
  if (days < 1) return "under a day";
  if (days < 14) return `${days} day${days === 1 ? "" : "s"}`;
  if (weeks < 9) return `${Math.floor(weeks)} weeks`;
  const months = Math.floor(weeks / 4.345);
  return `${months} month${months === 1 ? "" : "s"}`;
}

/** Whole pounds with thousands separators: £1,240. */
export function pounds(pence: number): string {
  return `£${Math.round(pence / 100).toLocaleString("en-GB")}`;
}
