"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/rbac";
import { rateLimit } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/notify";
import { renderPreLaunchInviteEmail, renderPreLaunchInviteText } from "@/lib/email-template";
import { email as emailSchema, type FormState } from "@/lib/validation";

const input = z.object({
  email: emailSchema,
  firstName: z.string().trim().max(80).optional().or(z.literal("")),
  senderName: z.string().trim().min(1, "Enter your name.").max(80),
});

/**
 * Sends the pre-launch provider invitation (see renderPreLaunchInviteEmail) to
 * one address at a time. Deliberately one-at-a-time rather than a bulk/CSV
 * import — this is a hand-picked outreach list of real Birmingham providers,
 * not a mailing list, and the per-send review keeps it that way. The "3
 * months free" offer it promises is fulfilled the same way admin already
 * grants complimentary access elsewhere: manually, via the existing provider
 * membership grant form on /admin/memberships, once the recipient registers.
 */
export async function sendPreLaunchInvite(_previous: FormState, form: FormData): Promise<FormState> {
  const actor = await requireAdmin();
  const limit = await rateLimit(`admin-pre-launch-invite:${actor.id}`, { limit: 30, windowMs: 60 * 60_000 });
  if (!limit.ok) return { ok: false, message: "You've sent a lot of invites in a short time. Wait a bit before sending more." };

  const parsed = input.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  const { email, firstName, senderName } = parsed.data;

  const appUrl = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const ctaUrl = `${appUrl}/register?type=PROVIDER`;
  const recipientName = firstName || undefined;

  try {
    await sendEmail({
      to: email,
      subject: "An invitation from one Birmingham provider to another (3 months free)",
      text: renderPreLaunchInviteText({ recipientName, senderName, ctaUrl }),
      html: renderPreLaunchInviteEmail({ recipientName, senderName, ctaUrl }),
    });
  } catch (error) {
    console.error("Pre-launch invite email failed:", error);
    return { ok: false, message: "Could not send that invite. Please try again." };
  }

  await db.auditLog.create({
    data: { actorId: actor.id, action: "admin.pre_launch_invite_sent", targetType: "Email", targetId: email, metadata: { firstName: firstName || null, senderName } },
  });

  return { ok: true, message: `Invite sent to ${email}. Once they register as a provider, grant them 3 months of Professional from Memberships.` };
}
