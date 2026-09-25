import "server-only";
import { db } from "@/lib/db";
import { EMPTY_ROOM_STATUSES, voidCost } from "@/lib/void-cost";

/** Lost rent on every empty room a provider has. */
export async function companyVoidCost(companyId: string) {
  const rooms = await db.room.findMany({
    where: { property: { companyId }, status: { in: [...EMPTY_ROOM_STATUSES] } },
    select: {
      id: true,
      name: true,
      status: true,
      weeklyRent: true,
      monthlyRent: true,
      vacantSince: true,
      updatedAt: true,
      listing: { select: { id: true, title: true, weeklyRentFrom: true, weeklyRentTo: true } },
    },
  });
  return voidCost(rooms);
}
