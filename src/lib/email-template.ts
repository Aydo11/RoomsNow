import "server-only";
import { brand } from "@/brand.config";

/**
 * Shared visual shell for every transactional email RoomsNow sends
 * (verification, password reset, admin invites, and every system
 * notification that also emails — advert status, verification,
 * membership, referrals). Table-based layout with inline styles for
 * compatibility with clients that ignore <style> blocks (Outlook desktop
 * chief among them). Matches the site's pine/ink/paper palette defined in
 * tailwind.config.ts.
 */
const COLORS = {
  pine: "#1666AA",
  pineDark: "#0F4F87",
  ink: "#171F2E",
  inkSoft: "#445064",
  inkFaint: "#758196",
  paper: "#F6F8FB",
  card: "#FFFFFF",
  line: "#D9E2EC",
};

/** Escapes text pulled from user/company-supplied data before it goes into an HTML email. */
export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function renderEmail(params: {
  /** Hidden preview text shown next to the subject line in most inboxes. */
  preheader: string;
  heading: string;
  /** Body copy as HTML (plain text is fine — no need for <p> wrapping). Escape any user-supplied values first. */
  bodyHtml: string;
  /** Omit both to render a plain notice with no button (e.g. "your password was changed"). */
  ctaLabel?: string;
  ctaUrl?: string;
  /** Small muted note under the link, e.g. an expiry or ignore-this notice. */
  note?: string;
}) {
  const { preheader, heading, bodyHtml, ctaLabel, ctaUrl, note } = params;
  const hasCta = Boolean(ctaLabel && ctaUrl);
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${brand.name}</title>
  </head>
  <body style="margin:0; padding:0; background-color:${COLORS.paper}; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <span style="display:none; font-size:1px; color:${COLORS.paper}; line-height:1px; max-height:0; max-width:0; opacity:0; overflow:hidden;">${preheader}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${COLORS.paper};">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px; width:100%; background-color:${COLORS.card}; border-radius:14px; border:1px solid ${COLORS.line};">
            <tr>
              <td style="padding:28px 36px 20px; border-bottom:1px solid ${COLORS.line};">
                <span style="font-size:20px; font-weight:700; color:${COLORS.pineDark}; letter-spacing:-0.01em;">${brand.name}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 36px 8px;">
                <h1 style="margin:0 0 12px; font-size:22px; line-height:1.3; color:${COLORS.ink};">${heading}</h1>
                <div style="font-size:15px; line-height:1.6; color:${COLORS.inkSoft};">${bodyHtml}</div>
              </td>
            </tr>
            ${
              hasCta
                ? `<tr>
              <td style="padding:12px 36px 8px;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="border-radius:8px; background-color:${COLORS.pine};">
                      <a href="${ctaUrl}" style="display:inline-block; padding:12px 28px; font-size:15px; font-weight:600; color:#FFFFFF; text-decoration:none; border-radius:8px;">${ctaLabel}</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 36px 4px;">
                <p style="margin:0; font-size:13px; line-height:1.6; color:${COLORS.inkFaint};">
                  If the button doesn't work, copy and paste this link into your browser:<br />
                  <a href="${ctaUrl}" style="color:${COLORS.pine}; word-break:break-all;">${ctaUrl}</a>
                </p>
              </td>
            </tr>`
                : ""
            }
            ${
              note
                ? `<tr><td style="padding:16px 36px 0;"><p style="margin:0; font-size:13px; color:${COLORS.inkFaint};">${note}</p></td></tr>`
                : ""
            }
            <tr>
              <td style="padding:28px 36px 28px;">
                <div style="border-top:1px solid ${COLORS.line}; padding-top:20px;">
                  <p style="margin:0; font-size:12px; line-height:1.6; color:${COLORS.inkFaint};">
                    ${brand.name} &middot; ${brand.tagline}<br />
                    Questions? Email <a href="mailto:${brand.supportEmail}" style="color:${COLORS.inkFaint};">${brand.supportEmail}</a>
                  </p>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
