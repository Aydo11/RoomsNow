"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireCompany } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { storage, validateUpload, verifyFileContents } from "@/lib/storage";
import { LICENSING_ITEM_KEYS } from "@/lib/licensing";
import type { FormState } from "@/lib/validation";

/** Saves one checklist item: done or not, a note, and optional private evidence. */
export async function saveLicensingItemAction(_prev: FormState, form: FormData): Promise<FormState> {
  const { user, companyId } = await requireCompany();
  const key = String(form.get("key") ?? "");
  if (!LICENSING_ITEM_KEYS.has(key)) return { ok: false, errors: { form: "That checklist item doesn't exist." } };
  const done = form.get("done") === "on";
  const note = String(form.get("note") ?? "").trim().slice(0, 500) || null;

  let evidence: { documentId: string; documentName: string } | null = null;
  const file = form.get("evidence");
  if (file instanceof File && file.size > 0) {
    const throttle = await rateLimit(`licensing:${companyId}`, LIMITS.upload);
    if (!throttle.ok) return { ok: false, errors: { evidence: "You're uploading very quickly. Try again in a little while." } };
    const invalid = validateUpload(file, "document");
    if (invalid) return { ok: false, errors: { evidence: invalid } };
    const mismatch = await verifyFileContents(file, Buffer.from(await file.arrayBuffer()));
    if (mismatch) return { ok: false, errors: { evidence: mismatch } };
    const stored = await storage.put(file, `licensing/${companyId}`, "private");
    const document = await db.document.create({
      data: { companyId, ownerId: user.id, name: file.name, category: "LICENSING_EVIDENCE", url: stored.url, mimeType: stored.mimeType, sizeBytes: stored.sizeBytes, isPrivate: true },
    });
    evidence = { documentId: document.id, documentName: file.name };
  }

  await db.licensingItem.upsert({
    where: { companyId_key: { companyId, key } },
    create: { companyId, key, done, note, updatedById: user.id, ...evidence },
    update: { done, note, updatedById: user.id, ...evidence },
  });
  await audit({ actorId: user.id, action: "licensing.item_saved", targetType: "Company", targetId: companyId, metadata: { key, done, evidence: Boolean(evidence) } });
  revalidatePath("/provider/licensing");
  return { ok: true, message: "Saved" };
}
