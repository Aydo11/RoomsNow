"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/rbac";
import { rateLimit } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/notify";
import { renderPreLaunchInviteEmail, renderPreLaunchInviteText } from "@/lib/email-template";
import { email as emailSchema, type FormState } from "@/lib/validation";

/** Hard cap per submission — a real safety rail, not a UI nicety, since this sends real email. */
const MAX_RECIPIENTS = 150;

const input = z.object({
  emails: z.string().trim().min(1, "Enter at least one email address."),
  firstName: z.string().trim().max(80).optional().or(z.literal("")),
  senderName: z.string().trim().min(1, "Enter your name.").max(80),
});

/** Splits a pasted block of addresses on newlines, commas or semicolons and dedupes case-insensitively. */
function splitRecipients(raw: string): string[] {
  const seen = new Set<string>();
  for (const candidate of raw.split(/[\n,;]+/)) {
    const trimmed = candidate.trim();
    if (trimmed) seen.add(trimmed.toLowerCase());
  }
  return Array.from(seen);
}

/**
 * Sends the pre-launch provider invitation (see renderPreLaunchInviteEmail) as a
 * mailshot — one submission can cover a whole outreach batch, pasted one address
 * per line or comma-separated. Each address still gets its own send (not a single
 * BCC blast) and is rate-limited and audit-logged individually, so a partial
 * failure or a mid-batch rate-limit hit only affects the addresses after it. The
 * "3 months free" offer it promises is fulfilled the same way admin already
 * grants complimentary access elsewhere: manually, via the existing provider
 * membership grant form on /admin/memberships, once each recipient registers.
 */
export async function sendPreLaunchInvite(_previous: FormState, form: FormData): Promise<FormState> {
  const actor = await requireAdmin();

  const parsed = input.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  const { emails, firstName, senderName } = parsed.data;

  const candidates = splitRecipients(emails);
  if (candidates.length === 0) return { ok: false, message: "Enter at least one email address." };
  if (candidates.length > MAX_RECIPIENTS) {
    return { ok: false, message: `That's ${candidates.length} addresses — send at most ${MAX_RECIPIENTS} in one batch.` };
  }

  const valid: string[] = [];
  for (const candidate of candidates) {
    const result = emailSchema.safeParse(candidate);
    if (result.success) valid.push(result.data);
  }
  const invalidCount = candidates.length - valid.length;
  if (valid.length === 0) return { ok: false, message: "None of those look like valid email addresses." };

  const appUrl = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const ctaUrl = `${appUrl}/register?type=PROVIDER`;
  // A first-name greeting only makes sense addressed to one person — skip it for a real batch.
  const recipientName = valid.length === 1 ? firstName || undefined : undefined;
  const text = renderPreLaunchInviteText({ recipientName, senderName, ctaUrl });
  const html = renderPreLaunchInviteEmail({ recipientName, senderName, ctaUrl });

  let sent = 0;
  let failed = 0;
  let rateLimited = false;
  const sentTo: string[] = [];

  for (const to of valid) {
    const limit = await rateLimit(`admin-pre-launch-invite:${actor.id}`, { limit: 150, windowMs: 60 * 60_000 });
    if (!limit.ok) { rateLimited = true; break; }
    try {
      await sendEmail({ to, subject: "An invitation from one Birmingham provider to another (3 months free)", text, html });
      sent += 1;
      sentTo.push(to);
    } catch (error) {
      console.error("Pre-launch invite email failed:", to, error);
      failed += 1;
    }
  }

  if (sent > 0) {
    await db.auditLog.create({
      data: {
        actorId: actor.id,
        action: "admin.pre_launch_invite_sent",
        targetType: "Email",
        targetId: sentTo.length === 1 ? sentTo[0] : `${sent} recipients`,
        metadata: { senderName, firstName: valid.length === 1 ? firstName || null : null, recipientCount: sent, recipients: sentTo },
      },
    });
  }

  if (sent === 0) return { ok: false, message: "Could not send any invites. Please try again." };

  const parts = [`Sent to ${sent} of ${valid.length} address${valid.length === 1 ? "" : "es"}.`];
  if (invalidCount > 0) parts.push(`Skipped ${invalidCount} invalid address${invalidCount === 1 ? "" : "es"}.`);
  if (failed > 0) parts.push(`${failed} failed to send.`);
  if (rateLimited) parts.push("Hit the hourly send limit partway through — paste the rest again shortly.");
  parts.push("Once they register, grant 3 months of Professional from Memberships.");
  return { ok: true, message: parts.join(" ") };
}
