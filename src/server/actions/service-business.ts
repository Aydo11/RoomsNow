"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notify";
import { geocode } from "@/lib/geo";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { storage, validateUpload, verifyFileContents } from "@/lib/storage";
import { fieldErrors, type FormState } from "@/lib/validation";
import { bool, list, num, socialLinks, text } from "../form";
import { requireServiceBusiness, uniqueServiceSlug } from "../service-marketplace";
import {
  advertTransitionAllowed,
  canSubmitAnotherAdvert,
  COUNTED_ADVERT_STATUSES,
  isAdvertPublic,
  isServiceBoostKey,
  isServicePlanTier,
  medianMinutes,
  quoteTransitionAllowed,
  readyForReview,
  SERVICE_PLANS,
  servicePlanFor,
  statusAfterEdit,
  type EvidenceLike,
  type ServiceAdvertStatusValue,
} from "@/lib/service-marketplace";
import {
  poundsToPence,
  quoteResponseSchema,
  serviceAdvertSchema,
  serviceEvidenceSchema,
  serviceProfileSchema,
  splitPlaces,
  splitPostcodes,
} from "@/lib/service-validation";
import {
  cancelServicePlan,
  servicePortalUrl,
  spendServiceBoostCredit,
  startServiceBoostCheckout,
  startServicePlanCheckout,
} from "@/lib/service-billing";

// ------------------------------------------------------------------ helpers

async function appUrl() {
  const configured = process.env.APP_URL?.replace(/\/$/, "");
  if (configured) return configured;
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host") ?? "localhost:3000"}`;
}

const dateOrNull = (value: string) => {
  if (!value) return null;
  const parsed = new Date(`${value}T12:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

async function storeImage(file: File, folder: string): Promise<{ ok: false; error: string } | { ok: true; url: string }> {
  const problem = validateUpload(file, "image");
  if (problem) return { ok: false, error: problem };
  const mismatch = await verifyFileContents(file, Buffer.from(await file.arrayBuffer()));
  if (mismatch) return { ok: false, error: mismatch };
  const saved = await storage.put(file, folder, "public");
  return { ok: true, url: saved.url };
}

const files = (fd: FormData, key: string) => fd.getAll(key).filter((value): value is File => value instanceof File && value.size > 0);

// ------------------------------------------------------------------ profile

export async function saveServiceProfileAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { user, business } = await requireServiceBusiness();
  const throttle = await rateLimit(`upload:${user.id}`, LIMITS.upload);
  if (!throttle.ok) return { ok: false, errors: { form: "You've saved a lot of changes very quickly. Try again in a few minutes." } };

  const radius = num(formData, "radiusMiles");
  const years = num(formData, "yearsExperience");
  const parsed = serviceProfileSchema.safeParse({
    name: text(formData, "name"),
    tradingName: text(formData, "tradingName"),
    contactName: text(formData, "contactName"),
    email: text(formData, "email"),
    phone: text(formData, "phone"),
    website: text(formData, "website"),
    companyNumber: text(formData, "companyNumber").replace(/\s/g, ""),
    categories: list(formData, "categories"),
    areas: splitPlaces(text(formData, "areas")),
    postcodes: splitPostcodes(text(formData, "postcodes")),
    nationalCoverage: bool(formData, "nationalCoverage"),
    basePostcode: text(formData, "basePostcode"),
    radiusMiles: radius === undefined || Number.isNaN(radius) ? null : Math.round(radius),
    description: text(formData, "description"),
    yearsExperience: years === undefined || Number.isNaN(years) ? null : Math.round(years),
    openingHours: text(formData, "openingHours"),
    emergencyAvailable: bool(formData, "emergencyAvailable"),
    pricingSummary: text(formData, "pricingSummary"),
    quoteOnly: bool(formData, "quoteOnly"),
    terms: text(formData, "terms"),
    cancellationPolicy: text(formData, "cancellationPolicy"),
    responseTarget: text(formData, "responseTarget"),
  });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const data = parsed.data;

  // Area limits follow the plan; before choosing one, the Standard limit applies.
  const plan = servicePlanFor(business.subscription) ?? SERVICE_PLANS.STANDARD;
  if (data.areas.length > plan.maxServiceAreas) {
    return { ok: false, errors: { areas: `${plan.name} covers up to ${plan.maxServiceAreas} named areas. Tick nationwide or upgrade to Pro for more.` } };
  }

  const links = socialLinks(formData);
  if (links.some((link) => !/^https?:\/\//i.test(link.url))) return { ok: false, errors: { socialLinks: "Social links must start with https://" } };

  const images: { logoUrl?: string; coverUrl?: string } = {};
  for (const key of ["logo", "cover"] as const) {
    const file = files(formData, key)[0];
    if (!file) continue;
    const stored = await storeImage(file, `services/${business.id}`);
    if (!stored.ok) return { ok: false, errors: { [key]: stored.error } };
    images[key === "logo" ? "logoUrl" : "coverUrl"] = stored.url;
  }

  const removed = new Set(list(formData, "removePortfolio"));
  const portfolio = business.portfolio.filter((image) => !removed.has(image));
  const portfolioLimit = plan.enhancedProfile ? 12 : 3;
  const uploads = files(formData, "portfolio");
  if (portfolio.length + uploads.length > portfolioLimit) {
    return { ok: false, errors: { portfolio: `Your plan includes up to ${portfolioLimit} portfolio photos.` } };
  }
  for (const file of uploads) {
    const stored = await storeImage(file, `services/${business.id}/portfolio`);
    if (!stored.ok) return { ok: false, errors: { portfolio: stored.error } };
    portfolio.push(stored.url);
  }

  let point: { latitude: number; longitude: number } | null = null;
  if (data.basePostcode && data.basePostcode !== business.basePostcode) point = await geocode({ postcode: data.basePostcode });

  const identityChanged = data.name !== business.name || (data.companyNumber || null) !== business.companyNumber;
  const slug = data.name !== business.name ? await uniqueServiceSlug(data.tradingName || data.name, business.id) : business.slug;

  await db.serviceBusiness.update({
    where: { id: business.id },
    data: {
      name: data.name,
      tradingName: data.tradingName || null,
      slug,
      contactName: data.contactName,
      email: data.email,
      phone: data.phone || null,
      website: data.website || null,
      socialLinks: links,
      companyNumber: data.companyNumber || null,
      categories: data.categories,
      areas: data.areas,
      postcodes: data.postcodes,
      nationalCoverage: data.nationalCoverage,
      basePostcode: data.basePostcode || null,
      ...(point ? { latitude: point.latitude, longitude: point.longitude } : !data.basePostcode ? { latitude: null, longitude: null } : {}),
      radiusMiles: data.radiusMiles,
      description: data.description || null,
      yearsExperience: data.yearsExperience,
      openingHours: data.openingHours || null,
      emergencyAvailable: data.emergencyAvailable,
      pricingSummary: data.pricingSummary || null,
      quoteOnly: data.quoteOnly,
      terms: data.terms || null,
      cancellationPolicy: data.cancellationPolicy || null,
      responseTarget: data.responseTarget || null,
      portfolio,
      ...images,
    },
  });
  await audit({
    actorId: user.id,
    action: identityChanged && business.status === "APPROVED" ? "service_business.identity_changed" : "service_business.updated",
    targetType: "ServiceBusiness",
    targetId: business.id,
    ...(identityChanged ? { metadata: { from: { name: business.name, companyNumber: business.companyNumber }, to: { name: data.name, companyNumber: data.companyNumber || null } } } : {}),
  });
  revalidatePath("/service-provider", "layout");
  return {
    ok: true,
    message: data.basePostcode && !point && data.basePostcode !== business.basePostcode ? "Saved. We couldn't find that postcode, so radius searches won't include you until it's corrected." : "Profile saved.",
  };
}

// ------------------------------------------------------------------ evidence

export async function uploadServiceEvidenceAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { user, business } = await requireServiceBusiness();
  const throttle = await rateLimit(`upload:${user.id}`, LIMITS.upload);
  if (!throttle.ok) return { ok: false, errors: { form: "Too many uploads. Try again later." } };

  const parsed = serviceEvidenceSchema.safeParse({
    type: text(formData, "type"),
    label: text(formData, "label"),
    issuer: text(formData, "issuer"),
    reference: text(formData, "reference"),
    expiresAt: dateOrNull(text(formData, "expiresAt")),
  });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };

  const file = files(formData, "file")[0];
  if (!file) return { ok: false, errors: { file: "Choose the document to upload." } };
  const problem = validateUpload(file, "document");
  if (problem) return { ok: false, errors: { file: problem } };
  const mismatch = await verifyFileContents(file, Buffer.from(await file.arrayBuffer()));
  if (mismatch) return { ok: false, errors: { file: mismatch } };

  const count = await db.serviceEvidence.count({ where: { businessId: business.id } });
  if (count >= 30) return { ok: false, errors: { form: "You've uploaded 30 documents. Remove old ones before adding more." } };

  const stored = await storage.put(file, `service-evidence/${business.id}`, "private");
  const evidence = await db.serviceEvidence.create({
    data: {
      businessId: business.id,
      type: parsed.data.type,
      label: parsed.data.label,
      issuer: parsed.data.issuer || null,
      reference: parsed.data.reference || null,
      expiresAt: parsed.data.expiresAt,
      fileUrl: stored.url,
      fileName: file.name.slice(0, 160),
      mimeType: stored.mimeType,
      sizeBytes: stored.sizeBytes,
      uploadedById: user.id,
    },
  });
  await audit({ actorId: user.id, action: "service_evidence.uploaded", targetType: "ServiceEvidence", targetId: evidence.id, metadata: { businessId: business.id, type: parsed.data.type } });
  revalidatePath("/service-provider/verification");
  return { ok: true, message: business.status === "APPROVED" ? "Uploaded. We'll check it and update your profile." : "Uploaded." };
}

export async function deleteServiceEvidenceAction(evidenceId: string) {
  const { user, business } = await requireServiceBusiness();
  const evidence = await db.serviceEvidence.findFirst({ where: { id: evidenceId, businessId: business.id } });
  if (!evidence || evidence.status === "ACCEPTED") return;
  await db.serviceEvidence.delete({ where: { id: evidence.id } });
  await storage.remove(evidence.fileUrl, "private").catch(() => undefined);
  await audit({ actorId: user.id, action: "service_evidence.deleted", targetType: "ServiceEvidence", targetId: evidence.id });
  revalidatePath("/service-provider/verification");
}

export async function submitServiceBusinessForReviewAction(_prev: FormState, _formData: FormData): Promise<FormState> {
  const { user, business } = await requireServiceBusiness();
  if (!["ONBOARDING", "CHANGES_REQUESTED", "REJECTED"].includes(business.status)) {
    return { ok: false, errors: { form: business.status === "PENDING_REVIEW" ? "Your business is already with our team." : "Your business has already been reviewed." } };
  }
  const evidence = await db.serviceEvidence.findMany({ where: { businessId: business.id }, select: { type: true, status: true, label: true, issuer: true, expiresAt: true } });
  const check = readyForReview(business, evidence as EvidenceLike[]);
  if (!check.ready) return { ok: false, errors: { form: `Before we can check your business, add ${check.missing.join(", ")}.` } };

  await db.serviceBusiness.update({ where: { id: business.id }, data: { status: "PENDING_REVIEW", submittedAt: new Date(), statusReason: null } });
  await audit({ actorId: user.id, action: "service_business.submitted", targetType: "ServiceBusiness", targetId: business.id });
  const admins = await db.user.findMany({ where: { role: "ADMIN", status: "ACTIVE", adminPermissions: { has: "ALL" } }, select: { id: true }, take: 20 });
  await Promise.all(admins.map((admin) => notify({ userId: admin.id, type: "VERIFICATION", title: "Service business to check", body: `${business.name} sent their documents for review.`, href: `/admin/marketplace/${business.id}` })));
  revalidatePath("/service-provider", "layout");
  return { ok: true, message: "Sent. We usually check documents within two working days." };
}

// ------------------------------------------------------------------ adverts

export async function saveServiceAdvertAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { user, business } = await requireServiceBusiness();
  const throttle = await rateLimit(`upload:${user.id}`, LIMITS.upload);
  if (!throttle.ok) return { ok: false, errors: { form: "You've saved a lot of changes very quickly. Try again in a few minutes." } };

  const advertId = text(formData, "advertId") || null;
  const intent = text(formData, "intent") === "draft" ? "draft" : "submit";
  const existing = advertId ? await db.serviceAdvert.findFirst({ where: { id: advertId, businessId: business.id } }) : null;
  if (advertId && !existing) return { ok: false, errors: { form: "Advert not found." } };

  const priceType = text(formData, "priceType") || "QUOTE";
  const parsed = serviceAdvertSchema.safeParse({
    title: text(formData, "title"),
    category: text(formData, "category"),
    subcategory: text(formData, "subcategory"),
    description: text(formData, "description"),
    locations: splitPlaces(text(formData, "locations")),
    nationwide: bool(formData, "nationwide"),
    priceType,
    priceFrom: priceType === "QUOTE" ? null : poundsToPence(text(formData, "priceFrom")),
    priceTo: priceType === "RANGE" ? poundsToPence(text(formData, "priceTo")) : null,
    priceUnit: text(formData, "priceUnit"),
    availability: text(formData, "availability"),
    emergency: bool(formData, "emergency"),
    sameDay: bool(formData, "sameDay"),
    qualifications: text(formData, "qualifications"),
    website: text(formData, "website"),
  });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const data = parsed.data;

  const plan = servicePlanFor(business.subscription) ?? SERVICE_PLANS.STANDARD;
  if (data.locations.length > plan.maxServiceAreas) {
    return { ok: false, errors: { locations: `${plan.name} covers up to ${plan.maxServiceAreas} areas per advert. Tick nationwide or upgrade to Pro.` } };
  }

  const removed = new Set(list(formData, "removeImages"));
  const images = (existing?.images ?? []).filter((image) => !removed.has(image));
  const uploads = files(formData, "images");
  if (images.length + uploads.length > 6) return { ok: false, errors: { images: "Adverts can have up to 6 photos." } };
  for (const file of uploads) {
    const stored = await storeImage(file, `services/${business.id}/adverts`);
    if (!stored.ok) return { ok: false, errors: { images: stored.error } };
    images.push(stored.url);
  }

  let status: ServiceAdvertStatusValue = existing ? statusAfterEdit(existing.status) : "DRAFT";
  if (intent === "submit" && (status === "DRAFT" || status === "ARCHIVED")) status = "PENDING_REVIEW";
  if (status === "PENDING_REVIEW" && existing?.status !== "PENDING_REVIEW") {
    const live = await db.serviceAdvert.count({ where: { businessId: business.id, status: { in: COUNTED_ADVERT_STATUSES }, ...(existing ? { id: { not: existing.id } } : {}) } });
    const allowed = canSubmitAnotherAdvert(business.subscription, live);
    if (!allowed.ok) {
      if (existing && existing.status !== "DRAFT") return { ok: false, errors: { form: allowed.reason } };
      status = "DRAFT";
    }
  }

  const fields = {
    title: data.title,
    category: data.category,
    subcategory: data.subcategory || null,
    description: data.description,
    locations: data.nationwide ? [] : data.locations,
    nationwide: data.nationwide,
    priceType: data.priceType,
    priceFrom: data.priceFrom,
    priceTo: data.priceTo,
    priceUnit: data.priceUnit || null,
    availability: data.availability || null,
    emergency: data.emergency,
    sameDay: data.sameDay,
    qualifications: data.qualifications || null,
    website: data.website || null,
    images,
    status,
    ...(status === "PENDING_REVIEW" ? { submittedAt: new Date(), reviewNote: null } : {}),
  };
  const advert = existing
    ? await db.serviceAdvert.update({ where: { id: existing.id }, data: fields })
    : await db.serviceAdvert.create({ data: { businessId: business.id, ...fields } });

  await audit({ actorId: user.id, action: existing ? "service_advert.updated" : "service_advert.created", targetType: "ServiceAdvert", targetId: advert.id, metadata: { status } });
  revalidatePath("/service-provider/adverts");
  if (intent === "submit" && status === "DRAFT") {
    return { ok: true, message: "Saved as a draft. Choose a plan (or free up an advert slot) to send it for review.", redirect: `/service-provider/adverts/${advert.id}` };
  }
  return {
    ok: true,
    message: status === "PENDING_REVIEW" ? "Sent for review. We'll let you know when it's live." : "Draft saved.",
    redirect: `/service-provider/adverts/${advert.id}`,
  };
}

export async function setServiceAdvertStatusAction(advertId: string, next: ServiceAdvertStatusValue) {
  const { user, business } = await requireServiceBusiness();
  const advert = await db.serviceAdvert.findFirst({ where: { id: advertId, businessId: business.id } });
  if (!advert || !advertTransitionAllowed(advert.status, next, "owner")) return { ok: false, message: "That change isn't possible." };
  if (next === "ACTIVE" && !isAdvertPublic({ status: "ACTIVE" }, business, business.subscription)) {
    return { ok: false, message: "Your business needs to be approved, with an active plan, before adverts can go live." };
  }
  if (next === "PENDING_REVIEW") {
    const live = await db.serviceAdvert.count({ where: { businessId: business.id, status: { in: COUNTED_ADVERT_STATUSES } } });
    const allowed = canSubmitAnotherAdvert(business.subscription, live);
    if (!allowed.ok) return { ok: false, message: allowed.reason };
  }
  await db.serviceAdvert.update({ where: { id: advert.id }, data: { status: next, ...(next === "PENDING_REVIEW" ? { submittedAt: new Date() } : {}) } });
  await audit({ actorId: user.id, action: "service_advert.status_changed", targetType: "ServiceAdvert", targetId: advert.id, metadata: { from: advert.status, to: next } });
  revalidatePath("/service-provider/adverts");
  revalidatePath(`/service-provider/adverts/${advert.id}`);
  return { ok: true, message: "Updated." };
}

// ------------------------------------------------------------------ plan and boosts

export async function startServicePlanAction(formData: FormData) {
  const { user, business } = await requireServiceBusiness();
  const tier = text(formData, "tier");
  if (!isServicePlanTier(tier)) return;
  const base = await appUrl();
  const url = await startServicePlanCheckout({ businessId: business.id, tier, successUrl: `${base}/service-provider/plan`, cancelUrl: `${base}/service-provider/plan` });
  await audit({ actorId: user.id, action: "service_billing.checkout_started", targetType: "ServiceBusiness", targetId: business.id, metadata: { tier } });
  redirect(url);
}

export async function cancelServicePlanAction() {
  const { user, business } = await requireServiceBusiness();
  await cancelServicePlan(business.id);
  await audit({ actorId: user.id, action: "service_billing.cancelled", targetType: "ServiceBusiness", targetId: business.id });
  revalidatePath("/service-provider/plan");
}

export async function openServiceBillingPortalAction() {
  const { business } = await requireServiceBusiness();
  const url = await servicePortalUrl(business.id, `${await appUrl()}/service-provider/plan`);
  redirect(url ?? "/service-provider/plan");
}

export async function boostServiceAdvertAction(formData: FormData) {
  const { user, business } = await requireServiceBusiness();
  const advertId = text(formData, "advertId");
  const pack = text(formData, "pack");
  const advert = await db.serviceAdvert.findFirst({ where: { id: advertId, businessId: business.id } });
  if (!advert || !isAdvertPublic(advert, business, business.subscription)) redirect(`/service-provider/adverts/${advertId}?boost=unavailable`);
  if (pack === "CREDIT") {
    const spent = await spendServiceBoostCredit(business.id, advert.id);
    await audit({ actorId: user.id, action: "service_boost.credit_used", targetType: "ServiceAdvert", targetId: advert.id, metadata: { spent } });
    redirect(`/service-provider/adverts/${advert.id}?boost=${spent ? "complete" : "no-credits"}`);
  }
  if (!isServiceBoostKey(pack)) return;
  const base = await appUrl();
  const url = await startServiceBoostCheckout({ businessId: business.id, advertId: advert.id, pack, successUrl: `${base}/service-provider/adverts/${advert.id}`, cancelUrl: `${base}/service-provider/adverts/${advert.id}` });
  redirect(url);
}

// ------------------------------------------------------------------ quotes

async function refreshResponseTime(businessId: string) {
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const answered = await db.serviceQuoteRequest.findMany({
    where: { businessId, createdAt: { gte: since }, OR: [{ quotedAt: { not: null } }, { declinedAt: { not: null } }] },
    select: { createdAt: true, quotedAt: true, declinedAt: true },
    take: 300,
  });
  const minutes = answered.map((quote) => Math.max(0, ((quote.quotedAt ?? quote.declinedAt)!.getTime() - quote.createdAt.getTime()) / 60000));
  await db.serviceBusiness.update({ where: { id: businessId }, data: { responseMinutes: medianMinutes(minutes) } });
}

async function postToConversation(conversationId: string | null, senderId: string, body: string) {
  if (!conversationId) return;
  await db.message.create({ data: { conversationId, senderId, body } });
  await db.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: new Date() } });
}

export async function respondToServiceQuoteAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { user, business } = await requireServiceBusiness();
  const quote = await db.serviceQuoteRequest.findFirst({ where: { id: text(formData, "quoteId"), businessId: business.id } });
  if (!quote) return { ok: false, errors: { form: "Quote request not found." } };

  const parsed = quoteResponseSchema.safeParse({
    decision: text(formData, "decision"),
    amount: poundsToPence(text(formData, "amount")),
    note: text(formData, "note"),
    validUntil: dateOrNull(text(formData, "validUntil")),
  });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const { decision, amount, note, validUntil } = parsed.data;
  const to = decision === "quote" ? "QUOTED" : "DECLINED";
  if (!quoteTransitionAllowed(quote.status, to, "business")) return { ok: false, errors: { form: "This request can't be changed any more." } };

  const now = new Date();
  await db.serviceQuoteRequest.update({
    where: { id: quote.id },
    data:
      to === "QUOTED"
        ? { status: "QUOTED", quoteAmount: amount, quoteNote: note || null, quoteValidUntil: validUntil, quotedAt: quote.quotedAt ?? now, viewedAt: quote.viewedAt ?? now }
        : { status: "DECLINED", declineReason: note || null, declinedAt: now, viewedAt: quote.viewedAt ?? now },
  });
  const pounds = amount !== null ? `£${(amount / 100).toLocaleString("en-GB", { minimumFractionDigits: amount % 100 ? 2 : 0 })}` : "";
  await postToConversation(
    quote.conversationId,
    user.id,
    to === "QUOTED"
      ? `Quote for “${quote.service}”: ${pounds}${validUntil ? ` (valid until ${validUntil.toLocaleDateString("en-GB")})` : ""}.${note ? `\n\n${note}` : ""}`
      : `Sorry, we can't take on “${quote.service}”.${note ? `\n\n${note}` : ""}`,
  );
  await notify({
    userId: quote.requesterId,
    type: "MESSAGE",
    title: to === "QUOTED" ? `${business.tradingName || business.name} sent a quote` : `${business.tradingName || business.name} declined your request`,
    body: to === "QUOTED" ? `${quote.service}: ${pounds}` : quote.service,
    href: `/services/quotes/${quote.id}`,
    email: true,
  });
  await refreshResponseTime(business.id);
  await audit({ actorId: user.id, action: `service_quote.${to.toLowerCase()}`, targetType: "ServiceQuoteRequest", targetId: quote.id });
  revalidatePath(`/service-provider/quotes/${quote.id}`);
  revalidatePath("/service-provider/quotes");
  return { ok: true, message: to === "QUOTED" ? "Quote sent." : "Request declined." };
}

export async function completeServiceQuoteAsBusinessAction(quoteId: string) {
  const { user, business } = await requireServiceBusiness();
  const quote = await db.serviceQuoteRequest.findFirst({ where: { id: quoteId, businessId: business.id } });
  if (!quote || !quoteTransitionAllowed(quote.status, "COMPLETED", "business")) return;
  await db.serviceQuoteRequest.update({ where: { id: quote.id }, data: { status: "COMPLETED", completedAt: new Date() } });
  await postToConversation(quote.conversationId, user.id, `We've marked “${quote.service}” as complete. Thanks for choosing us — a quick review helps other providers.`);
  await notify({ userId: quote.requesterId, type: "REVIEW", title: "Job marked complete", body: `How did ${business.tradingName || business.name} do? Leave a review.`, href: `/services/quotes/${quote.id}` });
  await audit({ actorId: user.id, action: "service_quote.completed", targetType: "ServiceQuoteRequest", targetId: quote.id });
  revalidatePath(`/service-provider/quotes/${quote.id}`);
}

export async function replyToServiceReviewAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { user, business } = await requireServiceBusiness();
  const review = await db.serviceReview.findFirst({ where: { id: text(formData, "reviewId"), businessId: business.id } });
  if (!review) return { ok: false, errors: { form: "Review not found." } };
  const reply = text(formData, "reply").trim();
  if (reply.length > 800) return { ok: false, errors: { reply: "Keep your reply under 800 characters." } };
  await db.serviceReview.update({ where: { id: review.id }, data: { reply: reply || null, replyAt: reply ? new Date() : null } });
  await audit({ actorId: user.id, action: "service_review.replied", targetType: "ServiceReview", targetId: review.id });
  revalidatePath("/service-provider/reviews");
  return { ok: true, message: reply ? "Reply published." : "Reply removed." };
}
