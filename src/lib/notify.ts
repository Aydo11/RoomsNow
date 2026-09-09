import "server-only";
import { db } from "./db";
import { escapeHtml, renderEmail } from "./email-template";
import type { NotificationType } from "@prisma/client";

/**
 * In-app notifications always write to the database. Email/SMS go through
 * adapters so no provider is baked in.
 *
 * Env: EMAIL_DRIVER=console|resend|ses, RESEND_API_KEY, EMAIL_FROM,
 *      SMS_DRIVER=console|twilio, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM
 */
export async function notify(params: {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  href?: string;
  email?: boolean;
}) {
  const notification = await db.notification.create({
    data: {
      userId: params.userId,
      type: params.type,
      title: params.title,
      body: params.body,
      href: params.href,
    },
  });

  if (params.email) {
    const user = await db.user.findUnique({ where: { id: params.userId }, select: { email: true } });
    if (user) {
      const appUrl = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
      const ctaUrl = params.href ? `${appUrl}${params.href}` : undefined;
      await sendEmail({
        to: user.email,
        subject: params.title,
        text: [params.body ?? params.title, ctaUrl].filter(Boolean).join("\n\n"),
        html: renderEmail({
          preheader: params.body ?? params.title,
          heading: params.title,
          bodyHtml: params.body ? `<p style="margin:0;">${escapeHtml(params.body)}</p>` : "",
          ...(ctaUrl ? { ctaLabel: "View in RoomsNow", ctaUrl } : {}),
        }),
      });
    }
  }

  return notification;
}

/** Notify every staff member of a company. */
export async function notifyCompany(companyId: string, params: Omit<Parameters<typeof notify>[0], "userId">) {
  const staff = await db.companyStaff.findMany({ where: { companyId }, select: { userId: true } });
  await Promise.all(staff.map((s) => notify({ ...params, userId: s.userId })));
}

export async function sendEmail(msg: { to: string; subject: string; text: string; html?: string }) {
  const driver = process.env.EMAIL_DRIVER ?? "console";
  if (driver === "console") {
    console.info(`[email:${msg.to}] ${msg.subject}\n${msg.text}`);
    return;
  }
  if (driver === "resend") {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM;
    if (!apiKey || !from) throw new Error("RESEND_API_KEY and EMAIL_FROM are required for email delivery.");
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [msg.to], subject: msg.subject, text: msg.text, html: msg.html }),
    });
    if (!response.ok) throw new Error(`Email delivery failed with status ${response.status}.`);
    return;
  }
  // SES can be added behind the same interface when needed.
  throw new Error(`Email driver "${driver}" is not implemented. See src/lib/notify.ts.`);
}

export async function sendSms(msg: { to: string; text: string }) {
  const driver = process.env.SMS_DRIVER ?? "console";
  if (driver === "console") {
    console.info(`[sms:${msg.to}] ${msg.text}`);
    return;
  }
  throw new Error(`SMS driver "${driver}" is not implemented. See src/lib/notify.ts.`);
}
