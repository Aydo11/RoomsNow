import "server-only";
import { db } from "@/lib/db";
import { matchesForClient, type ClientMatchRow } from "@/server/client-matches";
import { teamMemberIds } from "@/lib/referral-team";

export type ShortlistRow = ClientMatchRow & { note: string | null };

/**
 * A client's shortlist with each room scored against the client, in the order
 * the rooms were added. Rooms whose advert has gone offline are listed in
 * `gone` so the referrer knows why they dropped out.
 */
export async function loadShortlist(clientId: string, userId: string) {
  const teamIds = await teamMemberIds(userId);
  const client = await db.client.findFirst({
    where: { id: clientId, referrerId: { in: teamIds } },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      dateOfBirth: true,
      preferredLocation: true,
      supportTypes: true,
      assessment: true,
      deletedAt: true,
      shortlist: {
        orderBy: { createdAt: "asc" },
        select: { listingId: true, note: true, listing: { select: { title: true, status: true } } },
      },
    },
  });
  if (!client) return null;

  const ids = client.shortlist.map((item) => item.listingId);
  const { rows } = ids.length ? await matchesForClient(client, { onlyIds: ids }) : { rows: [] as ClientMatchRow[] };
  const byId = new Map(rows.map((row) => [row.listing.id, row]));
  const items: ShortlistRow[] = client.shortlist.flatMap((item) => {
    const row = byId.get(item.listingId);
    return row ? [{ ...row, note: item.note }] : [];
  });
  const gone = client.shortlist.filter((item) => !byId.has(item.listingId)).map((item) => ({ listingId: item.listingId, title: item.listing.title }));
  return { client, items, gone };
}
