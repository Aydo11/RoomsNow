"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireCompany } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { storage, validateUpload, verifyFileContents } from "@/lib/storage";
import { notify } from "@/lib/notify";
import { fieldErrors, companySchema, type FormState } from "@/lib/validation";
import { bool, list, text } from "../form";
import {
  OPTIONAL_VERIFICATION_DOCUMENTS,
  REQUIRED_VERIFICATION_DOCUMENTS,
  VERIFICATION_CHECKLIST_VERSION,
} from "@/lib/verification";

export async function updateCompanyAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { user, companyId } = await requireCompany();

  const parsed = companySchema.safeParse({
    name: text(formData, "name"),
    tradingName: text(formData, "tradingName"),
    registrationNumber: text(formData, "registrationNumber"),
    email: text(formData, "email"),
    phone: text(formData, "phone"),
    website: text(formData, "website"),
    addressLine1: text(formData, "addressLine1"),
    addressLine2: text(formData, "addressLine2"),
    city: text(formData, "city"),
    postcode: text(formData, "postcode"),
    orgType: text(formData, "orgType") || "SUPPORTED_ACCOMMODATION_PROVIDER",
    about: text(formData, "about"),
    operatingAreas: text(formData, "operatingAreas")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    supportTypes: list(formData, "supportTypes"),
  });

  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const d = parsed.data;

  let logoUrl: string | undefined;
  const logo = formData.get("logo");
  if (logo instanceof File && logo.size > 0) {
    const invalid = validateUpload(logo, "image");
    if (invalid) return { ok: false, errors: { logo: invalid } };
    const mismatch = await verifyFileContents(logo, Buffer.from(await logo.arrayBuffer()));
    if (mismatch) return { ok: false, errors: { logo: mismatch } };
    const stored = await storage.put(logo, `companies/${companyId}`);
    logoUrl = stored.url;
  }

  await db.company.update({
    where: { id: companyId },
    data: {
      name: d.name,
      tradingName: d.tradingName || null,
      registrationNumber: d.registrationNumber || null,
      email: d.email,
      phone: d.phone || null,
      website: d.website || null,
      addressLine1: d.addressLine1 || null,
      addressLine2: d.addressLine2 || null,
      city: d.city || null,
      postcode: d.postcode || null,
      orgType: d.orgType,
      about: d.about || null,
      operatingAreas: d.operatingAreas,
      supportTypes: d.supportTypes,
      ...(logoUrl ? { logoUrl } : {}),
    },
  });

  await audit({ actorId: user.id, action: "company.updated", targetType: "Company", targetId: companyId });
  revalidatePath("/provider/settings");
  return { ok: true, message: "Company profile saved." };
}

/**
 * Verification is a manual, human check of the documents a provider supplies.
 * It says nothing about regulatory registration, and the badge copy says so.
 */
export async function requestVerificationAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { user, companyId } = await requireCompany();

  const company = await db.company.findUniqueOrThrow({
    where: { id: companyId },
    select: { registrationNumber: true, addressLine1: true, city: true, postcode: true },
  });
  if (!company.registrationNumber || !company.addressLine1 || !company.city || !company.postcode) {
    return { ok: false, errors: { form: "Complete your registration number and registered address before requesting verification." } };
  }
  if (!bool(formData, "declaration")) {
    return { ok: false, errors: { form: "Confirm the authorised declaration before submitting." } };
  }

  const insuranceExpiryText = text(formData, "insuranceExpiry");
  const insuranceExpiresAt = insuranceExpiryText ? new Date(`${insuranceExpiryText}T12:00:00.000Z`) : null;
  if (!insuranceExpiresAt || Number.isNaN(insuranceExpiresAt.getTime()) || insuranceExpiresAt <= new Date()) {
    return { ok: false, errors: { insuranceExpiry: "Enter a future expiry date for the insurance evidence." } };
  }

  const categorisedFiles: { file: File; category: string; input: string }[] = [];
  for (const document of REQUIRED_VERIFICATION_DOCUMENTS) {
    const file = formData.get(document.input);
    if (!(file instanceof File) || file.size === 0) {
      return { ok: false, errors: { [document.input]: `Attach ${document.label.toLowerCase()}.` } };
    }
    categorisedFiles.push({ file, category: document.category, input: document.input });
  }
  for (const document of OPTIONAL_VERIFICATION_DOCUMENTS) {
    const file = formData.get(document.input);
    if (file instanceof File && file.size > 0) categorisedFiles.push({ file, category: document.category, input: document.input });
  }
  const additional = formData.getAll("additionalDocuments").filter((file): file is File => file instanceof File && file.size > 0);
  if (additional.length > 5) return { ok: false, errors: { additionalDocuments: "Attach no more than five additional files." } };
  categorisedFiles.push(...additional.map((file) => ({ file, category: "ADDITIONAL", input: "additionalDocuments" })));

  for (const { file, input } of categorisedFiles) {
    const invalid = validateUpload(file, "document");
    if (invalid) return { ok: false, errors: { [input]: invalid } };
    const mismatch = await verifyFileContents(file, Buffer.from(await file.arrayBuffer()));
    if (mismatch) return { ok: false, errors: { [input]: mismatch } };
  }

  const storedDocuments: {
    companyId: string;
    name: string;
    category: string;
    url: string;
    mimeType: string;
    sizeBytes: number;
    isPrivate: boolean;
  }[] = [];
  for (const { file, category } of categorisedFiles) {
    const stored = await storage.put(file, `verification/${companyId}`, "private");
    storedDocuments.push({
      companyId,
      name: file.name,
      category,
      url: stored.url,
      mimeType: stored.mimeType,
      sizeBytes: stored.sizeBytes,
      isPrivate: true,
    });
  }

  const request = await db.verificationRequest.create({
    data: {
      companyId,
      type: "COMPANY",
      status: "PENDING",
      submittedBy: user.id,
      note: text(formData, "note") || null,
      insuranceExpiresAt,
      declarationAcceptedAt: new Date(),
      checklistVersion: VERIFICATION_CHECKLIST_VERSION,
      documents: { create: storedDocuments },
    },
  });

  await db.company.update({ where: { id: companyId }, data: { verification: "PENDING" } });
  await audit({
    actorId: user.id,
    action: "verification.requested",
    targetType: "Company",
    targetId: companyId,
    metadata: { requestId: request.id, checklistVersion: VERIFICATION_CHECKLIST_VERSION, documentCount: storedDocuments.length },
  });

  const admins = await db.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
  await Promise.all(
    admins.map((admin) =>
      notify({
        userId: admin.id,
        type: "SYSTEM",
        title: "Verification request submitted",
        body: "A provider has submitted a complete due-diligence evidence pack for review.",
        href: "/admin/verification",
      }),
    ),
  );

  revalidatePath("/provider/settings");
  revalidatePath("/admin");
  revalidatePath("/admin/verification");
  return { ok: true, message: "Submitted securely. Our verification team will review the evidence and record each check." };
}
