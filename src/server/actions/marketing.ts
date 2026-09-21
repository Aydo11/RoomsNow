"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/rbac";
import { rateLimit, refundRateLimit } from "@/lib/rate-limit";
import { renderPreLaunchInviteEmail, renderPreLaunchInviteText } from "@/lib/email-template";
import { prepareMarketingBroadcast, sendPreparedMarketingBroadcast } from "@/lib/resend-marketing";
import { email as emailSchema, type FormState } from "@/lib/validation";

/** Hard cap per campaign-specific Resend contact import. */
const MAX_RECIPIENTS = 500;

const input = z.object({
  emails: z.string().trim().min(1, "Enter at least one email address."),
  firstName: z.string().trim().max(80).optional().or(z.literal("")),
  senderName: z.string().trim().min(1, "Enter your name.").max(80),
});

/**
 * These guard against a stuck button or a runaway loop, not against the admin
 * doing their job: a real outreach push is several batches in a sitting, and
 * MAX_RECIPIENTS plus the explicit second confirmation are what actually keep
 * a campaign from going out by accident. An attempt that fails before any mail
 * moves hands its slot straight back (see refundRateLimit), so a bad afternoon
 * with a third party can't lock the admin out of retrying.
 */
const CAMPAIGN_LIMITS = {
  prepare: { limit: 20, windowMs: 60 * 60_000 },
  send: { limit: 20, windowMs: 60 * 60_000 },
} as const;

/** "Please wait" is only useful if it says how long. */
function waitMessage(action: string, retryAfterSeconds: number) {
  const minutes = Math.ceil(retryAfterSeconds / 60);
  const when = minutes > 1 ? `about ${minutes} minutes` : "a minute";
  return `That's a lot of campaigns in one hour. Please wait ${when} before ${action} another one.`;
}

/**
 * Segments belonging to campaigns that have already been sent, which Resend is
 * free to drop if the account has hit its plan's segment ceiling. A campaign
 * that was prepared but never confirmed is left out: its draft broadcast still
 * points at that segment.
 */
async function spentCampaignSegmentIds(): Promise<string[]> {
  // Annotated rather than inferred: only these two columns are selected, and
  // saying so keeps the callbacks below typed whatever shape the generated
  // Prisma client is in.
  type CampaignAudit = { targetId: string | null; metadata: unknown };

  const prepared: CampaignAudit[] = await db.auditLog.findMany({
    where: { action: "admin.pre_launch_broadcast_prepared", targetType: "Broadcast" },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { targetId: true, metadata: true },
  });

  const broadcastIds = prepared.map((row) => row.targetId).filter((id): id is string => Boolean(id));
  if (broadcastIds.length === 0) return [];

  const sent: Array<{ targetId: string | null }> = await db.auditLog.findMany({
    where: { action: "admin.pre_launch_broadcast_sent", targetType: "Broadcast", targetId: { in: broadcastIds } },
    select: { targetId: true },
  });
  const sentBroadcastIds = new Set(sent.map((row) => row.targetId));

  const segmentIds: string[] = [];
  for (const row of prepared) {
    if (!row.targetId || !sentBroadcastIds.has(row.targetId)) continue;
    const segmentId = (row.metadata as { segmentId?: unknown } | null)?.segmentId;
    if (typeof segmentId === "string" && !segmentIds.includes(segmentId)) segmentIds.push(segmentId);
  }
  return segmentIds;
}

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
 * Prepares the pre-launch provider invitation (see renderPreLaunchInviteEmail) as
 * a Resend Broadcast. One submission can cover a whole outreach batch, pasted one
 * address per line or comma-separated. Resend handles queueing, suppression and
 * managed unsubscribe state; the app requires a second confirmation before send. The
 * "1 month free" offer it promises is fulfilled the same way admin already
 * grants complimentary access elsewhere: manually, via the existing provider
 * membership grant form on /admin/memberships, once each recipient registers.
 */
export async function sendPreLaunchInvite(_previous: FormState, form: FormData): Promise<FormState> {
  const actor = await requireAdmin();

  if (form.get("operation") === "send-prepared") {
    const ids = z
      .object({ broadcastId: z.string().uuid(), importId: z.string().uuid() })
      .safeParse({ broadcastId: form.get("broadcastId"), importId: form.get("importId") });
    if (!ids.success) return { ok: false, message: "That prepared campaign is no longer valid. Prepare it again." };
    const preparedAudit = await db.auditLog.findFirst({
      where: { action: "admin.pre_launch_broadcast_prepared", targetType: "Broadcast", targetId: ids.data.broadcastId },
      orderBy: { createdAt: "desc" },
      select: { metadata: true },
    });
    const preparedMetadata = preparedAudit?.metadata as { importId?: unknown } | null | undefined;
    if (preparedMetadata?.importId !== ids.data.importId) {
      return { ok: false, message: "RoomsNow could not verify that prepared campaign. Prepare it again." };
    }
    const sendKey = `admin-pre-launch-broadcast-send:${actor.id}`;
    const limit = await rateLimit(sendKey, CAMPAIGN_LIMITS.send);
    if (!limit.ok) return { ok: false, message: waitMessage("sending", limit.retryAfterSeconds), ...ids.data };
    try {
      const result = await sendPreparedMarketingBroadcast(ids.data);
      if (!result.sent) {
        // Nothing was sent, and the message below asks for the button again —
        // charging for each of those turns following the instructions into a
        // lockout.
        await refundRateLimit(sendKey);
        return {
          ok: false,
          message: `Resend is still ${result.status === "pending" ? "queuing" : "processing"} the contact list. Wait a moment, then press Send campaign again.`,
          ...ids.data,
        };
      }
      await db.auditLog.create({
        data: {
          actorId: actor.id,
          action: "admin.pre_launch_broadcast_sent",
          targetType: "Broadcast",
          targetId: ids.data.broadcastId,
          metadata: { importId: ids.data.importId, importCounts: result.counts ?? null },
        },
      });
      return { ok: true, message: "Campaign handed to Resend. Monitor delivery, bounces, complaints and opt-outs in Resend Broadcasts." };
    } catch (error) {
      console.error("Pre-launch broadcast send failed", error);
      await refundRateLimit(sendKey);
      return { ok: false, message: error instanceof Error ? error.message : "Could not send the prepared campaign.", ...ids.data };
    }
  }

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
  const ctaUrl = `${appUrl}/register?type=PROVIDER&src=EMAIL`;
  // A first-name greeting only makes sense addressed to one person — skip it for a real batch.
  const recipientName = valid.length === 1 ? firstName || undefined : undefined;
  const text = renderPreLaunchInviteText({ recipientName, senderName, ctaUrl });
  const html = renderPreLaunchInviteEmail({ recipientName, senderName, ctaUrl });

  const prepareKey = `admin-pre-launch-broadcast-prepare:${actor.id}`;
  const limit = await rateLimit(prepareKey, CAMPAIGN_LIMITS.prepare);
  if (!limit.ok) return { ok: false, message: waitMessage("preparing", limit.retryAfterSeconds) };

  try {
    const subject = "FILL YOUR VOIDS NOW — an invitation from one Birmingham provider to another (1 month free)";
    const prepared = await prepareMarketingBroadcast({
      campaignName: "Founding provider outreach",
      recipients: valid.map((email) => ({ email, firstName: valid.length === 1 ? firstName || undefined : undefined })),
      subject,
      html,
      text,
      spentSegmentIds: await spentCampaignSegmentIds(),
    });
    await db.auditLog.create({
      data: {
        actorId: actor.id,
        action: "admin.pre_launch_broadcast_prepared",
        targetType: "Broadcast",
        targetId: prepared.broadcastId,
        metadata: { ...prepared, senderName, recipientCount: valid.length, invalidCount },
      },
    });
    const skipped = invalidCount > 0 ? ` Skipped ${invalidCount} invalid address${invalidCount === 1 ? "" : "es"}.` : "";
    return {
      ok: true,
      message: `Prepared a Resend draft for ${valid.length} address${valid.length === 1 ? "" : "es"}.${skipped} No email has been sent. Confirm below once the contact import is ready.`,
      broadcastId: prepared.broadcastId,
      importId: prepared.importId,
      recipientCount: valid.length,
    };
  } catch (error) {
    // No draft exists and no mail moved, so this attempt shouldn't count
    // against the hour — otherwise a run of Resend errors ends up reported as
    // "please wait", hiding the real reason nothing is going out.
    console.error("Pre-launch broadcast preparation failed", error);
    await refundRateLimit(prepareKey);
    return { ok: false, message: error instanceof Error ? error.message : "Could not prepare the outreach campaign." };
  }
}
