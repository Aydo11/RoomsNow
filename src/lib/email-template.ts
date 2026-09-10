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

/**
 * Wider, multi-section marketing shell for one specific send: the pre-launch
 * provider invitation (see sendPreLaunchInvite in server/actions/marketing.ts).
 * Deliberately a separate builder from renderEmail rather than an extra mode
 * bolted onto it — renderEmail's shape (single heading, single CTA, ~480px)
 * is right for a transactional notice and wrong for a stat-led sales email
 * with several sections. Same table-based/inline-style approach for Outlook
 * compatibility, same palette, wider card (600px).
 */
export function renderPreLaunchInviteEmail(params: {
  /** First name only, already trusted (pulled from our own outreach list, not user input) — escaped anyway. */
  recipientName?: string;
  /** Whoever is sending this send — set from the admin form, so it can change per outreach batch. */
  senderName: string;
  ctaUrl: string;
}) {
  const { recipientName, senderName, ctaUrl } = params;
  const greeting = recipientName ? `Hi ${escapeHtml(recipientName)},` : "Hi,";
  const sender = escapeHtml(senderName);
  const stat = (value: string, label: string, source: string) => `
                    <td width="33.33%" valign="top" style="padding:16px 10px; text-align:center;">
                      <div style="font-size:26px; font-weight:700; color:${COLORS.pineDark}; letter-spacing:-0.01em;">${value}</div>
                      <div style="margin-top:4px; font-size:12.5px; line-height:1.45; color:${COLORS.inkSoft};">${label}</div>
                      <div style="margin-top:4px; font-size:11px; color:${COLORS.inkFaint};">${source}</div>
                    </td>`;
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${brand.name}</title>
  </head>
  <body style="margin:0; padding:0; background-color:${COLORS.paper}; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <span style="display:none; font-size:1px; color:${COLORS.paper}; line-height:1px; max-height:0; max-width:0; opacity:0; overflow:hidden;">We're opening RoomsNow to a small group of Birmingham providers before public launch — 3 months of Professional, free.</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${COLORS.paper};">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%; background-color:${COLORS.card}; border-radius:14px; border:1px solid ${COLORS.line};">
            <tr>
              <td style="padding:28px 40px 20px; border-bottom:1px solid ${COLORS.line};">
                <span style="font-size:20px; font-weight:700; color:${COLORS.pineDark}; letter-spacing:-0.01em;">${brand.name}</span>
                <span style="margin-left:10px; display:inline-block; padding:3px 10px; font-size:11px; font-weight:600; letter-spacing:0.04em; text-transform:uppercase; color:${COLORS.pineDark}; background-color:#EAF2FA; border-radius:999px;">Pre-launch invite</span>
              </td>
            </tr>

            <tr>
              <td style="padding:32px 40px 4px;">
                <h1 style="margin:0 0 14px; font-size:24px; line-height:1.3; color:${COLORS.ink};">One Birmingham housing voice to another: come and fill your rooms before we go live</h1>
                <p style="margin:0 0 14px; font-size:15px; line-height:1.65; color:${COLORS.inkSoft};">${greeting}</p>
                <p style="margin:0 0 14px; font-size:15px; line-height:1.65; color:${COLORS.inkSoft};">
                  I'm ${sender} — I've got years of hands-on experience in supported housing here
                  in Birmingham, so this isn't a platform cold-emailing you about something
                  abstract. I've seen the same voids you have, and I built ${brand.name} because I
                  was tired of watching good rooms sit empty over phone calls and whoever happened
                  to be free that week.
                </p>
                <p style="margin:0 0 4px; font-size:15px; line-height:1.65; color:${COLORS.inkSoft};">
                  Here's the size of the problem we're both dealing with:
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:6px 30px 6px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${COLORS.paper}; border-radius:12px;">
                  <tr>
                    ${stat("21,800+", "Housing Benefit claims tied to exempt/supported accommodation in Birmingham &mdash; the largest concentration of any UK city", "Birmingham City Council")}
                    ${stat("135,580", "households in temporary accommodation across England on 31 March 2026", "GOV.UK, Statutory Homelessness statistics")}
                    ${stat("83,850", "households newly assessed as needing homelessness help in Jan&ndash;Mar 2026 alone", "GOV.UK, Statutory Homelessness statistics")}
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:20px 40px 4px;">
                <p style="margin:0 0 14px; font-size:15px; line-height:1.65; color:${COLORS.inkSoft};">
                  That's not a shortage of rooms. It's a shortage of the right room finding the
                  right person quickly enough &mdash; and every day yours sits empty is a day of
                  lost income for you and a longer wait for someone who needs it. ${brand.name}
                  puts your available rooms in front of the referrers, case workers and housing
                  officers who are already searching by need, location and availability, instead
                  of relying on the same dozen phone numbers everyone else already has.
                </p>
                <p style="margin:0 0 14px; font-size:15px; line-height:1.65; color:${COLORS.inkSoft};">
                  We haven't opened to the public yet. Before we do, I want a small group of real
                  Birmingham providers on the site first &mdash; not early sign-ups, actual rooms.
                  We're already building toward the traffic that lands at public launch (SEO,
                  council-facing work, local press), and providers listed before that traffic
                  arrives are the ones best placed to benefit from it when it does. Join now and
                  you're one of the first live adverts on ${brand.name}, not the four-hundredth.
                </p>
                <p style="margin:0 0 4px; font-size:15px; line-height:1.65; color:${COLORS.inkSoft};">
                  None of that matters without providers who actually do the job &mdash; housing
                  someone who needs support, not just square footage. Every advert you put on
                  ${brand.name} is a faster route from your void to somebody's placement. That's
                  the whole point of building this, and it's why I'd rather have ten honest
                  providers on it early than a hundred generic sign-ups once we're live.
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:20px 30px 8px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#EAF2FA; border:1px solid #CFE1F2; border-radius:12px;">
                  <tr>
                    <td style="padding:22px 26px;">
                      <p style="margin:0 0 6px; font-size:12px; font-weight:700; letter-spacing:0.04em; text-transform:uppercase; color:${COLORS.pineDark};">Founding-provider offer</p>
                      <p style="margin:0 0 10px; font-size:18px; line-height:1.4; color:${COLORS.ink}; font-weight:600;">3 months of Professional, free &mdash; worth &pound;147</p>
                      <p style="margin:0; font-size:14.5px; line-height:1.6; color:${COLORS.inkSoft};">
                        Up to 15 live adverts with unlimited rooms per property, full advert
                        analytics, priority placement and one free promoted slot a month. No card
                        needed to try it, and no obligation to stay on once the 3 months are up.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:14px 40px 8px;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="border-radius:8px; background-color:${COLORS.pine};">
                      <a href="${ctaUrl}" style="display:inline-block; padding:13px 30px; font-size:15px; font-weight:600; color:#FFFFFF; text-decoration:none; border-radius:8px;">Claim your free 3 months</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:10px 40px 4px;">
                <p style="margin:0; font-size:13px; line-height:1.6; color:${COLORS.inkFaint};">
                  Sign up as a provider and reply to this email &mdash; I'm upgrading pre-launch
                  accounts to Professional by hand, so there's nothing to pay and nothing to
                  cancel later. If the button doesn't work, copy this link instead:<br />
                  <a href="${ctaUrl}" style="color:${COLORS.pine}; word-break:break-all;">${ctaUrl}</a>
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:24px 40px 8px;">
                <p style="margin:0; font-size:14.5px; line-height:1.65; color:${COLORS.inkSoft};">
                  ${sender}
                </p>
                <p style="margin:14px 0 0; font-size:13px; line-height:1.6; color:${COLORS.inkFaint}; font-style:italic;">
                  P.S. This is genuinely new, not a rebrand of something established &mdash; so
                  what you tell us in the first few weeks will shape what providers see for years
                  after. That's worth more to us than a bigger list right now.
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:20px 40px 28px;">
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

/** Plain-text fallback for renderPreLaunchInviteEmail, for email clients that don't render HTML. */
export function renderPreLaunchInviteText(params: { recipientName?: string; senderName: string; ctaUrl: string }) {
  const { recipientName, senderName, ctaUrl } = params;
  const greeting = recipientName ? `Hi ${recipientName},` : "Hi,";
  return `${greeting}

I'm ${senderName} — I've got years of hands-on experience in supported housing here in Birmingham, so this isn't a platform cold-emailing you about something abstract. I've seen the same voids you have, and I built ${brand.name} because I was tired of watching good rooms sit empty over phone calls and whoever happened to be free that week.

The size of the problem we're both dealing with:
- 21,800+ Housing Benefit claims tied to exempt/supported accommodation in Birmingham — the largest concentration of any UK city (Birmingham City Council)
- 135,580 households in temporary accommodation across England on 31 March 2026 (GOV.UK)
- 83,850 households newly assessed as needing homelessness help in Jan-Mar 2026 alone (GOV.UK)

That's not a shortage of rooms. It's a shortage of the right room finding the right person quickly enough — and every day yours sits empty is lost income for you and a longer wait for someone who needs it. ${brand.name} puts your available rooms in front of the referrers, case workers and housing officers already searching by need, location and availability.

We haven't opened to the public yet. Before we do, I want a small group of real Birmingham providers on the site first. We're already building toward the traffic that lands at public launch, and providers listed before that traffic arrives are the ones best placed to benefit from it. Join now and you're one of the first live adverts on ${brand.name}, not the four-hundredth.

None of that matters without providers who actually do the job — housing someone who needs support, not just square footage. Every advert you put on ${brand.name} is a faster route from your void to somebody's placement.

FOUNDING-PROVIDER OFFER: 3 months of Professional, free — worth £147. Up to 15 live adverts with unlimited rooms per property, full advert analytics, priority placement and one free promoted slot a month. No card needed, no obligation to stay on afterwards.

Claim your free 3 months: ${ctaUrl}

Sign up as a provider and reply to this email — I'm upgrading pre-launch accounts to Professional by hand, so there's nothing to pay and nothing to cancel later.

${senderName}

P.S. This is genuinely new, not a rebrand of something established — so what you tell us in the first few weeks will shape what providers see for years after. That's worth more to us than a bigger list right now.

---
${brand.name} · ${brand.tagline}
Questions? Email ${brand.supportEmail}`;
}
