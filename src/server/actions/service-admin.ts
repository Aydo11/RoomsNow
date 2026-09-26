"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notify";
import { requireAdmin } from "@/lib/rbac";
import { type FormState } from "@/lib/validation";
import { text } from "../form";
import { advertTransitionAllowed } from "@/lib/service-marketplace";

/**
 * Admin decisions for the External Services Marketplace. Business and evidence
 * decisions rely on the private documents, so they need full admin permission;
 * moderators can approve adverts and moderate reviews.
 */

const BUSINESS_DECISIONS = {
  approve: { status: "APPROVED", title: "You're approved", body: "Your business has passed our checks. Approved adverts are now visible to paying providers." },
  changes: { status: "CHANGES_REQUESTED", title: "We need a little more", body: "Please update your documents or profile and send them again." },
  reject: { status: "REJECTED", title: "We couldn't approve your business", body: "Please read the note from our team." },
  suspend: { status: "SUSPENDED", title: "Your business is suspended", body: "Your adverts are hidden while our team looks into this." },
  reinstate: { status: "APPROVED", title: "Your business is live again", body: "Your approved adverts are visible to providers again." },
} as const;

export async function reviewServiceBusinessAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin("ALL");
  const decision = text(formData, "decision") as keyof typeof BUSINESS_DECISIONS;
  const outcome = BUSINESS_DECISIONS[decision];
  if (!outcome) return { ok: false, errors: { form: "Choose a decision." } };
  const reason = text(formData, "reason").trim().slice(0, 1000);
  if (decision !== "approve" && decision !== "reinstate" && reason.length < 5) return { ok: false, errors: { reason: "Tell the business why, so they can fix it." } };

  const business = await db.serviceBusiness.findUnique({ where: { id: text(formData, "businessId") } });
  if (!business) return { ok: false, errors: { form: "Business not found." } };
  if (decision === "reinstate" && business.status !== "SUSPENDED") return { ok: false, errors: { form: "Only a suspended business can be reinstated." } };

  const now = new Date();
  await db.serviceBusiness.update({
    where: { id: business.id },
    data: {
      status: outcome.status,
      statusReason: reason || null,
      reviewedAt: now,
      reviewedById: admin.id,
      ...(outcome.status === "APPROVED" && !business.verifiedAt ? { verifiedAt: now } : {}),
    },
  });
  await notify({ userId: business.ownerId, type: "VERIFICATION", title: outcome.title, body: reason ? `${outcome.body} ${reason}` : outcome.body, href: "/service-provider", email: true });
  await audit({ actorId: admin.id, action: `service_business.${decision}`, targetType: "ServiceBusiness", targetId: business.id, metadata: { reason: reason || null, from: business.status } });
  revalidatePath("/admin/marketplace");
  revalidatePath(`/admin/marketplace/${business.id}`);
  return { ok: true, message: "Decision saved and the business has been told." };
}

export async function reviewServiceEvidenceAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin("ALL");
  const decision = text(formData, "decision");
  if (decision !== "accept" && decision !== "reject") return { ok: false, errors: { form: "Choose accept or reject." } };
  const note = text(formData, "note").trim().slice(0, 600);
  if (decision === "reject" && note.length < 5) return { ok: false, errors: { note: "Say what's wrong with the document." } };
  const evidence = await db.serviceEvidence.findUnique({ where: { id: text(formData, "evidenceId") }, include: { business: { select: { ownerId: true } } } });
  if (!evidence) return { ok: false, errors: { form: "Document not found." } };

  await db.serviceEvidence.update({
    where: { id: evidence.id },
    data: { status: decision === "accept" ? "ACCEPTED" : "REJECTED", reviewNote: note || null, reviewedAt: new Date(), reviewedById: admin.id },
  });
  if (decision === "reject") {
    await notify({ userId: evidence.business.ownerId, type: "VERIFICATION", title: "A document needs replacing", body: `${evidence.label}: ${note}`, href: "/service-provider/verification", email: true });
  }
  await audit({ actorId: admin.id, action: `service_evidence.${decision}ed`, targetType: "ServiceEvidence", targetId: evidence.id, metadata: { businessId: evidence.businessId } });
  revalidatePath(`/admin/marketplace/${evidence.businessId}`);
  return { ok: true, message: decision === "accept" ? "Accepted." : "Rejected and the business has been told." };
}

export async function reviewServiceAdvertAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin("MODERATION");
  const decision = text(formData, "decision");
  const note = text(formData, "note").trim().slice(0, 600);
  const advert = await db.serviceAdvert.findUnique({ where: { id: text(formData, "advertId") }, include: { business: { select: { ownerId: true, status: true } } } });
  if (!advert) return { ok: false, errors: { form: "Advert not found." } };
  const to = decision === "approve" ? "ACTIVE" : decision === "reject" ? "REJECTED" : null;
  if (!to || !advertTransitionAllowed(advert.status, to, "admin")) return { ok: false, errors: { form: "That decision doesn't apply to this advert." } };
  if (to === "REJECTED" && note.length < 5) return { ok: false, errors: { note: "Tell the business what to change." } };

  const now = new Date();
  await db.serviceAdvert.update({
    where: { id: advert.id },
    data: { status: to, reviewNote: note || null, reviewedAt: now, reviewedById: admin.id, ...(to === "ACTIVE" && !advert.publishedAt ? { publishedAt: now } : {}) },
  });
  await notify({
    userId: advert.business.ownerId,
    type: "LISTING",
    title: to === "ACTIVE" ? "Your advert is approved" : "Your advert needs changes",
    body:
      to === "ACTIVE"
        ? advert.business.status === "APPROVED"
          ? `${advert.title} is live for paying providers.`
          : `${advert.title} will go live as soon as your business checks are complete.`
        : `${advert.title}: ${note}`,
    href: `/service-provider/adverts/${advert.id}`,
    email: true,
  });
  await audit({ actorId: admin.id, action: `service_advert.${decision}d`, targetType: "ServiceAdvert", targetId: advert.id, metadata: { note: note || null } });
  revalidatePath("/admin/marketplace");
  revalidatePath(`/admin/marketplace/${advert.businessId}`);
  return { ok: true, message: to === "ACTIVE" ? "Approved." : "Rejected." };
}

export async function setServiceReviewHiddenAction(reviewId: string, hidden: boolean, reason?: string) {
  const admin = await requireAdmin("MODERATION");
  const review = await db.serviceReview.findUnique({ where: { id: reviewId }, select: { id: true, businessId: true } });
  if (!review) return;
  await db.serviceReview.update({ where: { id: review.id }, data: hidden ? { hiddenAt: new Date(), hiddenReason: reason?.slice(0, 300) || null } : { hiddenAt: null, hiddenReason: null } });
  await audit({ actorId: admin.id, action: hidden ? "service_review.hidden" : "service_review.restored", targetType: "ServiceReview", targetId: review.id });
  revalidatePath("/admin/marketplace");
  revalidatePath(`/admin/marketplace/${review.businessId}`);
}
