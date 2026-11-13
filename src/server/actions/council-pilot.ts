"use server";

import { z } from "zod";
import { brand } from "@/brand.config";
import { sendEmail } from "@/lib/notify";
import { callerIp, rateLimit } from "@/lib/rate-limit";
import type { FormState } from "@/lib/validation";

const pilotSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  council: z.string().trim().min(2).max(120),
  area: z.string().trim().min(2).max(120),
});

export async function requestCouncilPilot(_previous: FormState, data: FormData): Promise<FormState> {
  const parsed = pilotSchema.safeParse(Object.fromEntries(["name", "email", "council", "area"].map((field) => [field, data.get(field)])));
  if (!parsed.success) return { ok: false, message: "Enter your name, work email, council and area." };
  if (process.env.EMAIL_DRIVER !== "resend") return { ok: false, message: `Online requests are unavailable. Please email ${brand.supportEmail}.` };
  const limit = await rateLimit(`council-pilot:${await callerIp()}`, { limit: 5, windowMs: 60 * 60 * 1000 });
  if (!limit.ok) return { ok: false, message: "Too many requests. Please try again later." };
  const { name, email, council, area } = parsed.data;
  try {
    await sendEmail({ to: brand.supportEmail, replyTo: email, subject: "RoomsNow council pilot request", text: `Name: ${name}\nWork email: ${email}\nCouncil: ${council}\nArea: ${area}` });
    return { ok: true, message: "Pilot request received. The RoomsNow team will reply to your work email. This does not grant council dashboard access." };
  } catch {
    return { ok: false, message: `We couldn't deliver your request. Please email ${brand.supportEmail}.` };
  }
}
