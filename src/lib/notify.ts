import "server-only";
import { db } from "./db";
import { escapeHtml, renderEmail } from "./email-template";
import { pushToUser } from "./web-push";
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

  // Phone/browser notification for anyone who turned them on. Not awaited:
  // a slow push service must never hold up the action that caused this.
  void pushToUser(params.userId, {
    title: params.title,
    body: params.body,
    url: params.href ?? "/dashboard/notifications",
    tag: notification.id,
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

export async function sendEmail(msg: { to: string; subject: string; text: string; html?: string; replyTo?: string; attachments?: { filename: string; content: Buffer }[] }) {
  const driver = process.env.EMAIL_DRIVER ?? "console";
  if (driver === "console") {
    console.info(`[email:${msg.to}] ${msg.subject}${msg.attachments?.length ? ` (+${msg.attachments.map((a) => a.filename).join(", ")})` : ""}\n${msg.text}`);
    return;
  }
  if (driver === "resend") {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM;
    if (!apiKey || !from) throw new Error("RESEND_API_KEY and EMAIL_FROM are required for email delivery.");
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [msg.to], subject: msg.subject, text: msg.text, html: msg.html ?? renderEmail({ preheader: msg.subject, heading: escapeHtml(msg.subject), bodyHtml: `<div style="white-space:pre-line;">${escapeHtml(msg.text)}</div>` }), ...(msg.replyTo ? { reply_to: msg.replyTo } : {}), ...(msg.attachments?.length ? { attachments: msg.attachments.map((a) => ({ filename: a.filename, content: a.content.toString("base64") })) } : {}) }),
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
  if (driver === "twilio") {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_FROM;
    if (!sid || !token || !from) throw new Error("TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_FROM are required for SMS.");
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: msg.to, From: from, Body: msg.text }).toString(),
    });
    if (!response.ok) throw new Error(`SMS delivery failed with status ${response.status}.`);
    return;
  }
  throw new Error(`SMS driver "${driver}" is not implemented. See src/lib/notify.ts.`);
}

/**
 * WhatsApp through Twilio. Business-started messages must use templates
 * approved by Meta, so each message names a Twilio Content template and fills
 * its {{1}}, {{2}}… variables.
 * Env: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM (+44…),
 *      TWILIO_WA_CONFIRM_SID (room alert confirm), TWILIO_WA_ALERT_SID (new room alert).
 */
export const whatsappEnabled = () =>
  Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_WHATSAPP_FROM && process.env.TWILIO_WA_CONFIRM_SID && process.env.TWILIO_WA_ALERT_SID);

export async function sendWhatsapp(msg: { to: string; contentSid: string; variables: Record<string, string> }) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;
  if (!sid || !token || !from) throw new Error("TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_WHATSAPP_FROM are required for WhatsApp.");
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      To: `whatsapp:${msg.to}`,
      From: `whatsapp:${from.replace(/^whatsapp:/, "")}`,
      ContentSid: msg.contentSid,
      ContentVariables: JSON.stringify(msg.variables),
    }).toString(),
  });
  if (!response.ok) throw new Error(`WhatsApp delivery failed with status ${response.status}.`);
}
