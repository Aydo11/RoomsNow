"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertReferralAccess, assertRequestAccess, canActForCompany, requireCompany } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notify";
import { dateTime } from "@/lib/format";
import type { ViewingStatus } from "@prisma/client";

/**
 * A provider proposing a viewing for a request or referral they're handling.
 * Exactly one of requestId/referralId is expected — the listing, and who to
 * notify, are derived from whichever one it is (never taken on trust from
 * the client), so a provider can only ever schedule a viewing against
 * something they actually have access to.
 */
export async function scheduleViewingAction(input: {
  requestId?: string;
  referralId?: string;
  scheduledFor: string;
  note?: string;
}) {
  const { user } = await requireCompany();

  const scheduledFor = new Date(input.scheduledFor);
  if (Number.isNaN(scheduledFor.getTime())) return;

  let listingId: string;
  let notifyUserId: string | null = null;

  if (input.requestId) {
    const request = await assertRequestAccess(user, input.requestId);
    if (!canActForCompany(user, request.listing.companyId)) return;
    listingId = request.listingId;
    notifyUserId = request.applicantId;
  } else if (input.referralId) {
    const referral = await assertReferralAccess(user, input.referralId);
    if (!referral.listing || !canActForCompany(user, referral.listing.companyId)) return;
    if (!referral.listingId) return;
    listingId = referral.listingId;
    notifyUserId = referral.referrerId;
  } else {
    return;
  }

  const viewing = await db.viewing.create({
    data: {
      listingId,
      requestId: input.requestId ?? null,
      referralId: input.referralId ?? null,
      scheduledFor,
      note: input.note?.trim() || null,
      createdById: user.id,
    },
  });

  if (notifyUserId) {
    await notify({
      userId: notifyUserId,
      type: input.requestId ? "REQUEST" : "REFERRAL",
      title: "A viewing has been proposed",
      body: `${dateTime(scheduledFor)}.${input.note ? ` ${input.note}` : ""}`,
      href: input.requestId ? "/dashboard/requests" : `/referrals/${input.referralId}`,
      email: true,
    });
  }

  await audit({
    actorId: user.id,
    action: "viewing.scheduled",
    targetType: "Viewing",
    targetId: viewing.id,
    metadata: { requestId: input.requestId, referralId: input.referralId },
  });

  revalidatePath("/provider/requests");
  revalidatePath("/provider/referrals");
  revalidatePath("/provider/viewings");
}

/**
 * Moves a viewing through its lifecycle — confirmed once the other side
 * agrees, then completed/no-show/cancelled once it's actually happened (or
 * hasn't). Only PROPOSED→CONFIRMED and any status→CANCELLED tell the
 * applicant/referrer anything; completed/no-show are provider record-keeping.
 */
export async function updateViewingStatusAction(viewingId: string, status: ViewingStatus, outcomeNote?: string) {
  const { user } = await requireCompany();
  const viewing = await db.viewing.findUnique({
    where: { id: viewingId },
    include: {
      listing: { select: { companyId: true } },
      request: { select: { applicantId: true } },
      referral: { select: { referrerId: true } },
    },
  });
  if (!viewing) return;
  if (!canActForCompany(user, viewing.listing.companyId)) return;

  await db.viewing.update({
    where: { id: viewingId },
    data: { status, outcomeNote: outcomeNote?.trim() || null },
  });

  const notifyUserId = viewing.request?.applicantId ?? viewing.referral?.referrerId ?? null;
  if (notifyUserId && (status === "CONFIRMED" || status === "CANCELLED")) {
    await notify({
      userId: notifyUserId,
      type: viewing.requestId ? "REQUEST" : "REFERRAL",
      title: status === "CONFIRMED" ? "Viewing confirmed" : "Viewing cancelled",
      body:
        status === "CONFIRMED"
          ? `The viewing on ${dateTime(viewing.scheduledFor)} is confirmed.`
          : `The viewing on ${dateTime(viewing.scheduledFor)} has been cancelled.${outcomeNote ? ` ${outcomeNote}` : ""}`,
      href: viewing.requestId ? "/dashboard/requests" : `/referrals/${viewing.referralId}`,
      email: true,
    });
  }

  await audit({
    actorId: user.id,
    action: "viewing.status_changed",
    targetType: "Viewing",
    targetId: viewingId,
    metadata: { status },
  });

  revalidatePath("/provider/requests");
  revalidatePath("/provider/referrals");
  revalidatePath("/provider/viewings");
  if (viewing.referralId) revalidatePath(`/referrals/${viewing.referralId}`);
}
