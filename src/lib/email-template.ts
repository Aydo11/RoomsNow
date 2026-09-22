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

/**
 * Absolute URL to the PNG wordmark used in email headers. A flattened PNG
 * (not the site's SVG) because Outlook desktop and several other clients
 * don't render inline SVG reliably; hosted rather than embedded as a data
 * URI because Outlook desktop also drops those, and a hosted image survives
 * a "show images" click the way a data URI can't.
 */
const APP_URL = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
const LOGO_URL = `${APP_URL}/brand/roomsnow-logo-email.png`;
const RESEND_UNSUBSCRIBE_URL = "{{{RESEND_UNSUBSCRIBE_URL}}}";

function marketingUnsubscribeHtml(reason: string) {
  return `<p style="margin:12px 0 0; font-size:11px; line-height:1.6; color:${COLORS.inkFaint};">
                    ${reason} You can <a href="${RESEND_UNSUBSCRIBE_URL}" style="color:${COLORS.inkFaint}; text-decoration:underline;">unsubscribe from RoomsNow marketing emails</a> at any time.
                  </p>`;
}

/** Email-header logo — same markup wherever a template shows the wordmark. */
function logoImgHtml() {
  return `<img src="${LOGO_URL}" width="139" height="28" alt="${brand.name}" style="display:block; border:0; outline:none; text-decoration:none;" />`;
}

/** Escapes text pulled from user/company-supplied data before it goes into an HTML email. */
export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/**
 * Splits admin-typed plain text into paragraphs (blank line = new paragraph,
 * single newline = line break within one), escaping first so nothing in a
 * provider mailshot body can inject markup.
 */
function paragraphsHtml(text: string, color: string): string {
  return text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map(
      (block) =>
        `<p style="margin:0 0 14px; font-size:15px; line-height:1.65; color:${color};">${escapeHtml(block).replace(/\n/g, "<br />")}</p>`,
    )
    .join("");
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
                ${logoImgHtml()}
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
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${brand.name}</title>
  </head>
  <body style="margin:0; padding:0; background-color:${COLORS.paper}; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <span style="display:none; font-size:1px; color:${COLORS.paper}; line-height:1px; max-height:0; max-width:0; opacity:0; overflow:hidden;">Put your available rooms in front of people and professional referrers searching by need, location and live availability.</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${COLORS.paper};">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%; background-color:${COLORS.card}; border-radius:14px; border:1px solid ${COLORS.line};">
            <tr>
              <td style="padding:28px 40px 20px; border-bottom:1px solid ${COLORS.line};">
                ${logoImgHtml()}
                <span style="margin-left:10px; display:inline-block; padding:3px 10px; font-size:11px; font-weight:600; letter-spacing:0.04em; text-transform:uppercase; color:${COLORS.pineDark}; background-color:#EAF2FA; border-radius:999px;">Provider invitation</span>
              </td>
            </tr>

            <tr>
              <td style="padding:28px 40px 0;">
                <p style="margin:0; font-size:16px; font-weight:900; letter-spacing:0.045em; text-transform:uppercase; color:#C1440E;">FILL YOUR VOIDS NOW</p>
              </td>
            </tr>

            <tr>
              <td style="padding:8px 40px 4px;">
                <h1 style="margin:0 0 14px; font-size:26px; line-height:1.25; color:${COLORS.ink};">Make your available rooms easier to find</h1>
                <p style="margin:0 0 14px; font-size:15px; line-height:1.65; color:${COLORS.inkSoft};">${greeting}</p>
                <p style="margin:0 0 14px; font-size:15px; line-height:1.65; color:${COLORS.inkSoft};">
                  I&apos;m ${sender}. I built ${brand.name} after seeing suitable rooms sit empty while
                  referrers and people looking for accommodation struggled to find accurate,
                  up-to-date vacancies.
                </p>
                <p style="margin:0; font-size:15px; line-height:1.65; color:${COLORS.inkSoft};">
                  ${brand.name} gives providers one place to publish live availability and receive
                  relevant enquiries. People and professional referrers can search by location,
                  accommodation type and support need instead of relying on outdated lists and
                  repeated phone calls.
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:18px 30px 8px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${COLORS.paper}; border:1px solid ${COLORS.line}; border-radius:12px;">
                  <tr>
                    <td style="padding:20px 24px;">
                      <p style="margin:0 0 10px; font-size:13px; font-weight:800; letter-spacing:0.04em; text-transform:uppercase; color:${COLORS.pineDark};">What providers can do</p>
                      <p style="margin:0 0 8px; font-size:14.5px; line-height:1.55; color:${COLORS.inkSoft};">&#10003;&nbsp; Advertise HMOs, supported, transitional and adult social care accommodation</p>
                      <p style="margin:0 0 8px; font-size:14.5px; line-height:1.55; color:${COLORS.inkSoft};">&#10003;&nbsp; Show room-level availability, photos, video and eligibility information</p>
                      <p style="margin:0 0 8px; font-size:14.5px; line-height:1.55; color:${COLORS.inkSoft};">&#10003;&nbsp; Receive direct enquiries and professional referrals in one dashboard</p>
                      <p style="margin:0; font-size:14.5px; line-height:1.55; color:${COLORS.inkSoft};">&#10003;&nbsp; Build trust with due-diligence verification and approved accreditations</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:16px 40px 4px;">
                <p style="margin:0 0 14px; font-size:15px; line-height:1.65; color:${COLORS.inkSoft};">
                  It takes only a few minutes to create your provider profile and first advert.
                  There is no promise of a placement &mdash; but keeping accurate vacancies visible
                  gives the right referrers and applicants a clearer route to contact you.
                </p>
                <p style="margin:0; font-size:15px; line-height:1.65; color:${COLORS.inkSoft};">
                  We are inviting a limited group of providers to list before wider outreach begins,
                  so we can improve the service around real vacancies and genuine referral workflows.
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:20px 30px 8px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#EAF2FA; border:1px solid #CFE1F2; border-radius:12px;">
                  <tr>
                    <td style="padding:22px 26px;">
                      <p style="margin:0 0 6px; font-size:12px; font-weight:700; letter-spacing:0.04em; text-transform:uppercase; color:${COLORS.pineDark};">Founding-provider offer</p>
                      <p style="margin:0 0 10px; font-size:20px; line-height:1.4; color:${COLORS.ink}; font-weight:800;">1 month of Professional, free &mdash; worth &pound;49</p>
                      <p style="margin:0; font-size:14.5px; line-height:1.6; color:${COLORS.inkSoft};">
                        Publish up to 15 live adverts, manage room availability, receive enquiries
                        and referrals, view advert analytics and use one promoted slot. No card is
                        needed for the trial and there is no obligation to continue afterwards.
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
                      <a href="${ctaUrl}" style="display:inline-block; padding:13px 30px; font-size:15px; font-weight:700; color:#FFFFFF; text-decoration:none; border-radius:8px;">List your available rooms</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:10px 40px 4px;">
                <p style="margin:0; font-size:13px; line-height:1.6; color:${COLORS.inkFaint};">
                  Create a provider account and reply to this email after registering. We&apos;ll apply
                  the one-month Professional trial without asking for payment details. If the button
                  doesn&apos;t work, copy this link instead:<br />
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
                  P.S. If RoomsNow is not relevant to your organisation, you can unsubscribe below.
                  If it is, I&apos;d genuinely value your feedback on what would make vacancy and referral
                  management more useful for your team.
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
                  ${marketingUnsubscribeHtml("You are receiving this provider invitation because your organisation may offer accommodation relevant to RoomsNow users.")}
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
  return `FILL YOUR VOIDS NOW

${greeting}

I'm ${senderName}. I built ${brand.name} after seeing suitable rooms sit empty while referrers and people looking for accommodation struggled to find accurate, up-to-date vacancies.

${brand.name} gives providers one place to publish live availability and receive relevant enquiries. People and professional referrers can search by location, accommodation type and support need instead of relying on outdated lists and repeated phone calls.

WHAT PROVIDERS CAN DO
- Advertise HMOs, supported, transitional and adult social care accommodation
- Show room-level availability, photos, video and eligibility information
- Receive direct enquiries and professional referrals in one dashboard
- Build trust with due-diligence verification and approved accreditations

It takes only a few minutes to create your provider profile and first advert. There is no promise of a placement — but keeping accurate vacancies visible gives the right referrers and applicants a clearer route to contact you.

We are inviting a limited group of providers to list before wider outreach begins, so we can improve the service around real vacancies and genuine referral workflows.

FOUNDING-PROVIDER OFFER
1 month of Professional, free — worth £49. Publish up to 15 live adverts, manage room availability, receive enquiries and referrals, view advert analytics and use one promoted slot. No card is needed for the trial and there is no obligation to continue afterwards.

List your available rooms: ${ctaUrl}

Create a provider account and reply to this email after registering. We'll apply the one-month Professional trial without asking for payment details.

${senderName}

P.S. If RoomsNow is not relevant to your organisation, you can unsubscribe below. If it is, I'd genuinely value your feedback on what would make vacancy and referral management more useful for your team.

---
${brand.name} · ${brand.tagline}
Questions? Email ${brand.supportEmail}

You are receiving this provider invitation because your organisation may offer accommodation relevant to RoomsNow users.
Unsubscribe from RoomsNow marketing emails: ${RESEND_UNSUBSCRIBE_URL}`;
}

/**
 * The AIO provider mailshot (see sendProviderMailshot in
 * server/actions/provider-mailshot.ts) — reaches already-registered
 * providers, unlike renderPreLaunchInviteEmail above which reaches people
 * who haven't signed up yet. One shared shell for both of its "kinds":
 * a promo-code send shows the dashed-border code block, a news/update
 * send just skips it. Subject and body are admin-typed per send, so
 * everything user-supplied is escaped before it reaches the HTML.
 */
export function renderProviderMailshotEmail(params: {
  kind: "PROMO" | "NEWS" | "CUSTOM";
  recipientName?: string;
  senderName: string;
  heading: string;
  bodyText: string;
  promoCode?: string;
  promoBlurb?: string;
  ctaLabel: string;
  ctaUrl: string;
}) {
  const { kind, recipientName, senderName, heading, bodyText, promoCode, promoBlurb, ctaLabel, ctaUrl } = params;
  const greeting = recipientName ? `Hi ${escapeHtml(recipientName)},` : "Hi,";
  const sender = escapeHtml(senderName);
  const badgeLabel = kind === "PROMO" ? "Provider offer" : kind === "CUSTOM" ? "Provider update" : "Fill vacant rooms";
  const promoBlock =
    kind === "PROMO" && promoCode
      ? `<tr>
              <td style="padding:6px 30px 6px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#EAF2FA; border:1px solid #CFE1F2; border-radius:12px;">
                  <tr>
                    <td style="padding:20px 26px; text-align:center;">
                      ${promoBlurb ? `<p style="margin:0 0 10px; font-size:14.5px; line-height:1.6; color:${COLORS.inkSoft};">${escapeHtml(promoBlurb)}</p>` : ""}
                      <span style="display:inline-block; padding:10px 22px; font-size:18px; font-weight:700; letter-spacing:0.04em; color:${COLORS.pineDark}; background-color:#FFFFFF; border:1.5px dashed ${COLORS.pine}; border-radius:8px;">${escapeHtml(promoCode)}</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>`
      : "";
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${brand.name}</title>
  </head>
  <body style="margin:0; padding:0; background-color:${COLORS.paper}; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <span style="display:none; font-size:1px; color:${COLORS.paper}; line-height:1px; max-height:0; max-width:0; opacity:0; overflow:hidden;">${escapeHtml(heading)}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${COLORS.paper};">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px; width:100%; background-color:${COLORS.card}; border-radius:14px; border:1px solid ${COLORS.line};">
            <tr>
              <td style="padding:28px 36px 20px; border-bottom:1px solid ${COLORS.line};">
                ${logoImgHtml()}
                <span style="margin-left:10px; display:inline-block; padding:3px 10px; font-size:11px; font-weight:600; letter-spacing:0.04em; text-transform:uppercase; color:${COLORS.pineDark}; background-color:#EAF2FA; border-radius:999px;">${badgeLabel}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 36px 4px;">
                <h1 style="margin:0 0 14px; font-size:22px; line-height:1.3; color:${COLORS.ink};">${escapeHtml(heading)}</h1>
                <p style="margin:0 0 14px; font-size:15px; line-height:1.65; color:${COLORS.inkSoft};">${greeting}</p>
                ${paragraphsHtml(bodyText, COLORS.inkSoft)}
              </td>
            </tr>
            ${promoBlock}
            <tr>
              <td style="padding:12px 36px 8px;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="border-radius:8px; background-color:${COLORS.pine};">
                      <a href="${ctaUrl}" style="display:inline-block; padding:12px 28px; font-size:15px; font-weight:600; color:#FFFFFF; text-decoration:none; border-radius:8px;">${escapeHtml(ctaLabel)}</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 36px 4px;">
                <p style="margin:0; font-size:14.5px; line-height:1.65; color:${COLORS.inkSoft};">${sender}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 36px 28px;">
                <div style="border-top:1px solid ${COLORS.line}; padding-top:20px;">
                  <p style="margin:0; font-size:12px; line-height:1.6; color:${COLORS.inkFaint};">
                    ${brand.name} &middot; ${brand.tagline}<br />
                    Questions? Email <a href="mailto:${brand.supportEmail}" style="color:${COLORS.inkFaint};">${brand.supportEmail}</a>
                  </p>
                  ${marketingUnsubscribeHtml("You are receiving this because your organisation has a RoomsNow provider account.")}
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

/** Plain-text fallback for renderProviderMailshotEmail. */
export function renderProviderMailshotText(params: {
  recipientName?: string;
  senderName: string;
  bodyText: string;
  promoCode?: string;
  promoBlurb?: string;
  ctaLabel: string;
  ctaUrl: string;
}) {
  const { recipientName, senderName, bodyText, promoCode, promoBlurb, ctaLabel, ctaUrl } = params;
  const greeting = recipientName ? `Hi ${recipientName},` : "Hi,";
  const lines = [greeting, "", bodyText.trim()];
  if (promoCode) {
    lines.push("", promoBlurb || "Your code:", `CODE: ${promoCode}`);
  }
  lines.push(
    "",
    `${ctaLabel}: ${ctaUrl}`,
    "",
    senderName,
    "",
    "---",
    `${brand.name} · ${brand.tagline}`,
    `Questions? Email ${brand.supportEmail}`,
    "",
    "You are receiving this because your organisation has a RoomsNow provider account.",
    `Unsubscribe from RoomsNow marketing emails: ${RESEND_UNSUBSCRIBE_URL}`,
  );
  return lines.join("\n");
}
