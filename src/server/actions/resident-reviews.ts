"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { canActForCompany, requireAdmin, requireUser } from "@/lib/rbac";
import { notify, notifyCompany } from "@/lib/notify";
import { audit } from "@/lib/audit";
import { containsContactDetails, REPLY_MAX, REVIEW_COMMENT_MAX, yesNo } from "@/lib/review-rules";

export type ReviewFormState = { ok: boolean; message?: string };

/**
 * A resident rates the place they live (or lived). Only for their own
 * placement that reached MOVED_IN; saving again updates the same review.
 */
export async function saveResidentReviewAction(_prev: ReviewFormState, formData: FormData): Promise<ReviewFormState> {
  const user = await requireUser();
  const kind = String(formData.get("kind") ?? "");
  const id = String(formData.get("id") ?? "");
  const rating = Number(formData.get("rating"));
  const comment = String(formData.get("comment") ?? "").trim();
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { ok: false, message: "Choose from 1 to 5 stars." };
  if (comment.length > REVIEW_COMMENT_MAX) return { ok: false, message: `Keep it under ${REVIEW_COMMENT_MAX} characters.` };
  if (comment && containsContactDetails(comment)) {
    return { ok: false, message: "Please leave out phone numbers and email addresses. Reviews are public." };
  }

  let placement: { listingId: string; companyId: string } | null = null;
  if (kind === "request") {
    const request = await db.accommodationRequest.findFirst({
      where: { id, applicantId: user.id, status: "MOVED_IN" },
      select: { listing: { select: { id: true, companyId: true } } },
    });
    if (request) placement = { listingId: request.listing.id, companyId: request.listing.companyId };
  } else if (kind === "referral" && user.emailVerified) {
    const referral = await db.referral.findFirst({
      where: { id, applicantEmail: { equals: user.email, mode: "insensitive" }, status: "MOVED_IN" },
      select: { listing: { select: { id: true, companyId: true } } },
    });
    if (referral?.listing) placement = { listingId: referral.listing.id, companyId: referral.listing.companyId };
  }
  if (!placement) return { ok: false, message: "You can review a home once you've moved in." };

  const data = {
    rating,
    comment: comment || null,
    feelSafe: yesNo(formData.get("feelSafe")),
    supportHelpful: yesNo(formData.get("supportHelpful")),
    stillLivingThere: formData.get("stillLivingThere") !== "no",
  };
  const key = kind === "request" ? { requestId: id } : { referralId: id };
  const existing = await db.residentReview.findFirst({ where: key, select: { id: true, authorId: true } });
  if (existing && existing.authorId !== user.id) return { ok: false, message: "This placement has already been reviewed." };

  if (existing) {
    await db.residentReview.update({ where: { id: existing.id }, data });
  } else {
    await db.residentReview.create({ data: { ...data, ...key, authorId: user.id, companyId: placement.companyId, listingId: placement.listingId } });
    await notifyCompany(placement.companyId, {
      type: "REVIEW",
      title: `A resident rated your accommodation ${rating}/5`,
      body: comment ? "They left a comment too. You can reply publicly." : "You can reply publicly.",
      href: "/provider/reviews",
      email: true,
    });
  }
  await audit({ actorId: user.id, action: existing ? "resident_review.updated" : "resident_review.created", targetType: "Company", targetId: placement.companyId, metadata: { rating } });
  revalidatePath("/dashboard/requests");
  return { ok: true, message: existing ? "Review updated." : "Thank you. Your review is now on the provider's page." };
}

/** The provider's public reply to a resident review. An empty reply removes it. */
export async function replyToResidentReviewAction(_prev: ReviewFormState, formData: FormData): Promise<ReviewFormState> {
  const user = await requireUser();
  const reviewId = String(formData.get("reviewId") ?? "");
  const reply = String(formData.get("reply") ?? "").trim();
  if (reply.length > REPLY_MAX) return { ok: false, message: `Keep it under ${REPLY_MAX} characters.` };

  const review = await db.residentReview.findUnique({ where: { id: reviewId }, select: { id: true, companyId: true, authorId: true, providerReply: true } });
  if (!review || !canActForCompany(user, review.companyId)) return { ok: false, message: "Review not found." };

  await db.residentReview.update({
    where: { id: review.id },
    data: reply ? { providerReply: reply, providerReplyAt: new Date(), providerReplyBy: user.id } : { providerReply: null, providerReplyAt: null, providerReplyBy: null },
  });
  if (reply && !review.providerReply) {
    await notify({
      userId: review.authorId,
      type: "REVIEW",
      title: "The provider replied to your review",
      href: "/dashboard/requests",
    });
  }
  await audit({ actorId: user.id, action: "resident_review.replied", targetType: "ResidentReview", targetId: review.id });
  revalidatePath("/provider/reviews");
  return { ok: true, message: reply ? "Reply published." : "Reply removed." };
}

/** Admin moderation: take a review down (or put it back). */
export async function setResidentReviewHiddenAction(formData: FormData) {
  const admin = await requireAdmin("MODERATION");
  const reviewId = String(formData.get("reviewId") ?? "");
  const hide = formData.get("hide") === "1";
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 300) || null;
  await db.residentReview.update({
    where: { id: reviewId },
    data: hide ? { hiddenAt: new Date(), hiddenReason: reason } : { hiddenAt: null, hiddenReason: null },
  });
  await audit({ actorId: admin.id, action: hide ? "resident_review.hidden" : "resident_review.restored", targetType: "ResidentReview", targetId: reviewId, metadata: { reason } });
  revalidatePath("/admin/reviews");
}
