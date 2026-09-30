import { z } from "zod";
import { requireAdmin } from "@/lib/rbac";
import { renderPreLaunchInviteEmail, renderProviderMailshotEmail, renderSeekerAboutEmail } from "@/lib/email-template";

export const dynamic = "force-dynamic";

const text = (max: number) => z.string().max(max).optional().default("");

const schema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("seeker"), senderName: text(80), note: text(2000) }),
  z.object({
    type: z.literal("provider"),
    kind: z.enum(["PROMO", "NEWS", "CUSTOM"]).default("NEWS"),
    senderName: text(80),
    subject: text(150),
    body: text(5000),
    promoCode: text(40),
    promoBlurb: text(200),
    ctaLabel: text(40),
    ctaUrl: text(300),
  }),
  z.object({ type: z.literal("prelaunch"), senderName: text(80), firstName: text(80) }),
]);

/**
 * Renders an admin mailshot exactly as recipients will get it, from the
 * form's current (unsaved) values, for the live preview beside each form.
 * Resend's merge tags are filled with sample values so links look real.
 */
export async function POST(request: Request) {
  await requireAdmin();
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return new Response("Invalid preview request", { status: 400 });
  const data = parsed.data;
  const appUrl = (process.env.APP_URL ?? new URL(request.url).origin).replace(/\/$/, "");
  const sender = data.senderName.trim() || "Ayden";

  let html: string;
  if (data.type === "seeker") {
    html = renderSeekerAboutEmail({ mode: "broadcast", appUrl, senderName: sender, note: data.note.trim() || undefined });
  } else if (data.type === "provider") {
    const cta = data.ctaUrl.trim();
    html = renderProviderMailshotEmail({
      kind: data.kind,
      senderName: sender,
      heading: data.subject.trim() || "Your subject line",
      bodyText: data.body.trim() || "Your message will appear here.",
      promoCode: data.kind === "PROMO" ? data.promoCode.trim() || "YOURCODE" : undefined,
      promoBlurb: data.kind === "PROMO" ? data.promoBlurb.trim() || undefined : undefined,
      ctaLabel: data.ctaLabel.trim() || "View in RoomsNow",
      ctaUrl: cta ? (/^https?:\/\//.test(cta) ? cta : `${appUrl}${cta.startsWith("/") ? "" : "/"}${cta}`) : `${appUrl}/dashboard`,
    });
  } else {
    html = renderPreLaunchInviteEmail({
      recipientName: data.firstName.trim() || undefined,
      senderName: sender,
      ctaUrl: `${appUrl}/register?type=PROVIDER&src=EMAIL`,
    });
  }

  html = html.replaceAll("{{{FIRST_NAME|there}}}", "Sam").replaceAll("{{{RESEND_UNSUBSCRIBE_URL}}}", "#");
  return new Response(html, {
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex" },
  });
}
