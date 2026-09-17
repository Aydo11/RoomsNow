"use server";

import { z } from "zod";
import { AccountStatus, Prisma, VerificationStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/rbac";
import { rateLimit } from "@/lib/rate-limit";
import { mailshotRecipientEmails } from "@/lib/audit";
import { renderProviderMailshotEmail, renderProviderMailshotText } from "@/lib/email-template";
import { prepareMarketingBroadcast, sendPreparedMarketingBroadcast } from "@/lib/resend-marketing";
import type { FormState } from "@/lib/validation";

/** A server-side safety rail for the campaign-specific Resend segment. */
const MAX_RECIPIENTS = 500;

const input = z.object({
  kind: z.enum(["PROMO", "NEWS"]),
  senderName: z.string().trim().min(1, "Enter your name.").max(80),
  subject: z.string().trim().min(1, "Enter a subject line.").max(150),
  body: z.string().trim().min(1, "Enter a message.").max(5000),
  promoCode: z.string().trim().max(40).optional().or(z.literal("")),
  promoBlurb: z.string().trim().max(200).optional().or(z.literal("")),
  ctaLabel: z.string().trim().max(40).optional().or(z.literal("")),
  ctaUrl: z.string().trim().max(300).optional().or(z.literal("")),
  status: z.string().optional().or(z.literal("")),
  verification: z.string().optional().or(z.literal("")),
  source: z.string().optional().or(z.literal("")),
});

/**
 * The provider Broadcast flow — reaches providers who already have an
 * account, unlike sendPreLaunchInvite (marketing.ts) which reaches people
 * who haven't signed up yet. One form, one action; the "kind" picked on
 * the admin tab UI decides whether the promo-code block renders. The
 * recipient set is whatever the /admin/provider-mailshot filters (status,
 * verification, source) resolve to at send time — passed through as
 * hidden fields so the batch matches what the admin saw on screen. Preparing
 * and sending are separate actions because contact imports complete asynchronously.
 */
export async function sendProviderMailshot(_previous: FormState, form: FormData): Promise<FormState> {
  const actor = await requireAdmin();

  if (form.get("operation") === "send-prepared") {
    const ids = z
      .object({ broadcastId: z.string().uuid(), importId: z.string().uuid() })
      .safeParse({ broadcastId: form.get("broadcastId"), importId: form.get("importId") });
    if (!ids.success) return { ok: false, errors: { form: "That prepared campaign is no longer valid. Prepare it again." } };
    const preparedAudit = await db.auditLog.findFirst({
      where: { action: "admin.provider_broadcast_prepared", targetType: "Broadcast", targetId: ids.data.broadcastId },
      orderBy: { createdAt: "desc" },
      select: { metadata: true },
    });
    const preparedMetadata = preparedAudit?.metadata as { importId?: unknown } | null | undefined;
    if (preparedMetadata?.importId !== ids.data.importId) {
      return { ok: false, errors: { form: "RoomsNow could not verify that prepared campaign. Prepare it again." } };
    }
    const limit = await rateLimit(`admin-provider-broadcast-send:${actor.id}`, { limit: 5, windowMs: 60 * 60_000 });
    if (!limit.ok) return { ok: false, errors: { form: "Please wait before sending another provider campaign." }, ...ids.data };
    try {
      const result = await sendPreparedMarketingBroadcast(ids.data);
      if (!result.sent) {
        return {
          ok: false,
          message: `Resend is still ${result.status === "pending" ? "queuing" : "processing"} the contact list. Wait a moment, then press Send campaign again.`,
          ...ids.data,
        };
      }
      await db.auditLog.create({
        data: {
          actorId: actor.id,
          action: "admin.provider_broadcast_sent",
          targetType: "Broadcast",
          targetId: ids.data.broadcastId,
          metadata: { importId: ids.data.importId, importCounts: result.counts ?? null },
        },
      });
      return { ok: true, message: "Campaign handed to Resend. It will be queued and throttled automatically; monitor delivery, bounces and complaints in Resend Broadcasts." };
    } catch (error) {
      console.error("Provider broadcast send failed", error);
      return { ok: false, errors: { form: error instanceof Error ? error.message : "Could not send the prepared campaign." }, ...ids.data };
    }
  }

  const parsed = input.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, errors: { form: parsed.error.issues[0]?.message ?? "Check the form and try again." } };
  const { kind, senderName, subject, body, promoCode, promoBlurb, ctaLabel, ctaUrl, status, verification, source } = parsed.data;

  if (kind === "PROMO" && !promoCode) {
    return { ok: false, errors: { promoCode: "Enter a promo code for a promotional send.", form: "Enter a promo code." } };
  }

  const statusValue = status && Object.values(AccountStatus).includes(status as AccountStatus) ? (status as AccountStatus) : "ACTIVE";
  const verificationValue =
    verification && Object.values(VerificationStatus).includes(verification as VerificationStatus) ? (verification as VerificationStatus) : undefined;
  const sourceValue = source === "MAILSHOT" || source === "ORGANIC" ? source : undefined;

  const where: Prisma.CompanyWhereInput = {
    status: statusValue,
    ...(verificationValue ? { verification: verificationValue } : {}),
  };
  if (sourceValue) {
    const mailshotEmails = await mailshotRecipientEmails();
    if (sourceValue === "MAILSHOT") where.email = { in: Array.from(mailshotEmails) };
    if (sourceValue === "ORGANIC") where.email = { notIn: Array.from(mailshotEmails) };
  }

  const providers = await db.company.findMany({
    where,
    select: { email: true },
    take: MAX_RECIPIENTS + 1,
  });

  if (providers.length === 0) return { ok: false, errors: { form: "No providers match that filter." } };
  if (providers.length > MAX_RECIPIENTS) {
    return { ok: false, errors: { form: `That's over ${MAX_RECIPIENTS} providers — narrow the status/verification/source filter before sending.` } };
  }

  const appUrl = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const finalCtaUrl = ctaUrl ? (/^https?:\/\//.test(ctaUrl) ? ctaUrl : `${appUrl}${ctaUrl.startsWith("/") ? "" : "/"}${ctaUrl}`) : `${appUrl}/dashboard`;
  const finalCtaLabel = ctaLabel || "View in RoomsNow";

  const limit = await rateLimit(`admin-provider-broadcast-prepare:${actor.id}`, { limit: 3, windowMs: 60 * 60_000 });
  if (!limit.ok) return { ok: false, errors: { form: "Please wait before preparing another provider campaign." } };

  const text = renderProviderMailshotText({
    senderName,
    bodyText: body,
    promoCode: kind === "PROMO" ? promoCode || undefined : undefined,
    promoBlurb: kind === "PROMO" ? promoBlurb || undefined : undefined,
    ctaLabel: finalCtaLabel,
    ctaUrl: finalCtaUrl,
  });
  const html = renderProviderMailshotEmail({
    kind,
    senderName,
    heading: subject,
    bodyText: body,
    promoCode: kind === "PROMO" ? promoCode || undefined : undefined,
    promoBlurb: kind === "PROMO" ? promoBlurb || undefined : undefined,
    ctaLabel: finalCtaLabel,
    ctaUrl: finalCtaUrl,
  });

  try {
    const prepared = await prepareMarketingBroadcast({
      campaignName: `Registered providers — ${subject}`,
      recipients: providers,
      subject,
      html,
      text,
    });
    await db.auditLog.create({
      data: {
        actorId: actor.id,
        action: "admin.provider_broadcast_prepared",
        targetType: "Broadcast",
        targetId: prepared.broadcastId,
        metadata: {
          ...prepared,
          kind,
          subject,
          senderName,
          recipientCount: providers.length,
          filters: { status: statusValue, verification: verificationValue ?? null, source: sourceValue ?? null },
        },
      },
    });
    return {
      ok: true,
      message: `Prepared a Resend draft for ${providers.length} provider${providers.length === 1 ? "" : "s"}. No email has been sent. Confirm below once the contact import is ready.`,
      broadcastId: prepared.broadcastId,
      importId: prepared.importId,
      recipientCount: providers.length,
    };
  } catch (error) {
    console.error("Provider broadcast preparation failed", error);
    return { ok: false, errors: { form: error instanceof Error ? error.message : "Could not prepare the provider campaign." } };
  }
}
