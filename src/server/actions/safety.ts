"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/rbac";
import { clearPhraseCache } from "@/lib/blocked-content";
import type { FormState } from "@/lib/validation";

/** Adds a word or phrase to the safety list (block it, or let it through and flag it). */
export async function addBlockedPhraseAction(_prev: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const phrase = String(form.get("phrase") || "").trim().replace(/\s+/g, " ").toLowerCase();
  const action = form.get("action") === "FLAG" ? "FLAG" : "BLOCK";
  if (phrase.length < 2) return { ok: false, message: "Enter a word or phrase of at least 2 characters." };
  if (phrase.length > 80) return { ok: false, message: "Keep it under 80 characters." };
  const existing = await db.blockedPhrase.findUnique({ where: { phrase } });
  if (existing) {
    await db.blockedPhrase.update({ where: { phrase }, data: { action } });
  } else {
    await db.blockedPhrase.create({ data: { phrase, action, createdById: admin.id } });
  }
  clearPhraseCache();
  await audit({ actorId: admin.id, action: "admin.blocked_phrase_added", targetType: "BlockedPhrase", metadata: { phrase, mode: action } });
  revalidatePath("/admin/safety-flags");
  return { ok: true, message: action === "BLOCK" ? `"${phrase}" is now blocked.` : `Messages mentioning "${phrase}" will now be flagged.` };
}

export async function removeBlockedPhraseAction(form: FormData) {
  const admin = await requireAdmin();
  const id = String(form.get("id") || "");
  const row = await db.blockedPhrase.findUnique({ where: { id } });
  if (!row) return;
  await db.blockedPhrase.delete({ where: { id } });
  clearPhraseCache();
  await audit({ actorId: admin.id, action: "admin.blocked_phrase_removed", targetType: "BlockedPhrase", metadata: { phrase: row.phrase } });
  revalidatePath("/admin/safety-flags");
}
