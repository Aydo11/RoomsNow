"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { assertReferralAccess, canActForCompany, requireReferrer, requireUser } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { notify, notifyCompany } from "@/lib/notify";
import { storage, validateUpload, verifyFileContents } from "@/lib/storage";
import { fieldErrors, referralSchema, type FormState } from "@/lib/validation";
import { date, list, reference, text } from "../form";
import type { ReferralStatus } from "@prisma/client";

export async function createReferralAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireReferrer();

  const throttle = await rateLimit(`referral:${user.id}`, LIMITS.referral);
  if (!throttle.ok) {
    return { ok: false, errors: { form: "That's a lot of referrals in one go. Try again shortly." } };
  }

  const parsed = referralSchema.safeParse({
    listingId: text(formData, "listingId"),
    clientId: text(formData, "clientId"),
    applicantFirstName: text(formData, "applicantFirstName"),
    applicantLastName: text(formData, "applicantLastName"),
    applicantDob: text(formData, "applicantDob"),
    applicantPhone: text(formData, "applicantPhone"),
    applicantEmail: text(formData, "applicantEmail"),
    organisation: text(formData, "organisation"),
    referrerJobTitle: text(formData, "referrerJobTitle"),
    preferredLocation: text(formData, "preferredLocation"),
    accommodationNeeds: text(formData, "accommodationNeeds"),
    supportNeeds: text(formData, "supportNeeds"),
    supportTypes: list(formData, "supportTypes"),
    urgency: text(formData, "urgency") || "MEDIUM",
    additionalInfo: text(formData, "additionalInfo"),
    consent: formData.get("consent") === "on" ? "on" : "",
  });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const d = parsed.data;

  // A referral made from a saved client stays linked to it (for the
  // referrer's own history) but the client must actually belong to this
  // referrer — never trust a clientId blindly from the form.
  let clientId: string | null = null;
  if (d.clientId) {
    const client = await db.client.findFirst({ where: { id: d.clientId, referrerId: user.id }, select: { id: true } });
    if (!client) return { ok: false, errors: { form: "That client record could not be found." } };
    clientId = client.id;
  }

  let listingCompanyId: string | null = null;
  if (d.listingId) {
    const listing = await db.listing.findUnique({
      where: { id: d.listingId },
      select: { companyId: true, status: true },
    });
    if (!listing || listing.status !== "ACTIVE") {
      return { ok: false, errors: { form: "That advert is no longer live." } };
    }
    listingCompanyId = listing.companyId;
  }

  const referral = await db.referral.create({
    data: {
      reference: reference("REF"),
      listingId: d.listingId || null,
      clientId,
      referrerId: user.id,
      applicantFirstName: d.applicantFirstName,
      applicantLastName: d.applicantLastName,
      applicantDob: date(d.applicantDob),
      applicantPhone: d.applicantPhone || null,
      applicantEmail: d.applicantEmail || null,
      organisation: d.organisation,
      referrerJobTitle: d.referrerJobTitle || null,
      preferredLocation: d.preferredLocation || null,
      accommodationNeeds: d.accommodationNeeds || null,
      supportNeeds: d.supportNeeds || null,
      supportTypes: d.supportTypes,
      urgency: d.urgency,
      additionalInfo: d.additionalInfo || null,
      events: { create: { status: "SUBMITTED", note: "Referral submitted", actorId: user.id } },
    },
  });

  // Supporting documents are stored privately and served only through an
  // authorisation check — never linked publicly.
  const files = formData.getAll("documents").filter((f): f is File => f instanceof File && f.size > 0);
  for (const file of files) {
    const invalid = validateUpload(file, "document");
    if (invalid) return { ok: false, errors: { documents: invalid } };
    const mismatch = await verifyFileContents(file, Buffer.from(await file.arrayBuffer()));
    if (mismatch) return { ok: false, errors: { documents: mismatch } };
    const stored = await storage.put(file, `referrals/${referral.id}`, "private");
    await db.document.create({
      data: {
        referralId: referral.id,
        ownerId: user.id,
        name: file.name,
        url: stored.url,
        mimeType: stored.mimeType,
        sizeBytes: stored.sizeBytes,
        isPrivate: true,
      },
    });
  }

  if (d.listingId) await db.application.create({ data: { listingId: d.listingId, referralId: referral.id } });

  if (listingCompanyId) {
    await notifyCompany(listingCompanyId, {
      type: "REFERRAL",
      title: "New referral received",
      body: `${d.organisation} submitted referral ${referral.reference}.`,
      href: `/provider/referrals/${referral.id}`,
      email: true,
    });
  }

  await audit({
    actorId: user.id,
    action: "referral.created",
    targetType: "Referral",
    targetId: referral.id,
    metadata: { listingId: d.listingId || null, urgency: d.urgency },
  });

  redirect(`/referrals/${referral.id}`);
}

export async function updateReferralStatusAction(referralId: string, status: ReferralStatus, note?: string) {
  const user = await requireUser();
  const referral = await assertReferralAccess(user, referralId);

  const isProvider = referral.listing ? canActForCompany(user, referral.listing.companyId) : false;
  const isReferrer = referral.referrerId === user.id;
  if (!isProvider && user.role !== "ADMIN" && !(isReferrer && status === "WITHDRAWN")) return;

  await db.$transaction([
    db.referral.update({ where: { id: referralId }, data: { status, statusNote: note ?? null } }),
    db.referralEvent.create({ data: { referralId, status, note: note ?? null, actorId: user.id } }),
  ]);

  await notify({
    userId: referral.referrerId,
    type: "REFERRAL",
    title: `Referral ${referral.reference} updated`,
    body: `Status: ${status.replace(/_/g, " ").toLowerCase()}.`,
    href: `/referrals/${referralId}`,
    email: true,
  });

  await audit({
    actorId: user.id,
    action: "referral.status_changed",
    targetType: "Referral",
    targetId: referralId,
    metadata: { status },
  });

  revalidatePath(`/referrals/${referralId}`);
  revalidatePath("/provider/referrals");
}

/**
 * Attaches more supporting documents to a referral after it's already been
 * sent — the referrer often doesn't have everything to hand at submission
 * time. Referrer-only and ownership-checked; the provider sees the new files
 * appear on the referral they already have, no separate notification (the
 * referral thread is where they'd look).
 */
export async function addReferralDocumentAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireReferrer();

  const referralId = text(formData, "referralId");
  if (!referralId) return { ok: false, errors: { form: "Referral not found." } };

  const referral = await db.referral.findUnique({ where: { id: referralId }, select: { id: true, referrerId: true, reference: true } });
  if (!referral || referral.referrerId !== user.id) return { ok: false, errors: { form: "Referral not found." } };

  const files = formData.getAll("documents").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return { ok: false, errors: { documents: "Choose at least one file." } };

  for (const file of files) {
    const invalid = validateUpload(file, "document");
    if (invalid) return { ok: false, errors: { documents: invalid } };
    const mismatch = await verifyFileContents(file, Buffer.from(await file.arrayBuffer()));
    if (mismatch) return { ok: false, errors: { documents: mismatch } };
    const stored = await storage.put(file, `referrals/${referral.id}`, "private");
    await db.document.create({
      data: {
        referralId: referral.id,
        ownerId: user.id,
        name: file.name,
        url: stored.url,
        mimeType: stored.mimeType,
        sizeBytes: stored.sizeBytes,
        isPrivate: true,
      },
    });
  }

  await audit({
    actorId: user.id,
    action: "referral.documents_added",
    targetType: "Referral",
    targetId: referral.id,
    metadata: { count: files.length },
  });

  revalidatePath(`/referrals/${referral.id}`);
  return { ok: true, message: files.length === 1 ? "Document added." : `${files.length} documents added.` };
}
