import { requireAdmin } from "@/lib/rbac";
import { renderEmail } from "@/lib/email-template";

/** Read-only sample of the shared notification layout; never sends mail. */
export async function GET() {
  await requireAdmin();
  const app = (process.env.APP_URL ?? "https://www.roomsnow.co.uk").replace(/\/$/, "");
  return new Response(renderEmail({
    preheader: "Keep your advertised room availability up to date.",
    heading: "Still available?",
    bodyHtml: '<p style="margin:0;">It has been a few weeks since your advert was last confirmed. Confirm that the room is still available, or pause your advert if it has been let.</p><p style="margin:16px 0 0;">Keeping availability up to date helps people and referrers find rooms they can enquire about.</p>',
    ctaLabel: "Review my adverts",
    ctaUrl: `${app}/provider/adverts`,
    note: "Design preview only. No email has been sent and no advert has been changed.",
  }), { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex, nofollow" } });
}
