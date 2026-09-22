"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin, requireCompany } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { notifyCompany } from "@/lib/notify";
import { storage, validateUpload, verifyFileContents } from "@/lib/storage";
import { ACCREDITATION_SCHEMES, accreditationName, allowedRating, type AccreditationScheme } from "@/lib/accreditations";
import type { FormState } from "@/lib/validation";

const schemes = Object.keys(ACCREDITATION_SCHEMES) as AccreditationScheme[];

export async function submitAccreditationAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const { user, companyId } = await requireCompany();
  const scheme = String(formData.get("scheme") ?? "") as AccreditationScheme;
  const customName = String(formData.get("customName") ?? "").trim();
  const rating = String(formData.get("rating") ?? "").trim();
  const referenceNumber = String(formData.get("referenceNumber") ?? "").trim();
  const publicUrl = String(formData.get("publicUrl") ?? "").trim();
  const expiry = String(formData.get("expiresAt") ?? "").trim();
  const evidence = formData.get("evidence");

  if (!schemes.includes(scheme)) return { ok: false, errors: { scheme: "Choose an accreditation scheme." } };
  if (scheme === "OTHER" && customName.length < 2) return { ok: false, errors: { customName: "Enter the accreditation name." } };
  if (!allowedRating(scheme, rating)) return { ok: false, errors: { rating: "Choose or enter a valid rating or level." } };
  if (scheme === "CQC" && !referenceNumber) return { ok: false, errors: { referenceNumber: "Enter the CQC provider or location ID." } };
  if (publicUrl) {
    try {
      const url = new URL(publicUrl);
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
    } catch {
      return { ok: false, errors: { publicUrl: "Enter a full public evidence link beginning with https://." } };
    }
  }
  if (!(evidence instanceof File) || evidence.size === 0) return { ok: false, errors: { evidence: "Attach evidence for the assessment." } };
  const invalid = validateUpload(evidence, "document");
  if (invalid) return { ok: false, errors: { evidence: invalid } };
  const bytes = Buffer.from(await evidence.arrayBuffer());
  const mismatch = await verifyFileContents(evidence, bytes);
  if (mismatch) return { ok: false, errors: { evidence: mismatch } };

  const expiresAt = expiry ? new Date(`${expiry}T12:00:00.000Z`) : null;
  if (expiresAt && (Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date())) {
    return { ok: false, errors: { expiresAt: "The expiry or review date must be in the future." } };
  }

  const stored = await storage.put(evidence, `accreditations/${companyId}`, "private");
  const accreditation = await db.providerAccreditation.create({
    data: {
      companyId,
      scheme,
      name: accreditationName(scheme, customName),
      rating,
      referenceNumber: referenceNumber || null,
      publicUrl: publicUrl || null,
      expiresAt,
      submittedBy: user.id,
      documents: {
        create: {
          companyId,
          name: evidence.name,
          category: "ACCREDITATION_EVIDENCE",
          url: stored.url,
          mimeType: stored.mimeType,
          sizeBytes: stored.sizeBytes,
          isPrivate: true,
        },
      },
    },
  });
  await audit({ actorId: user.id, action: "accreditation.submitted", targetType: "ProviderAccreditation", targetId: accreditation.id, metadata: { scheme, rating } });
  revalidatePath("/provider/accreditations");
  revalidatePath("/admin/accreditations");
  return { ok: true, message: "Accreditation submitted. It will show as under assessment until an admin verifies it." };
}

export async function reviewAccreditationAction(id: string, approve: boolean, rating: string, note?: string) {
  const admin = await requireAdmin("MODERATION");
  const accreditation = await db.providerAccreditation.findUnique({ where: { id }, select: { companyId: true, scheme: true, name: true } });
  if (!accreditation) return { ok: false, message: "Accreditation not found." };
  if (approve && !allowedRating(accreditation.scheme, rating.trim())) return { ok: false, message: "Choose a valid rating before approval." };

  await db.providerAccreditation.update({
    where: { id },
    data: {
      status: approve ? "APPROVED" : "REJECTED",
      rating: rating.trim() || null,
      reviewNote: note?.trim() || null,
      reviewedAt: new Date(),
      reviewedBy: admin.id,
    },
  });
  await audit({ actorId: admin.id, action: approve ? "admin.accreditation_approved" : "admin.accreditation_rejected", targetType: "ProviderAccreditation", targetId: id, metadata: { rating, note } });
  await notifyCompany(accreditation.companyId, {
    type: "SYSTEM",
    title: approve ? "Accreditation approved" : "Accreditation needs attention",
    body: approve ? `${accreditation.name} (${rating}) is now displayed on your public profile.` : note?.trim() || `${accreditation.name} could not be approved.`,
    href: "/provider/accreditations",
    email: true,
  });
  revalidatePath("/admin/accreditations");
  revalidatePath("/provider/accreditations");
  revalidatePath("/companies/[slug]", "page");
  return { ok: true };
}
