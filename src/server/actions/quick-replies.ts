"use server";

import { db } from "@/lib/db";
import { requireCompany } from "@/lib/rbac";
import { rateLimit } from "@/lib/rate-limit";

const MAX_REPLIES = 30;
const MAX_LENGTH = 1000;

export type QuickReplyItem = { id: string; body: string };

async function listFor(companyId: string): Promise<QuickReplyItem[]> {
  return db.quickReply.findMany({
    where: { companyId },
    orderBy: { createdAt: "asc" },
    select: { id: true, body: true },
  });
}

/** Saves a reply for the whole team to reuse. Returns the updated list. */
export async function saveQuickReplyAction(body: string): Promise<{ ok: boolean; message?: string; replies?: QuickReplyItem[] }> {
  const { user, companyId } = await requireCompany();
  const limit = await rateLimit(`quick-reply:${user.id}`, { limit: 60, windowMs: 60 * 60_000 });
  if (!limit.ok) return { ok: false, message: "You've saved a lot of replies. Try again later." };
  const text = body.trim().slice(0, MAX_LENGTH);
  if (text.length < 2) return { ok: false, message: "Type the reply in the message box first, then save it." };
  const count = await db.quickReply.count({ where: { companyId } });
  if (count >= MAX_REPLIES) return { ok: false, message: `You can keep up to ${MAX_REPLIES} quick replies. Remove one first.` };
  const duplicate = await db.quickReply.findFirst({ where: { companyId, body: text }, select: { id: true } });
  if (!duplicate) await db.quickReply.create({ data: { companyId, body: text } });
  return { ok: true, message: duplicate ? "That reply is already saved." : "Saved to your quick replies.", replies: await listFor(companyId) };
}

export async function deleteQuickReplyAction(id: string): Promise<{ ok: boolean; replies?: QuickReplyItem[] }> {
  const { companyId } = await requireCompany();
  await db.quickReply.deleteMany({ where: { id, companyId } });
  return { ok: true, replies: await listFor(companyId) };
}
