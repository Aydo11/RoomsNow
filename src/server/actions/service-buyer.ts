"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notify";
import { requireUser } from "@/lib/rbac";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { storage, validateUpload, verifyFileContents } from "@/lib/storage";
import { fieldErrors, type FormState } from "@/lib/validation";
import { text } from "../form";
import { assertPaidProvider, recordServiceEvent } from "../service-marketplace";
import {
  canReviewQuote,
  isAdvertPublic,
  quoteTransitionAllowed,
  URGENCY_LABELS,
  type ServiceQuoteStatusValue,
} from "@/lib/service-marketplace";
import { poundsToPence, quoteRequestSchema, serviceReviewSchema } from "@/lib/service-validation";

/**
 * Buyer side of Provider Services. Every action re-checks, on the server, that
 * the caller is an accommodation provider on a paid membership and that the
 * advert is still live. A service business never reaches these.
 */

async function liveAdvert(advertId: string) {
  const advert = await db.serviceAdvert.findUnique({
    where: { id: advertId },
    include: { business: { include: { subscription: true } } },
  });
  if (!advert || !isAdvertPublic(advert, advert.business, advert.business.subscription)) return null;
  return advert;
}

async function blockedBetween(a: string, b: string) {
  return Boolean(await db.block.findFirst({ where: { OR: [{ blockerId: a, blockedId: b }, { blockerId: b, blockedId: a }] } }));
}

/** One Services thread per provider organisation and business, reused for every enquiry. */
async function serviceConversation(params: { requesterId: string; ownerId: string; businessId: string; advertId: string; subject: string }) {
  const existing = await db.conversation.findFirst({
    where: { serviceBusinessId: params.businessId, participants: { some: { userId: params.requesterId } } },
    orderBy: { lastMessageAt: "desc" },
  });
  if (existing) {
    if (existing.serviceAdvertId !== params.advertId) {
      await db.conversation.update({ where: { id: existing.id }, data: { serviceAdvertId: params.advertId, subject: params.subject } });
    }
    return existing.id;
  }
  const created = await db.conversation.create({
    data: {
      subject: params.subject,
      serviceBusinessId: params.businessId,
      serviceAdvertId: params.advertId,
      participants: { create: [{ userId: params.requesterId }, { userId: params.ownerId }] },
    },
  });
  return created.id;
}

async function post(conversationId: string, senderId: string, body: string) {
  await db.message.create({ data: { conversationId, senderId, body } });
  await db.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: new Date() } });
}

export async function toggleServiceFavouriteAction(advertId: string) {
  const user = await requireUser("/services");
  assertPaidProvider(user);
  const existing = await db.serviceFavourite.findUnique({ where: { userId_advertId: { userId: user.id, advertId } } });
  if (existing) {
    await db.serviceFavourite.delete({ where: { id: existing.id } });
  } else {
    const advert = await liveAdvert(advertId);
    if (!advert) return { saved: false };
    await db.serviceFavourite.create({ data: { userId: user.id, advertId } });
    await recordServiceEvent({ businessId: advert.businessId, advertId, type: "FAVOURITE", category: advert.category });
  }
  revalidatePath("/services/saved");
  return { saved: !existing };
}

export async function messageServiceBusinessAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser("/services");
  assertPaidProvider(user);
  const throttle = await rateLimit(`message:${user.id}`, LIMITS.message);
  if (!throttle.ok) return { ok: false, errors: { body: "You're sending messages very quickly. Give it a minute." } };
  const body = text(formData, "body").trim();
  if (body.length < 2) return { ok: false, errors: { body: "Write a message to send." } };
  if (body.length > 4000) return { ok: false, errors: { body: "Keep messages under 4,000 characters." } };

  const advert = await liveAdvert(text(formData, "advertId"));
  if (!advert) return { ok: false, errors: { form: "This advert isn't available any more." } };
  if (await blockedBetween(user.id, advert.business.ownerId)) return { ok: false, errors: { form: "You can't message this business." } };

  const conversationId = await serviceConversation({ requesterId: user.id, ownerId: advert.business.ownerId, businessId: advert.businessId, advertId: advert.id, subject: advert.title });
  await post(conversationId, user.id, body);
  await db.serviceAdvert.update({ where: { id: advert.id }, data: { enquiries: { increment: 1 } } });
  await recordServiceEvent({ businessId: advert.businessId, advertId: advert.id, type: "CONTACT", category: advert.category });
  await notify({
    userId: advert.business.ownerId,
    type: "MESSAGE",
    title: "New enquiry from a RoomsNow provider",
    body: `${user.staffOf[0].company.name} messaged you about ${advert.title}.`,
    href: `/messages/${conversationId}`,
    email: true,
  });
  await audit({ actorId: user.id, action: "service_conversation.message", targetType: "Conversation", targetId: conversationId });
  redirect(`/messages/${conversationId}`);
}

export async function requestServiceQuoteAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser("/services");
  const companyId = assertPaidProvider(user);
  const throttle = await rateLimit(`service-quote:${user.id}`, LIMITS.request);
  if (!throttle.ok) return { ok: false, errors: { form: "You've sent several quote requests in the last hour. Try again later." } };

  const advert = await liveAdvert(text(formData, "advertId"));
  if (!advert) return { ok: false, errors: { form: "This advert isn't available any more." } };
  if (await blockedBetween(user.id, advert.business.ownerId)) return { ok: false, errors: { form: "You can't contact this business." } };

  const preferred = text(formData, "preferredDate");
  const parsed = quoteRequestSchema.safeParse({
    service: text(formData, "service") || advert.title,
    location: text(formData, "location"),
    preferredDate: preferred ? new Date(`${preferred}T12:00:00Z`) : null,
    urgency: text(formData, "urgency") || "FLEXIBLE",
    description: text(formData, "description"),
    budgetMin: poundsToPence(text(formData, "budgetMin")),
    budgetMax: poundsToPence(text(formData, "budgetMax")),
  });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const data = parsed.data;

  const uploads = formData.getAll("attachments").filter((value): value is File => value instanceof File && value.size > 0);
  if (uploads.length > 4) return { ok: false, errors: { attachments: "Attach up to 4 photos or documents." } };
  const attachments: Array<{ url: string; name: string; type: string; size: number }> = [];
  for (const file of uploads) {
    const kind = file.type.startsWith("image/") && file.type !== "image/jpeg" && file.type !== "image/png" ? "image" : "document";
    const problem = validateUpload(file, kind);
    if (problem) return { ok: false, errors: { attachments: problem } };
    const mismatch = await verifyFileContents(file, Buffer.from(await file.arrayBuffer()));
    if (mismatch) return { ok: false, errors: { attachments: mismatch } };
    const stored = await storage.put(file, `service-quotes/${advert.businessId}`, "private");
    attachments.push({ url: stored.url, name: file.name.slice(0, 160), type: stored.mimeType, size: stored.sizeBytes });
  }

  const conversationId = await serviceConversation({ requesterId: user.id, ownerId: advert.business.ownerId, businessId: advert.businessId, advertId: advert.id, subject: advert.title });
  const quote = await db.serviceQuoteRequest.create({
    data: {
      businessId: advert.businessId,
      advertId: advert.id,
      requesterId: user.id,
      companyId,
      conversationId,
      service: data.service,
      location: data.location,
      preferredDate: data.preferredDate,
      urgency: data.urgency,
      description: data.description,
      budgetMin: data.budgetMin,
      budgetMax: data.budgetMax,
      attachments: attachments.length ? attachments : undefined,
    },
  });

  const budget =
    data.budgetMin !== null || data.budgetMax !== null
      ? `\nBudget: ${[data.budgetMin, data.budgetMax].filter((v) => v !== null).map((v) => `£${(v! / 100).toLocaleString("en-GB")}`).join(" – ")}`
      : "";
  await post(
    conversationId,
    user.id,
    `Quote request: ${data.service}\nWhere: ${data.location}\nWhen: ${URGENCY_LABELS[data.urgency]}${data.preferredDate ? ` (preferred ${data.preferredDate.toLocaleDateString("en-GB")})` : ""}${budget}${attachments.length ? `\nAttachments: ${attachments.length}` : ""}\n\n${data.description}`,
  );
  await db.serviceAdvert.update({ where: { id: advert.id }, data: { enquiries: { increment: 1 } } });
  await recordServiceEvent({ businessId: advert.businessId, advertId: advert.id, type: "QUOTE", category: advert.category, location: data.location });
  await notify({
    userId: advert.business.ownerId,
    type: "REQUEST",
    title: "New quote request",
    body: `${user.staffOf[0].company.name}: ${data.service} in ${data.location}`,
    href: `/service-provider/quotes/${quote.id}`,
    email: true,
  });
  await audit({ actorId: user.id, action: "service_quote.requested", targetType: "ServiceQuoteRequest", targetId: quote.id, metadata: { businessId: advert.businessId } });
  redirect(`/services/quotes/${quote.id}?sent=1`);
}

export async function updateServiceQuoteAction(quoteId: string, next: ServiceQuoteStatusValue) {
  const user = await requireUser("/services/quotes");
  const companyId = assertPaidProvider(user);
  const quote = await db.serviceQuoteRequest.findFirst({ where: { id: quoteId, companyId }, include: { business: { select: { ownerId: true, name: true, tradingName: true } } } });
  if (!quote || !quoteTransitionAllowed(quote.status, next, "requester")) return { ok: false, message: "That change isn't possible." };
  const now = new Date();
  await db.serviceQuoteRequest.update({
    where: { id: quote.id },
    data: {
      status: next,
      ...(next === "ACCEPTED" ? { acceptedAt: now } : next === "DECLINED" ? { declinedAt: now } : next === "CANCELLED" ? { cancelledAt: now } : next === "COMPLETED" ? { completedAt: now } : {}),
    },
  });
  const words: Partial<Record<ServiceQuoteStatusValue, string>> = {
    ACCEPTED: "accepted your quote",
    DECLINED: "decided not to go ahead with your quote",
    CANCELLED: "cancelled their request",
    COMPLETED: "marked the job as complete",
  };
  if (quote.conversationId) await post(quote.conversationId, user.id, `${user.staffOf[0].company.name} ${words[next]} for “${quote.service}”.`);
  await notify({ userId: quote.business.ownerId, type: "REQUEST", title: `Quote ${next.toLowerCase()}`, body: `${quote.service}`, href: `/service-provider/quotes/${quote.id}`, email: next === "ACCEPTED" });
  await audit({ actorId: user.id, action: `service_quote.${next.toLowerCase()}_by_requester`, targetType: "ServiceQuoteRequest", targetId: quote.id });
  revalidatePath(`/services/quotes/${quote.id}`);
  revalidatePath("/services/quotes");
  return { ok: true, message: "Updated." };
}

export async function submitServiceReviewAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser("/services/quotes");
  const companyId = assertPaidProvider(user);
  const quote = await db.serviceQuoteRequest.findFirst({ where: { id: text(formData, "quoteId"), companyId }, include: { review: { select: { id: true } } } });
  if (!quote || !canReviewQuote({ status: quote.status, companyId: quote.companyId, hasReview: Boolean(quote.review) }, user.staffOf.map((s) => s.companyId))) {
    return { ok: false, errors: { form: "You can review a business once the job is marked complete." } };
  }
  const score = (key: string) => Number(text(formData, key) || 0);
  const parsed = serviceReviewSchema.safeParse({
    rating: score("rating"),
    quality: score("quality"),
    communication: score("communication"),
    timeliness: score("timeliness"),
    value: score("value"),
    comment: text(formData, "comment"),
  });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const review = await db.serviceReview.create({
    data: { quoteId: quote.id, businessId: quote.businessId, authorId: user.id, companyId, ...parsed.data, comment: parsed.data.comment || null },
  });
  const business = await db.serviceBusiness.findUnique({ where: { id: quote.businessId }, select: { ownerId: true } });
  if (business) await notify({ userId: business.ownerId, type: "REVIEW", title: "You have a new review", body: `${parsed.data.rating} out of 5 for ${quote.service}`, href: "/service-provider/reviews" });
  await audit({ actorId: user.id, action: "service_review.created", targetType: "ServiceReview", targetId: review.id });
  revalidatePath(`/services/quotes/${quote.id}`);
  return { ok: true, message: "Thanks — your review is published." };
}
