import "server-only";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { notifyCompany } from "@/lib/notify";
import { referrerPlanLimits } from "@/lib/billing";
import { clientCardFrom } from "@/lib/client-card";
import type { CurrentUser } from "@/lib/session";
import { inTeam } from "@/lib/referral-team";

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

const CLIENT_SHAREABLE = {
  id: true,
  referrerId: true,
  firstName: true,
  lastName: true,
  dateOfBirth: true,
  preferredLocation: true,
  supportTypes: true,
  accommodationNeeds: true,
  supportNeeds: true,
  photoUrl: true,
  deletedAt: true,
} as const;

/** Loads a client the referrer owns and hasn't deleted — the only kind they can share. */
/** A live client in this referrer's team caseload (their own or a colleague's). */
export async function ownedLiveClient(userId: string, clientId: string) {
  const client = await db.client.findUnique({ where: { id: clientId }, select: CLIENT_SHAREABLE });
  if (!client || client.deletedAt || !(await inTeam(userId, client.referrerId))) return null;
  return client;
}

/**
 * Gives one provider organisation read access to a client record, enforcing
 * the referrer's plan limit on concurrent shares. Re-sharing a revoked share
 * reactivates the same row. `quiet` skips the "shared a profile" notification
 * for callers that send their own (a message already notifies the provider).
 */
export async function shareClientWithCompany(params: {
  user: CurrentUser;
  clientId: string;
  companyId: string;
  note?: string | null;
  quiet?: boolean;
}): Promise<Result<{ companyName: string; alreadyShared: boolean }>> {
  const { user, clientId, companyId } = params;
  const client = await ownedLiveClient(user.id, clientId);
  if (!client) return { ok: false, error: "Client not found." };

  const company = await db.company.findUnique({ where: { id: companyId }, select: { id: true, name: true, status: true } });
  if (!company || company.status !== "ACTIVE") return { ok: false, error: "That provider could not be found." };

  const existing = await db.clientShare.findUnique({ where: { clientId_companyId: { clientId, companyId } } });
  const alreadyShared = Boolean(existing && !existing.revokedAt);

  if (!alreadyShared) {
    const limits = await referrerPlanLimits(user.id);
    if (limits.membership.maxSharesPerClient !== -1) {
      const activeShares = await db.clientShare.count({ where: { clientId, revokedAt: null } });
      if (activeShares >= limits.membership.maxSharesPerClient) {
        const max = limits.membership.maxSharesPerClient;
        return {
          ok: false,
          error: `Your ${limits.membership.name} plan shares a profile with up to ${max} provider${max === 1 ? "" : "s"} at once. Revoke one first, or upgrade.`,
        };
      }
    }
  }

  await db.clientShare.upsert({
    where: { clientId_companyId: { clientId, companyId } },
    create: { clientId, companyId, sharedById: user.id, note: params.note || null },
    update: {
      revokedAt: null,
      sharedById: user.id,
      ...(existing?.revokedAt ? { reviewStatus: null, reviewNote: null, reviewedAt: null } : {}),
      ...(params.note !== undefined ? { note: params.note || null } : {}),
    },
  });

  if (!alreadyShared) {
    if (!params.quiet) {
      await notifyCompany(companyId, {
        type: "REFERRAL",
        title: "A referrer shared a client profile with you",
        body: `${user.firstName} ${user.lastName} shared ${client.firstName} ${client.lastName}'s profile.`,
        href: `/provider/clients/${clientId}`,
        email: true,
      });
    }
    await audit({ actorId: user.id, action: "client.shared", targetType: "Client", targetId: clientId, metadata: { companyId } });
  }

  return { ok: true, value: { companyName: company.name, alreadyShared } };
}

/** The provider organisation on the other side of a conversation, if there is one. */
export async function conversationCompanyId(conversationId: string, viewerId: string) {
  const conversation = await db.conversation.findUnique({
    where: { id: conversationId },
    select: { companyId: true, participants: { where: { userId: { not: viewerId } }, select: { companyId: true } } },
  });
  if (!conversation) return null;
  return conversation.companyId ?? conversation.participants.find((p) => p.companyId)?.companyId ?? null;
}

/**
 * Snapshot + link for dropping a client into a message. When the thread is
 * with a provider, the profile is shared with them too, so the card opens
 * the full record on their side rather than a dead link.
 */
export async function clientAttachment(params: { user: CurrentUser; clientId: string; companyId: string | null }): Promise<
  Result<{ clientId: string; clientCard: ReturnType<typeof clientCardFrom>; name: string }>
> {
  const client = await ownedLiveClient(params.user.id, params.clientId);
  if (!client) return { ok: false, error: "That client could not be found." };
  if (params.companyId) {
    const shared = await shareClientWithCompany({ user: params.user, clientId: client.id, companyId: params.companyId, quiet: true });
    if (!shared.ok) return shared;
  }
  return {
    ok: true,
    value: { clientId: client.id, clientCard: clientCardFrom(client), name: `${client.firstName} ${client.lastName}` },
  };
}

/**
 * Opens (or reuses) the direct thread between a referrer and a provider and
 * posts a message into it — optionally carrying a client card. Used for
 * "contact this provider on my client's behalf".
 */
export async function messageCompanyAsReferrer(params: {
  user: CurrentUser;
  companyId: string;
  subject: string;
  body: string;
  clientId?: string | null;
  clientCard?: object | null;
}) {
  const { user, companyId } = params;
  const company = await db.company.findUnique({ where: { id: companyId }, select: { staff: { select: { userId: true } } } });
  const recipientIds = (company?.staff ?? []).map((s) => s.userId).filter((id) => id !== user.id);
  if (recipientIds.length === 0) return { ok: false as const, error: "That provider has no one to receive messages yet." };

  const blocked = await db.block.findFirst({ where: { blockerId: { in: recipientIds }, blockedId: user.id } });
  if (blocked) return { ok: false as const, error: "You can't message this provider." };

  const existing = await db.conversation.findFirst({
    where: { listingId: null, lookingForAdId: null, companyId, participants: { some: { userId: user.id } } },
    select: { id: true },
  });

  const conversation =
    existing ??
    (await db.conversation.create({
      data: {
        subject: params.subject || null,
        companyId,
        participants: {
          create: [{ userId: user.id, companyId: null }, ...recipientIds.map((id) => ({ userId: id, companyId }))],
        },
      },
      select: { id: true },
    }));

  await db.message.create({
    data: {
      conversationId: conversation.id,
      senderId: user.id,
      body: params.body,
      clientId: params.clientId ?? null,
      clientCard: params.clientCard ?? undefined,
    },
  });
  await db.conversation.update({ where: { id: conversation.id }, data: { lastMessageAt: new Date() } });
  // Un-archive for everyone so a new client offer never lands in a hidden thread.
  await db.conversationParticipant.updateMany({ where: { conversationId: conversation.id }, data: { archived: false } });

  await notifyCompany(companyId, {
    type: "MESSAGE",
    title: params.subject || "New message",
    body: `${user.firstName} ${user.lastName} sent you a message${params.subject ? ` about ${params.subject}` : ""}.`,
    href: `/messages/${conversation.id}`,
    email: true,
  });
  await audit({ actorId: user.id, action: "conversation.message_on_behalf", targetType: "Conversation", targetId: conversation.id });

  return { ok: true as const, conversationId: conversation.id };
}

/**
 * Providers worth offering a client to: organisations with live adverts in
 * the client's preferred area and/or offering the support they need, ranked
 * by how many of their adverts fit. Excludes providers the profile is already
 * shared with. Returns nothing when there's too little to match on.
 */
export async function suggestProvidersForClient(client: {
  id: string;
  preferredLocation: string | null;
  supportTypes: string[];
}) {
  const place = client.preferredLocation?.split(/[,;]/)[0]?.trim() ?? "";
  if (!place && client.supportTypes.length === 0) return [];

  const listings = await db.listing.findMany({
    where: {
      status: "ACTIVE",
      company: { status: "ACTIVE", clientShares: { none: { clientId: client.id, revokedAt: null } } },
      ...(place
        ? {
            OR: [
              { property: { city: { contains: place, mode: "insensitive" } } },
              { property: { area: { contains: place, mode: "insensitive" } } },
              { property: { postcode: { startsWith: place.toUpperCase().replace(/\s+/g, "").slice(0, 4) } } },
              { company: { operatingAreas: { has: place } } },
            ],
          }
        : {}),
      ...(client.supportTypes.length > 0 ? { supportTypes: { hasSome: client.supportTypes } } : {}),
    },
    select: {
      supportTypes: true,
      property: { select: { city: true, area: true } },
      company: { select: { id: true, name: true, city: true, verification: true } },
    },
    take: 200,
  });

  const byCompany = new Map<
    string,
    { id: string; name: string; city: string | null; verification: string; matchingAdverts: number; places: Set<string>; supportHits: number }
  >();
  for (const listing of listings) {
    const entry =
      byCompany.get(listing.company.id) ??
      { ...listing.company, verification: String(listing.company.verification), matchingAdverts: 0, places: new Set<string>(), supportHits: 0 };
    entry.matchingAdverts += 1;
    entry.places.add(listing.property.area || listing.property.city);
    entry.supportHits = Math.max(entry.supportHits, listing.supportTypes.filter((t) => client.supportTypes.includes(t)).length);
    byCompany.set(listing.company.id, entry);
  }

  return Array.from(byCompany.values())
    .sort(
      (a, b) =>
        Number(b.verification === "APPROVED") - Number(a.verification === "APPROVED") ||
        b.supportHits - a.supportHits ||
        b.matchingAdverts - a.matchingAdverts,
    )
    .slice(0, 5)
    .map((c) => ({
      id: c.id,
      name: c.name,
      city: c.city,
      verification: c.verification,
      matchingAdverts: c.matchingAdverts,
      reason: `${c.matchingAdverts} live advert${c.matchingAdverts === 1 ? "" : "s"}${
        c.places.size ? ` in ${Array.from(c.places).slice(0, 2).join(", ")}` : ""
      }${c.supportHits ? ` · supports ${c.supportHits} of their needs` : ""}`,
    }));
}
