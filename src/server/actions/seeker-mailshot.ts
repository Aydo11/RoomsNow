"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/rbac";
import { rateLimit, refundRateLimit } from "@/lib/rate-limit";
import { renderSeekerAboutEmail, renderSeekerAboutText } from "@/lib/email-template";
import { prepareMarketingBroadcast, sendPreparedMarketingBroadcast } from "@/lib/resend-marketing";
import { sendEmail } from "@/lib/notify";
import type { FormState } from "@/lib/validation";
import { seekerAudienceWhere } from "@/lib/seeker-audience";

/** Safety rail: bigger lists should be split by audience. */
const MAX_RECIPIENTS = 2000;
const PREPARED = "admin.seeker_broadcast_prepared";
const SENT = "admin.seeker_broadcast_sent";

const CAMPAIGN_LIMITS = {
  prepare: { limit: 20, windowMs: 60 * 60_000 },
  send: { limit: 20, windowMs: 60 * 60_000 },
  test: { limit: 10, windowMs: 60 * 60_000 },
} as const;

const input = z.object({
  senderName: z.string().trim().min(1, "Enter your name.").max(80),
  subject: z.string().trim().min(1, "Enter a subject line.").max(150),
  note: z.string().trim().max(2000).optional().or(z.literal("")),
  audience: z.enum(["ALL", "RECENT", "NO_ADVERT"]).default("ALL"),
});

async function spentSeekerSegmentIds(): Promise<string[]> {
  const prepared = await db.auditLog.findMany({
    where: { action: PREPARED, targetType: "Broadcast" },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { targetId: true, metadata: true },
  });
  const ids = prepared.map((row) => row.targetId).filter((id): id is string => Boolean(id));
  if (!ids.length) return [];
  const sent = new Set(
    (await db.auditLog.findMany({ where: { action: SENT, targetType: "Broadcast", targetId: { in: ids } }, select: { targetId: true } })).map((row) => row.targetId),
  );
  return prepared.flatMap((row) => {
    const segmentId = (row.metadata as { segmentId?: unknown } | null)?.segmentId;
    return row.targetId && sent.has(row.targetId) && typeof segmentId === "string" ? [segmentId] : [];
  });
}

const appUrl = () => (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

/**
 * The "About RoomsNow" mailshot to people looking for a room. Same flow as
 * the provider mailshot: Prepare creates a Resend Broadcast draft (Resend
 * handles unsubscribes, suppression and throttling), then a separate
 * confirmation sends it. "Send me a test" emails just the admin.
 */
export async function sendSeekerMailshot(_previous: FormState, form: FormData): Promise<FormState> {
  const actor = await requireAdmin();
  const operation = form.get("operation");

  if (operation === "send-prepared") {
    const ids = z
      .object({ broadcastId: z.string().uuid(), importId: z.string().uuid() })
      .safeParse({ broadcastId: form.get("broadcastId"), importId: form.get("importId") });
    if (!ids.success) return { ok: false, errors: { form: "That prepared campaign is no longer valid. Prepare it again." } };
    const preparedAudit = await db.auditLog.findFirst({
      where: { action: PREPARED, targetType: "Broadcast", targetId: ids.data.broadcastId },
      orderBy: { createdAt: "desc" },
      select: { metadata: true },
    });
    if ((preparedAudit?.metadata as { importId?: unknown } | null)?.importId !== ids.data.importId) {
      return { ok: false, errors: { form: "RoomsNow could not verify that prepared campaign. Prepare it again." } };
    }
    const sendKey = `admin-seeker-broadcast-send:${actor.id}`;
    const limit = await rateLimit(sendKey, CAMPAIGN_LIMITS.send);
    if (!limit.ok) return { ok: false, errors: { form: "Please wait before sending another campaign." }, ...ids.data };
    try {
      const result = await sendPreparedMarketingBroadcast(ids.data);
      if (!result.sent) {
        await refundRateLimit(sendKey);
        return {
          ok: false,
          message: `Resend is still ${result.status === "pending" ? "queuing" : "processing"} the contact list. Wait a moment, then press Send again.`,
          ...ids.data,
        };
      }
      await db.auditLog.create({
        data: { actorId: actor.id, action: SENT, targetType: "Broadcast", targetId: ids.data.broadcastId, metadata: { importId: ids.data.importId, importCounts: result.counts ?? null } },
      });
      return { ok: true, message: "Sent to Resend. It will be delivered gradually; you can follow opens, bounces and unsubscribes in Resend Broadcasts." };
    } catch (error) {
      console.error("Seeker broadcast send failed", error);
      await refundRateLimit(sendKey);
      return { ok: false, errors: { form: error instanceof Error ? error.message : "Could not send the campaign." }, ...ids.data };
    }
  }

  const parsed = input.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, errors: { form: parsed.error.issues[0]?.message ?? "Check the form and try again." } };
  const { senderName, subject, note, audience } = parsed.data;
  const html = renderSeekerAboutEmail({ mode: "broadcast", appUrl: appUrl(), note: note || undefined, senderName });
  const text = renderSeekerAboutText({ mode: "broadcast", appUrl: appUrl(), note: note || undefined, senderName });

  if (operation === "test") {
    const testKey = `admin-seeker-broadcast-test:${actor.id}`;
    const limit = await rateLimit(testKey, CAMPAIGN_LIMITS.test);
    if (!limit.ok) return { ok: false, errors: { form: "That's a lot of test emails. Try again in a little while." } };
    // Fill the merge tags the way Resend would for this one reader.
    const personalise = (value: string) =>
      value.replaceAll("{{{FIRST_NAME|there}}}", actor.firstName || "there").replaceAll("{{{RESEND_UNSUBSCRIBE_URL}}}", `${appUrl()}/dashboard/settings`);
    try {
      await sendEmail({ to: actor.email, subject: `[Test] ${subject}`, html: personalise(html), text: personalise(text) });
      return { ok: true, message: `Test sent to ${actor.email}. Nothing went to anyone else.` };
    } catch (error) {
      await refundRateLimit(testKey);
      return { ok: false, errors: { form: error instanceof Error ? error.message : "Could not send the test email." } };
    }
  }

  const recipients = await db.user.findMany({
    where: seekerAudienceWhere(audience),
    select: { email: true, firstName: true, lastName: true },
    take: MAX_RECIPIENTS + 1,
  });
  if (recipients.length === 0) return { ok: false, errors: { form: "Nobody matches that audience yet." } };
  if (recipients.length > MAX_RECIPIENTS) return { ok: false, errors: { form: `That's over ${MAX_RECIPIENTS} people. Choose a narrower audience.` } };

  const prepareKey = `admin-seeker-broadcast-prepare:${actor.id}`;
  const limit = await rateLimit(prepareKey, CAMPAIGN_LIMITS.prepare);
  if (!limit.ok) return { ok: false, errors: { form: "Please wait before preparing another campaign." } };

  try {
    const prepared = await prepareMarketingBroadcast({
      campaignName: `People looking — ${subject}`,
      recipients,
      subject,
      html,
      text,
      spentSegmentIds: await spentSeekerSegmentIds(),
    });
    await db.auditLog.create({
      data: {
        actorId: actor.id,
        action: PREPARED,
        targetType: "Broadcast",
        targetId: prepared.broadcastId,
        metadata: { ...prepared, subject, senderName, audience, recipientCount: recipients.length },
      },
    });
    return {
      ok: true,
      message: `Prepared a draft for ${recipients.length} ${recipients.length === 1 ? "person" : "people"}. Nothing has been sent yet. Confirm below once the contact list is ready.`,
      broadcastId: prepared.broadcastId,
      importId: prepared.importId,
    };
  } catch (error) {
    console.error("Seeker broadcast preparation failed", error);
    await refundRateLimit(prepareKey);
    return { ok: false, errors: { form: error instanceof Error ? error.message : "Could not prepare the campaign." } };
  }
}
