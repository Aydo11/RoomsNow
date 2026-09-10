"use server";

import { z } from "zod";
import { AccountStatus, Prisma, VerificationStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/rbac";
import { rateLimit } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/notify";
import { mailshotRecipientEmails } from "@/lib/audit";
import { renderProviderMailshotEmail, renderProviderMailshotText } from "@/lib/email-template";
import type { FormState } from "@/lib/validation";

/** A real safety rail, not a UI nicety, since this sends real email to real accounts. */
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
 * The AIO provider mailshot — reaches providers who already have an
 * account, unlike sendPreLaunchInvite (marketing.ts) which reaches people
 * who haven't signed up yet. One form, one action; the "kind" picked on
 * the admin tab UI decides whether the promo-code block renders. The
 * recipient set is whatever the /admin/provider-mailshot filters (status,
 * verification, source) resolve to at send time — passed through as
 * hidden fields so the batch matches what the admin saw on screen.
 */
export async function sendProviderMailshot(_previous: FormState, form: FormData): Promise<FormState> {
  const actor = await requireAdmin();

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

  let sent = 0;
  let failed = 0;
  let rateLimited = false;
  const sentTo: string[] = [];

  for (const provider of providers) {
    const limit = await rateLimit(`admin-provider-mailshot:${actor.id}`, { limit: MAX_RECIPIENTS, windowMs: 60 * 60_000 });
    if (!limit.ok) {
      rateLimited = true;
      break;
    }
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
      await sendEmail({ to: provider.email, subject, text, html });
      sent += 1;
      sentTo.push(provider.email);
    } catch (error) {
      console.error("Provider mailshot email failed:", provider.email, error);
      failed += 1;
    }
  }

  if (sent > 0) {
    await db.auditLog.create({
      data: {
        actorId: actor.id,
        action: "admin.provider_mailshot_sent",
        targetType: "Email",
        targetId: `${sent} recipients`,
        metadata: {
          kind,
          subject,
          senderName,
          recipientCount: sent,
          recipients: sentTo,
          filters: { status: statusValue, verification: verificationValue ?? null, source: sourceValue ?? null },
        },
      },
    });
  }

  if (sent === 0) return { ok: false, errors: { form: "Could not send to any providers. Please try again." } };

  const parts = [`Sent to ${sent} of ${providers.length} provider${providers.length === 1 ? "" : "s"}.`];
  if (failed > 0) parts.push(`${failed} failed to send.`);
  if (rateLimited) parts.push("Hit the hourly send limit partway through — send the rest again shortly.");
  return { ok: true, message: parts.join(" ") };
}
