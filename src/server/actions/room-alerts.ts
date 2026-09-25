"use server";

import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { callerIp, rateLimit } from "@/lib/rate-limit";
import { sendRoomAlertConfirmation, smsEnabled } from "@/lib/room-alerts";
import { maskContact, normaliseEmail, normaliseUkMobile } from "@/lib/room-alert-rules";
import { SUPPORT_TYPES } from "@/lib/taxonomy";

export type RoomAlertState = { ok: boolean; message?: string; sentTo?: string };

const MAX_PER_CONTACT = 3;

/** "Tell me when a room comes up", no account needed. Sends a confirm link first. */
export async function createRoomAlertAction(_prev: RoomAlertState, formData: FormData): Promise<RoomAlertState> {
  const limit = await rateLimit(`room-alert:${await callerIp()}`, { limit: 6, windowMs: 60 * 60_000 });
  if (!limit.ok) return { ok: false, message: "You've set up a few alerts already. Try again in an hour." };

  // Bots fill every field; people never see this one.
  if (String(formData.get("website") ?? "")) return { ok: true, sentTo: "you" };

  const contact = String(formData.get("contact") ?? "").trim();
  const where = String(formData.get("where") ?? "").trim().slice(0, 80);
  const validSupport = new Set<string>(SUPPORT_TYPES.map((type) => type.slug));
  const support = formData
    .getAll("support")
    .map(String)
    .filter((slug) => validSupport.has(slug))
    .slice(0, 6);

  const email = contact.includes("@") ? normaliseEmail(contact) : null;
  const phone = email ? null : normaliseUkMobile(contact);
  if (!email && !phone) {
    return { ok: false, message: smsEnabled() ? "Enter an email address or a UK mobile number." : "Enter an email address." };
  }
  if (phone && !smsEnabled()) return { ok: false, message: "Text alerts aren't available yet. Enter an email address instead." };

  const existing = await db.roomAlert.findMany({
    where: email ? { email } : { phone },
    select: { id: true, where: true, token: true, confirmedAt: true },
  });
  const same = existing.find((alert) => alert.where.toLowerCase() === where.toLowerCase());
  if (!same && existing.length >= MAX_PER_CONTACT) {
    return { ok: false, message: `You already have ${MAX_PER_CONTACT} room alerts. Stop one from a previous message to add another.` };
  }

  const alert = same
    ? await db.roomAlert.update({ where: { id: same.id }, data: { support } })
    : await db.roomAlert.create({ data: { email, phone, where, support, token: randomBytes(24).toString("base64url") } });

  if (!alert.confirmedAt) await sendRoomAlertConfirmation(alert);
  return { ok: true, sentTo: maskContact((email ?? phone)!) };
}
