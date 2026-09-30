import { requireAdmin } from "@/lib/rbac";
import { renderSeekerAboutEmail } from "@/lib/email-template";

export const dynamic = "force-dynamic";

/**
 * The "About RoomsNow" email exactly as it will be sent, for the admin
 * preview and as a download (?download=1) for sending from another tool.
 * Merge tags ({{{FIRST_NAME|there}}}, {{{RESEND_UNSUBSCRIBE_URL}}}) are
 * left in for downloads and filled with sample values for the preview.
 */
export async function GET(request: Request) {
  await requireAdmin();
  const url = new URL(request.url);
  const note = (url.searchParams.get("note") ?? "").slice(0, 2000).trim() || undefined;
  const senderName = (url.searchParams.get("senderName") ?? "").slice(0, 80).trim() || undefined;
  const download = url.searchParams.get("download") === "1";
  const appUrl = (process.env.APP_URL ?? url.origin).replace(/\/$/, "");
  let html = renderSeekerAboutEmail({ mode: "broadcast", appUrl, note, senderName });
  if (!download) {
    html = html.replaceAll("{{{FIRST_NAME|there}}}", "Sam").replaceAll("{{{RESEND_UNSUBSCRIBE_URL}}}", "#");
  }
  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "x-robots-tag": "noindex",
      ...(download ? { "content-disposition": 'attachment; filename="roomsnow-about-email.html"' } : {}),
    },
  });
}
