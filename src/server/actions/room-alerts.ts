"use server";

import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { callerIp, rateLimit } from "@/lib/rate-limit";
import { whatsappEnabled } from "@/lib/notify";
import { sendRoomAlertConfirmation } from "@/lib/room-alerts";
import { maskContact, normaliseEmail, normaliseUkMobile } from "@/lib/room-alert-rules";
import type { FormState } from "@/lib/validation";

/** "Tell me when a room comes up": no account needed. Confirmed by a link before anything else is sent. */
export async function createRoomAlertAction(_prev: FormState, form: FormData): Promise<FormState> {
  const ip = await callerIp();
  const throttle = await rateLimit(`room-alert:${ip}`, { limit: 6, windowMs: 60 * 60_000 });
  if (!throttle.ok) return { ok: false, errors: { form: "Too many alerts set up from here. Try again in an hour." } };

  const where = String(form.get("where") ?? "").replace(/\s+/g, " ").trim().slice(0, 60);
  if (where.length < 2) return { ok: false, errors: { where: "Enter a town, area or postcode, like Birmingham or B21." } };

  const channel = form.get("channel") === "whatsapp" && whatsappEnabled() ? "whatsapp" : "email";
  const phone = channel === "whatsapp" ? normaliseUkMobile(String(form.get("phone") ?? "")) : null;
  const email = channel === "email" ? normaliseEmail(String(form.get("email") ?? "")) : null;
  if (channel === "whatsapp" && !phone) return { ok: false, errors: { phone: "Enter a UK mobile number, like 07700 900123." } };
  if (channel === "email" && !email) return { ok: false, errors: { email: "Enter a valid email address." } };

  // Same person and place again: resend the confirmation instead of adding a duplicate.
  const existing = await db.roomAlert.findFirst({
    where: { where: { equals: where, mode: "insensitive" }, ...(phone ? { phone, whatsapp: true } : { email }) },
  });
  const alert = existing ?? (await db.roomAlert.create({
    data: { where, email, phone, whatsapp: channel === "whatsapp", token: randomBytes(24).toString("base64url") },
  }));
  if (existing?.confirmedAt) {
    return { ok: true, message: `You already get alerts for ${where}. We'll message ${maskContact(phone ?? email!)} when a room comes up.` };
  }
  try {
    await sendRoomAlertConfirmation(alert);
  } catch (error) {
    console.error("[room-alerts] confirmation failed", error);
    return { ok: false, errors: { form: "We couldn't send the confirmation just now. Please try again in a few minutes." } };
  }
  return {
    ok: true,
    message: channel === "whatsapp"
      ? `Check WhatsApp on ${maskContact(phone!)} and tap the link to start your alerts for ${where}.`
      : `Check your email (${maskContact(email!)}) and tap the link to start your alerts for ${where}.`,
  };
}
