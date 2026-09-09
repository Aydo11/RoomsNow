"use server";

import bcrypt from "bcryptjs";
import { randomBytes, createHash } from "node:crypto";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/rbac";
import { rateLimit } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/notify";
import { renderEmail } from "@/lib/email-template";
import type { FormState } from "@/lib/validation";

const input = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  permission: z.enum(["ALL", "MODERATION"]),
});

async function authorise(form: FormData) {
  const actor = await requireAdmin();
  const limit = await rateLimit(`admin-team:${actor.id}`, { limit: 8, windowMs: 15 * 60_000 });
  if (!limit.ok) return null;
  const password = String(form.get("currentPassword") || "");
  if (password.length > 200 || !await bcrypt.compare(password, actor.passwordHash)) return null;
  return actor;
}

export async function createTeamMember(_previous: FormState, form: FormData): Promise<FormState> {
  const actor = await authorise(form);
  if (!actor) return { ok: false, message: "Check your current password, or wait before trying again." };
  const parsed = input.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: "Enter a name, valid email and access level." };
  const token = randomBytes(32).toString("hex");
  const { permission, ...identity } = parsed.data;
  const passwordHash = await bcrypt.hash(randomBytes(48).toString("hex"), 12);
  try {
    await db.$transaction(async (tx) => {
      const freshActor = await tx.user.findUnique({ where: { id: actor.id } });
      if (!freshActor || freshActor.status !== "ACTIVE" || freshActor.role !== "ADMIN" || !freshActor.adminPermissions.includes("ALL") || freshActor.tokenVersion !== actor.tokenVersion) throw new Error("Access changed");
      const user = await tx.user.create({ data: { ...identity, passwordHash, role: "ADMIN", adminPermissions: [permission], emailVerificationRequired: true } });
      await tx.passwordResetToken.create({ data: {
        userId: user.id, tokenHash: createHash("sha256").update(token).digest("hex"),
        expiresAt: new Date(Date.now() + 60 * 60_000),
      } });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "admin.team_created", targetType: "User", targetId: user.id, metadata: { permission } } });
    }, { isolationLevel: "Serializable" });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") return { ok: false, message: "This email already has an account. Use a different work email." };
    return { ok: false, message: "Could not create the account. Please try again." };
  }
  const appUrl = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const setupUrl = `${appUrl}/reset-password?token=${encodeURIComponent(token)}`;
  try {
    await sendEmail({
      to: parsed.data.email,
      subject: "You have been invited to the RoomsNow admin team",
      text: `Set up your RoomsNow admin password using this one-use link (valid for one hour): ${setupUrl}`,
      html: renderEmail({
        preheader: "Set up your RoomsNow admin account.",
        heading: "You've been invited to the admin team",
        bodyHtml: "You have been invited to join the RoomsNow admin team. Set up your password to get started.",
        ctaLabel: "Set up your account",
        ctaUrl: setupUrl,
        note: "This one-use link expires in one hour.",
      }),
    });
  } catch (error) {
    console.error("Admin invitation email failed:", error);
  }
  revalidatePath("/admin/team");
  return { ok: true, message: "Account created and the invitation email was sent. The private setup link is also shown below as a fallback.", redirect: `/reset-password?token=${token}` };
}

export async function updateTeamMember(_previous: FormState, form: FormData): Promise<FormState> {
  const actor = await authorise(form);
  if (!actor) return { ok: false, message: "Check your current password, or wait before trying again." };
  const id = String(form.get("userId") || "");
  const permission = z.enum(["ALL", "MODERATION"]).safeParse(form.get("permission"));
  const status = z.enum(["ACTIVE", "SUSPENDED"]).safeParse(form.get("status"));
  if (id === actor.id || !permission.success || !status.success) return { ok: false, message: "You cannot change your own access here." };
  try {
    await db.$transaction(async (tx) => {
      const freshActor = await tx.user.findUnique({ where: { id: actor.id } });
      if (!freshActor || freshActor.status !== "ACTIVE" || freshActor.role !== "ADMIN" || !freshActor.adminPermissions.includes("ALL") || freshActor.tokenVersion !== actor.tokenVersion) throw new Error("Access changed");
      const target = await tx.user.findUnique({ where: { id } });
      if (!target || target.role !== "ADMIN" || target.deletedAt) throw new Error("Not an administrator");
      await tx.user.update({ where: { id }, data: { adminPermissions: [permission.data], status: status.data, tokenVersion: { increment: 1 } } });
      const remaining = await tx.user.count({ where: { role: "ADMIN", status: "ACTIVE", deletedAt: null, adminPermissions: { has: "ALL" } } });
      if (!remaining) throw new Error("Keep an active administrator");
      await tx.auditLog.create({ data: { actorId: actor.id, action: "admin.team_access_changed", targetType: "User", targetId: id, metadata: { permission: permission.data, status: status.data } } });
    }, { isolationLevel: "Serializable" });
  } catch {
    return { ok: false, message: "Access could not be changed. Refresh and try again; an active full administrator must remain." };
  }
  revalidatePath("/admin/team");
  return { ok: true, message: "Access updated. Their existing sessions have been signed out." };
}
