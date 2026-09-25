"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireReferrer } from "@/lib/rbac";
import { teamMemberIds } from "@/lib/referral-team";

const SHORTLIST_MAX = 5;

async function ownClient(clientId: string) {
  const user = await requireReferrer();
  const teamIds = await teamMemberIds(user.id);
  const client = await db.client.findFirst({ where: { id: clientId, referrerId: { in: teamIds }, deletedAt: null }, select: { id: true } });
  return { user, client };
}

/** Adds a room to a client's shortlist, or takes it off. */
export async function toggleShortlistAction(clientId: string, listingId: string): Promise<{ ok: boolean; shortlisted?: boolean; count?: number; message?: string }> {
  const { user, client } = await ownClient(String(clientId));
  if (!client) return { ok: false, message: "That client isn't in your caseload." };

  const existing = await db.shortlistItem.findUnique({ where: { clientId_listingId: { clientId: client.id, listingId: String(listingId) } } });
  if (existing) {
    await db.shortlistItem.delete({ where: { id: existing.id } });
  } else {
    const count = await db.shortlistItem.count({ where: { clientId: client.id } });
    if (count >= SHORTLIST_MAX) return { ok: false, count, message: `A shortlist holds up to ${SHORTLIST_MAX} rooms. Take one off first.` };
    const listing = await db.listing.findFirst({ where: { id: String(listingId), status: "ACTIVE" }, select: { id: true } });
    if (!listing) return { ok: false, message: "That advert isn't live any more." };
    await db.shortlistItem.create({ data: { clientId: client.id, listingId: listing.id, addedById: user.id } });
  }
  const count = await db.shortlistItem.count({ where: { clientId: client.id } });
  revalidatePath(`/referrals/clients/${client.id}`);
  revalidatePath(`/referrals/clients/${client.id}/shortlist`);
  return { ok: true, shortlisted: !existing, count };
}

/** A short private note on a shortlisted room, printed in the referral pack. */
export async function saveShortlistNoteAction(clientId: string, listingId: string, note: string): Promise<{ ok: boolean }> {
  const { client } = await ownClient(String(clientId));
  if (!client) return { ok: false };
  await db.shortlistItem.updateMany({
    where: { clientId: client.id, listingId: String(listingId) },
    data: { note: String(note ?? "").trim().slice(0, 500) || null },
  });
  revalidatePath(`/referrals/clients/${client.id}/shortlist`);
  return { ok: true };
}
