"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import {
  assertConversationAccess,
  assertListingAccess,
  assertRequestAccess,
  canActForCompany,
  requireUser,
} from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { notify, notifyCompany } from "@/lib/notify";
import { fieldErrors, messageSchema, reportSchema, requestSchema, type FormState } from "@/lib/validation";
import { date, text } from "../form";
import type { RequestStatus } from "@prisma/client";

// ------------------------------------------------------------------ saving

export async function toggleSaveAction(listingId: string) {
  const user = await requireUser(`/listings/${listingId}`);
  const existing = await db.savedListing.findUnique({
    where: { userId_listingId: { userId: user.id, listingId } },
  });

  if (existing) {
    await db.savedListing.delete({ where: { id: existing.id } });
  } else {
    await db.savedListing.create({ data: { userId: user.id, listingId } });
  }

  revalidatePath(`/listings/${listingId}`);
  revalidatePath("/dashboard/saved");
  return { saved: !existing };
}

// ------------------------------------------------------------------ messaging

/** Opens (or reuses) a conversation between a person and a company. */
export async function startConversationAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const throttle = await rateLimit(`message:${user.id}`, LIMITS.message);
  if (!throttle.ok) return { ok: false, errors: { body: "You're sending messages very quickly. Give it a minute." } };
  const listingId = text(formData, "listingId") || null;
  const lookingForAdId = text(formData, "lookingForAdId") || null;
  const body = text(formData, "body").trim();
  if (!body) return { ok: false, errors: { body: "Write a message to send." } };

  let companyId: string | null = null;
  let recipientIds: string[] = [];
  let subject = "";

  if (listingId) {
    const listing = await db.listing.findUnique({
      where: { id: listingId },
      include: { company: { include: { staff: { select: { userId: true } } } } },
    });
    if (!listing) return { ok: false, errors: { form: "Advert not found." } };
    await assertListingAccess(user, listingId);
    companyId = listing.companyId;
    recipientIds = listing.company.staff.map((s) => s.userId);
    subject = listing.title;
  } else if (lookingForAdId) {
    // Provider or referrer contacting someone who has made themselves discoverable.
    const ad = await db.lookingForAd.findUnique({
      where: { id: lookingForAdId },
      include: { user: { select: { id: true } } },
    });
    if (!ad || ad.status !== "ACTIVE") return { ok: false, errors: { form: "Advert not found." } };
    recipientIds = [ad.userId];
    companyId = user.staffOf[0]?.companyId ?? null;
    subject = ad.title;
  } else {
    return { ok: false, errors: { form: "Nothing to reply to." } };
  }

  const blocked = await db.block.findFirst({
    where: { blockerId: { in: recipientIds }, blockedId: user.id },
  });
  if (blocked) return { ok: false, errors: { form: "You can't message this account." } };

  const existing = await db.conversation.findFirst({
    where: {
      listingId: listingId ?? undefined,
      lookingForAdId: lookingForAdId ?? undefined,
      participants: { some: { userId: user.id } },
    },
  });

  const conversation =
    existing ??
    (await db.conversation.create({
      data: {
        subject,
        listingId,
        lookingForAdId,
        companyId,
        participants: {
          create: [
            { userId: user.id, companyId: listingId ? null : companyId },
            ...recipientIds
              .filter((id) => id !== user.id)
              .map((id) => ({ userId: id, companyId: listingId ? companyId : null })),
          ],
        },
      },
    }));

  await db.message.create({ data: { conversationId: conversation.id, senderId: user.id, body } });
  await db.conversation.update({ where: { id: conversation.id }, data: { lastMessageAt: new Date() } });

  if (listingId) {
    await db.listing.update({ where: { id: listingId }, data: { enquiries: { increment: 1 } } });
    if (companyId) {
      await notifyCompany(companyId, {
        type: "MESSAGE",
        title: "New enquiry",
        body: `${user.firstName} messaged you about ${subject}.`,
        href: `/messages/${conversation.id}`,
        email: true,
      });
    }
  } else {
    await Promise.all(
      recipientIds.map((id) =>
        notify({
          userId: id,
          type: "MESSAGE",
          title: "A provider has messaged you",
          body: `About your advert: ${subject}`,
          href: `/messages/${conversation.id}`,
          email: true,
        }),
      ),
    );
  }

  await audit({ actorId: user.id, action: "conversation.started", targetType: "Conversation", targetId: conversation.id });
  redirect(`/messages/${conversation.id}`);
}

/**
 * A direct message to a provider (by companyId) or to a specific person (by
 * recipientUserId) that isn't tied to a public advert — used when a referrer
 * wants to contact a provider about a client they're offering, or a provider
 * wants to reply to a referrer about a shared client or referral. Reuses an
 * existing thread with the same participants rather than opening a new one
 * every time.
 */
export async function startDirectMessageAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const throttle = await rateLimit(`message:${user.id}`, LIMITS.message);
  if (!throttle.ok) return { ok: false, errors: { body: "You're sending messages very quickly. Give it a minute." } };

  const companyId = text(formData, "companyId") || null;
  const recipientUserId = text(formData, "recipientUserId") || null;
  const subject = text(formData, "subject") || "";
  const body = text(formData, "body").trim();
  if (!body) return { ok: false, errors: { body: "Write a message to send." } };
  if (!companyId && !recipientUserId) return { ok: false, errors: { form: "Nothing to message." } };

  let recipientIds: string[] = [];
  if (companyId) {
    const company = await db.company.findUnique({
      where: { id: companyId },
      select: { status: true, staff: { select: { userId: true } } },
    });
    if (!company || company.status !== "ACTIVE") return { ok: false, errors: { form: "That provider could not be found." } };
    recipientIds = company.staff.map((s) => s.userId);
  } else if (recipientUserId) {
    const recipient = await db.user.findUnique({ where: { id: recipientUserId }, select: { id: true } });
    if (!recipient) return { ok: false, errors: { form: "That person could not be found." } };
    recipientIds = [recipient.id];
  }
  recipientIds = recipientIds.filter((id) => id !== user.id);
  if (recipientIds.length === 0) return { ok: false, errors: { form: "Nothing to message." } };

  const blocked = await db.block.findFirst({
    where: { blockerId: { in: recipientIds }, blockedId: user.id },
  });
  if (blocked) return { ok: false, errors: { form: "You can't message this account." } };

  const existing = await db.conversation.findFirst({
    where: {
      listingId: null,
      lookingForAdId: null,
      companyId: companyId ?? null,
      participants: { some: { userId: user.id } },
      AND: recipientUserId ? [{ participants: { some: { userId: recipientUserId } } }] : undefined,
    },
  });

  const conversation =
    existing ??
    (await db.conversation.create({
      data: {
        subject: subject || null,
        companyId,
        participants: {
          create: [
            { userId: user.id, companyId: companyId ? null : (user.staffOf[0]?.companyId ?? null) },
            ...recipientIds.map((id) => ({ userId: id, companyId: companyId ?? null })),
          ],
        },
      },
    }));

  await db.message.create({ data: { conversationId: conversation.id, senderId: user.id, body } });
  await db.conversation.update({ where: { id: conversation.id }, data: { lastMessageAt: new Date() } });

  if (companyId) {
    await notifyCompany(companyId, {
      type: "MESSAGE",
      title: subject || "New message",
      body: `${user.firstName} ${user.lastName} sent you a message${subject ? ` about ${subject}` : ""}.`,
      href: `/messages/${conversation.id}`,
      email: true,
    });
  } else {
    await Promise.all(
      recipientIds.map((id) =>
        notify({
          userId: id,
          type: "MESSAGE",
          title: `New message from ${user.firstName}`,
          body: body.slice(0, 140),
          href: `/messages/${conversation.id}`,
          email: true,
        }),
      ),
    );
  }

  await audit({ actorId: user.id, action: "conversation.started", targetType: "Conversation", targetId: conversation.id });
  redirect(`/messages/${conversation.id}`);
}

export async function sendMessageAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const throttle = await rateLimit(`message:${user.id}`, LIMITS.message);
  if (!throttle.ok) return { ok: false, errors: { body: "You're sending messages very quickly. Give it a minute." } };
  const parsed = messageSchema.safeParse({
    conversationId: text(formData, "conversationId"),
    body: text(formData, "body"),
  });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };

  await assertConversationAccess(user.id, parsed.data.conversationId);

  const others = await db.conversationParticipant.findMany({
    where: { conversationId: parsed.data.conversationId, userId: { not: user.id } },
    select: { userId: true },
  });
  // A block placed after a conversation already exists must still stop new
  // messages both ways — this only ran on the very first message before.
  const blocked = await db.block.findFirst({
    where: {
      OR: [
        { blockerId: user.id, blockedId: { in: others.map((o) => o.userId) } },
        { blockedId: user.id, blockerId: { in: others.map((o) => o.userId) } },
      ],
    },
  });
  if (blocked) return { ok: false, errors: { form: "You can't message this account." } };

  await db.message.create({
    data: { conversationId: parsed.data.conversationId, senderId: user.id, body: parsed.data.body },
  });
  await db.conversation.update({
    where: { id: parsed.data.conversationId },
    data: { lastMessageAt: new Date() },
  });

  await Promise.all(
    others.map((p) =>
      notify({
        userId: p.userId,
        type: "MESSAGE",
        title: `New message from ${user.firstName}`,
        body: parsed.data.body.slice(0, 140),
        href: `/messages/${parsed.data.conversationId}`,
      }),
    ),
  );

  revalidatePath(`/messages/${parsed.data.conversationId}`);
  return { ok: true };
}

export async function markConversationReadAction(conversationId: string) {
  const user = await requireUser();
  await assertConversationAccess(user.id, conversationId);
  await db.conversationParticipant.update({
    where: { conversationId_userId: { conversationId, userId: user.id } },
    data: { lastReadAt: new Date() },
  });
}

export async function blockUserAction(blockedId: string, reason?: string) {
  const user = await requireUser();
  if (blockedId === user.id) return;
  await db.block.upsert({
    where: { blockerId_blockedId: { blockerId: user.id, blockedId } },
    create: { blockerId: user.id, blockedId, reason },
    update: { reason },
  });
  await audit({ actorId: user.id, action: "user.blocked", targetType: "User", targetId: blockedId });
  revalidatePath("/messages");
}

export async function unblockUserAction(blockedId: string) {
  const user = await requireUser();
  await db.block.deleteMany({ where: { blockerId: user.id, blockedId } });
  await audit({ actorId: user.id, action: "user.unblocked", targetType: "User", targetId: blockedId });
  revalidatePath("/messages");
}

// ------------------------------------------------------------------ requests

export async function createRequestAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const throttle = await rateLimit(`request:${user.id}`, LIMITS.request);
  if (!throttle.ok) return { ok: false, errors: { form: "You've sent a lot of requests recently. Try again later." } };
  const parsed = requestSchema.safeParse({
    listingId: text(formData, "listingId"),
    moveInDate: text(formData, "moveInDate"),
    accommodationNeeds: text(formData, "accommodationNeeds"),
    supportNeeds: text(formData, "supportNeeds"),
    additionalInfo: text(formData, "additionalInfo"),
    consent: formData.get("consent") === "on" ? "on" : "",
  });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };

  const listing = await db.listing.findUnique({
    where: { id: parsed.data.listingId },
    select: { id: true, companyId: true, title: true, status: true },
  });
  if (!listing || listing.status !== "ACTIVE") return { ok: false, errors: { form: "That advert is no longer live." } };

  const already = await db.accommodationRequest.findUnique({
    where: { listingId_applicantId: { listingId: listing.id, applicantId: user.id } },
  });
  if (already) return { ok: false, errors: { form: "You've already requested this accommodation." } };

  const request = await db.accommodationRequest.create({
    data: {
      listingId: listing.id,
      applicantId: user.id,
      moveInDate: date(parsed.data.moveInDate),
      accommodationNeeds: parsed.data.accommodationNeeds || null,
      supportNeeds: parsed.data.supportNeeds || null,
      additionalInfo: parsed.data.additionalInfo || null,
    },
  });

  await db.application.create({ data: { listingId: listing.id, requestId: request.id } });

  await notifyCompany(listing.companyId, {
    type: "REQUEST",
    title: "New accommodation request",
    body: `${user.firstName} ${user.lastName.charAt(0)}. requested ${listing.title}.`,
    href: `/provider/requests/${request.id}`,
    email: true,
  });
  await audit({ actorId: user.id, action: "request.created", targetType: "AccommodationRequest", targetId: request.id });

  redirect(`/dashboard/requests?submitted=${request.id}`);
}

export async function updateRequestStatusAction(requestId: string, status: RequestStatus, note?: string) {
  const user = await requireUser();
  const request = await assertRequestAccess(user, requestId);
  const isProvider = canActForCompany(user, request.listing.companyId);
  if (!isProvider && status !== "WITHDRAWN") return;

  await db.accommodationRequest.update({
    where: { id: requestId },
    data: { status, statusNote: note ?? null },
  });

  await notify({
    userId: request.applicantId,
    type: "REQUEST",
    title: "Your request has been updated",
    body: `Status: ${status.replace(/_/g, " ").toLowerCase()}.`,
    href: `/dashboard/requests`,
    email: true,
  });
  await audit({
    actorId: user.id,
    action: "request.status_changed",
    targetType: "AccommodationRequest",
    targetId: requestId,
    metadata: { status },
  });

  revalidatePath("/provider/requests");
  revalidatePath("/dashboard/requests");
}

/**
 * Archiving is purely a provider-side view filter — it never touches status
 * or notifies the applicant, so it's safe for a provider to tidy up their
 * queue without it looking like anything changed on the applicant's side.
 */
export async function archiveRequestAction(requestId: string) {
  const user = await requireUser();
  const request = await assertRequestAccess(user, requestId);
  if (!canActForCompany(user, request.listing.companyId)) return;

  await db.accommodationRequest.update({ where: { id: requestId }, data: { archivedAt: new Date() } });
  await audit({ actorId: user.id, action: "request.archived", targetType: "AccommodationRequest", targetId: requestId });
  revalidatePath("/provider/requests");
}

export async function unarchiveRequestAction(requestId: string) {
  const user = await requireUser();
  const request = await assertRequestAccess(user, requestId);
  if (!canActForCompany(user, request.listing.companyId)) return;

  await db.accommodationRequest.update({ where: { id: requestId }, data: { archivedAt: null } });
  await audit({ actorId: user.id, action: "request.unarchived", targetType: "AccommodationRequest", targetId: requestId });
  revalidatePath("/provider/requests");
}

// ------------------------------------------------------------------ reporting

export async function createReportAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const throttle = await rateLimit(`report:${user.id}`, LIMITS.report);
  if (!throttle.ok) return { ok: false, errors: { form: "You've filed several reports already. Our team is looking at them." } };
  const parsed = reportSchema.safeParse({
    targetType: text(formData, "targetType"),
    targetId: text(formData, "targetId"),
    reason: text(formData, "reason"),
    detail: text(formData, "detail"),
  });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };

  await db.report.create({
    data: {
      reporterId: user.id,
      targetType: parsed.data.targetType,
      targetId: parsed.data.targetId,
      reason: parsed.data.reason,
      detail: parsed.data.detail || null,
    },
  });
  await audit({
    actorId: user.id,
    action: "report.created",
    targetType: parsed.data.targetType,
    targetId: parsed.data.targetId,
  });

  return { ok: true, message: "Thanks — our team will review this." };
}

export async function markNotificationsReadAction() {
  const user = await requireUser();
  await db.notification.updateMany({
    where: { userId: user.id, readAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath("/dashboard/notifications");
}
