"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { createSession } from "@/lib/session";
import { requireUser } from "@/lib/rbac";
import { generateRecoveryCodes, openTotpSecret, verifyTotp } from "@/lib/totp";
import { rateLimit } from "@/lib/rate-limit";
import { text } from "../form";

export type TwoStepState = { ok: boolean; message?: string; recoveryCodes?: string[]; errors?: Record<string, string> };

/** Confirms the authenticator app is set up by checking one code, then switches two-step login on. */
export async function confirmTwoStepAction(_prev: TwoStepState, formData: FormData): Promise<TwoStepState> {
  const user = await requireUser("/security/two-step");
  const throttle = await rateLimit(`two-step-setup:${user.id}`, { limit: 10, windowMs: 15 * 60_000 });
  if (!throttle.ok) return { ok: false, errors: { code: "Too many attempts. Wait 15 minutes and try again." } };

  const record = await db.user.findUniqueOrThrow({ where: { id: user.id }, select: { totpSecret: true, totpEnabledAt: true, tokenVersion: true, role: true } });
  if (record.totpEnabledAt) return { ok: true, message: "Two-step login is already on." };
  if (!record.totpSecret) return { ok: false, errors: { code: "Reload the page to get a new set-up code." } };

  const step = verifyTotp(openTotpSecret(record.totpSecret), text(formData, "code"), null);
  if (step == null) return { ok: false, errors: { code: "That code didn't work. Use the newest 6-digit code in your authenticator app." } };

  const { codes, hashes } = generateRecoveryCodes();
  // Switching it on signs out every other device, so old sessions that never
  // passed a code stop working. This device gets a fresh session.
  const updated = await db.user.update({
    where: { id: user.id },
    data: { totpEnabledAt: new Date(), totpLastStep: step, totpRecoveryCodes: hashes, tokenVersion: { increment: 1 } },
    select: { tokenVersion: true, role: true },
  });
  await createSession(user.id, updated.role, updated.tokenVersion);
  await audit({ actorId: user.id, action: "auth.two_step_enabled", targetType: "User", targetId: user.id });
  revalidatePath("/security/two-step");
  return { ok: true, message: "Two-step login is on.", recoveryCodes: codes };
}

/** Turns two-step login off (not allowed for admins). Needs a current code. */
export async function disableTwoStepAction(_prev: TwoStepState, formData: FormData): Promise<TwoStepState> {
  const user = await requireUser("/security/two-step");
  if (user.role === "ADMIN") return { ok: false, errors: { code: "Two-step login is required for admin accounts." } };
  const throttle = await rateLimit(`two-step-setup:${user.id}`, { limit: 10, windowMs: 15 * 60_000 });
  if (!throttle.ok) return { ok: false, errors: { code: "Too many attempts. Wait 15 minutes and try again." } };
  if (!user.totpSecret || !user.totpEnabledAt) return { ok: true, message: "Two-step login is already off." };
  if (verifyTotp(openTotpSecret(user.totpSecret), text(formData, "code"), user.totpLastStep) == null) {
    return { ok: false, errors: { code: "That code didn't work." } };
  }
  await db.user.update({ where: { id: user.id }, data: { totpSecret: null, totpEnabledAt: null, totpLastStep: null, totpRecoveryCodes: [] } });
  await audit({ actorId: user.id, action: "auth.two_step_disabled", targetType: "User", targetId: user.id });
  revalidatePath("/security/two-step");
  return { ok: true, message: "Two-step login is off." };
}
