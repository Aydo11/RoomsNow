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
 * Shared building blocks for the two wider marketing emails: the pre-launch
 * provider invitation and the provider mailshot. They use the same table-based,
 * inline-style approach as renderEmail, so Outlook desktop keeps the layout.
 * The <style> block only adds phone-width stacking, which clients that support
 * it (Apple Mail, the Gmail apps) will apply. Clients that ignore it still get
 * a clean 600px card.
 */
const MKT = {
  heroText: "#E8F2FC",
  heroMuted: "#BFDDF7",
  offerMuted: "#D6E8F8",
  offerLabel: "#9CC9F2",
  tint: "#E8F2FC",
  tintLine: "#CFE1F2",
  surfaceLine: "#DCE5EF",
  hairline: "#E4EAF1",
  serif: "Georgia, 'Times New Roman', serif",
  sans: "Arial, Helvetica, sans-serif",
};

function marketingDocument(params: {
  preheader: string;
  /** Small label in the logo bar, e.g. "Provider invitation". */
  badge: string;
  /** Pill above the hero headline. Already-safe HTML. */
  heroEyebrow?: string;
  /** Already-safe HTML. */
  heroTitle: string;
  /** Already-safe HTML. */
  heroIntro?: string;
  /** Pre-built <tr> rows for the body of the card. */
  rows: string;
  /** Why the recipient is getting this, shown with the unsubscribe link. */
  footerReason: string;
}) {
  const { preheader, badge, heroEyebrow, heroTitle, heroIntro, rows, footerReason } = params;
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="x-apple-disable-message-reformatting" />
    <meta name="color-scheme" content="light" />
    <meta name="supported-color-schemes" content="light" />
    <title>${brand.name}</title>
    <style>
      @media only screen and (max-width: 620px) {
        .mk-container { width: 100% !important; }
        .mk-px { padding-left: 22px !important; padding-right: 22px !important; }
        .mk-stack { display: block !important; width: 100% !important; padding-left: 0 !important; padding-right: 0 !important; }
        .mk-gap { padding-top: 12px !important; }
        .mk-offer-fig { display: block !important; width: auto !important; padding: 24px 24px 12px 24px !important; }
        .mk-offer-text { display: block !important; width: auto !important; padding: 0 24px 24px 24px !important; }
        .mk-h1 { font-size: 27px !important; line-height: 34px !important; }
        .mk-badge { display: none !important; }
      }
    </style>
  </head>
  <body style="margin:0; padding:0; background-color:${COLORS.paper};">
    <div style="display:none; max-height:0; overflow:hidden; mso-hide:all; font-size:1px; line-height:1px; color:${COLORS.paper};">${preheader}&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${COLORS.paper};">
      <tr>
        <td align="center" style="padding:28px 12px;">
          <table role="presentation" class="mk-container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px; max-width:600px; background-color:${COLORS.card}; border:1px solid ${COLORS.line}; border-radius:14px; overflow:hidden; font-family:${MKT.sans}; color:${COLORS.ink};">
            <tr>
              <td class="mk-px" style="padding:22px 40px; background-color:${COLORS.card};">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td valign="middle">${logoImgHtml()}</td>
                    <td class="mk-badge" align="right" valign="middle">
                      <span style="display:inline-block; padding:5px 12px; font-size:11px; font-weight:bold; letter-spacing:1.2px; text-transform:uppercase; color:${COLORS.pineDark}; background-color:${MKT.tint}; border-radius:999px;">${badge}</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td class="mk-px" style="background-color:${COLORS.pine}; padding:38px 40px 42px;">
                ${
                  heroEyebrow
                    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="border:2px solid #FFFFFF; border-radius:999px; padding:7px 16px; font-size:11px; font-weight:bold; letter-spacing:1.6px; text-transform:uppercase; color:#FFFFFF;">${heroEyebrow}</td></tr></table>`
                    : ""
                }
                <h1 class="mk-h1" style="margin:${heroEyebrow ? "22px" : "0"} 0 0; font-family:${MKT.serif}; font-size:32px; line-height:39px; font-weight:normal; color:#FFFFFF;">${heroTitle}</h1>
                ${heroIntro ? `<p style="margin:16px 0 0; font-size:16px; line-height:25px; color:${MKT.heroText};">${heroIntro}</p>` : ""}
              </td>
            </tr>
            ${rows}
            <tr>
              <td class="mk-px" style="background-color:${COLORS.paper}; border-top:1px solid ${MKT.hairline}; padding:22px 40px;">
                <p style="margin:0; font-size:12px; line-height:19px; color:${COLORS.inkFaint};">
                  ${brand.name} &middot; ${brand.tagline}<br />
                  Questions? Email <a href="mailto:${brand.supportEmail}" style="color:${COLORS.inkFaint};">${brand.supportEmail}</a>
                </p>
                ${marketingUnsubscribeHtml(footerReason)}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/** A body row. `top` is the space above it in px. */
function mkRow(inner: string, top = 28) {
  return `<tr>
              <td class="mk-px" style="padding:${top}px 40px 0;">
                ${inner}
              </td>
            </tr>`;
}

function mkParagraph(html: string, first = false) {
  return `<p style="margin:${first ? "0" : "14px"} 0 0; font-size:15px; line-height:24px; color:${COLORS.inkSoft};">${html}</p>`;
}

/** Small uppercase label, then a serif section title. */
function mkSectionHeading(eyebrow: string, title: string) {
  return `<p style="margin:0; font-size:11px; font-weight:bold; letter-spacing:1.4px; text-transform:uppercase; color:${COLORS.pine};">${eyebrow}</p>
                <h2 style="margin:8px 0 0; font-family:${MKT.serif}; font-size:24px; line-height:31px; font-weight:normal; color:${COLORS.ink};">${title}</h2>`;
}

/** Two-by-two grid of feature cards that stacks to one column on phones. */
function mkFeatureGrid(items: { icon: string; title: string; text: string }[]) {
  const card = (item: { icon: string; title: string; text: string }) =>
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${COLORS.paper}; border:1px solid ${MKT.surfaceLine}; border-radius:12px;">
                        <tr><td style="padding:18px;">
                          <p style="margin:0; font-size:20px; line-height:22px; color:${COLORS.pine};">${item.icon}</p>
                          <p style="margin:10px 0 0; font-size:15px; font-weight:bold; color:${COLORS.ink};">${item.title}</p>
                          <p style="margin:6px 0 0; font-size:14px; line-height:21px; color:${COLORS.inkSoft};">${item.text}</p>
                        </td></tr>
                      </table>`;
  const rows: string[] = [];
  for (let i = 0; i < items.length; i += 2) {
    const top = i === 0 ? 0 : 12;
    const right = items[i + 1];
    rows.push(`<tr>
                    <td class="mk-stack" width="50%" valign="top" style="padding:${top}px 6px 0 0;">${card(items[i])}</td>
                    <td class="mk-stack mk-gap" width="50%" valign="top" style="padding:${top}px 0 0 6px;">${right ? card(right) : "&nbsp;"}</td>
                  </tr>`);
  }
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows.join("")}</table>`;
}

/** Deep-blue offer panel with a big figure on the left. */
function mkOfferPanel(params: { figure: string; figureLabel: string; title: string; text: string }) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${COLORS.pineDark}; border-radius:12px;">
                  <tr>
                    <td class="mk-offer-fig" valign="middle" width="130" style="padding:24px 0 24px 24px;">
                      <p style="margin:0; font-family:${MKT.serif}; font-size:46px; line-height:46px; color:#FFFFFF;">${params.figure}</p>
                      <p style="margin:4px 0 0; font-size:12px; font-weight:bold; letter-spacing:1.2px; text-transform:uppercase; color:${MKT.offerLabel};">${params.figureLabel}</p>
                    </td>
                    <td class="mk-offer-text" valign="middle" style="padding:24px 24px 24px 12px;">
                      <p style="margin:0; font-size:17px; line-height:23px; font-weight:bold; color:#FFFFFF;">${params.title}</p>
                      <p style="margin:6px 0 0; font-size:14px; line-height:22px; color:${MKT.offerMuted};">${params.text}</p>
                    </td>
                  </tr>
                </table>`;
}

/** Light-blue note box. */
function mkTintNote(html: string) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${MKT.tint}; border:1px solid ${MKT.tintLine}; border-radius:12px;">
                  <tr><td style="padding:18px 22px; font-size:14px; line-height:22px; color:${COLORS.pineDark};">${html}</td></tr>
                </table>`;
}

/** Centred button (with a VML version so Outlook desktop keeps the rounded fill). */
function mkButton(label: string, url: string) {
  return `<table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
                  <tr>
                    <td align="center" bgcolor="${COLORS.pine}" style="border-radius:10px; background-color:${COLORS.pine};">
                      <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${url}" style="height:50px;v-text-anchor:middle;width:300px;" arcsize="20%" stroke="f" fillcolor="${COLORS.pine}"><center style="color:#ffffff;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">${label}</center></v:roundrect><![endif]-->
                      <!--[if !mso]><!--><a href="${url}" style="display:inline-block; padding:16px 34px; font-family:${MKT.sans}; font-size:16px; font-weight:bold; color:#FFFFFF; text-decoration:none; border-radius:10px;">${label} &rarr;</a><!--<![endif]-->
                    </td>
                  </tr>
                </table>`;
}

/**
 * The pre-launch provider invitation (see sendPreLaunchInvite in
 * server/actions/marketing.ts). It's deliberately separate from renderEmail:
 * that shape (one heading, one button, about 480px) suits a transactional
 * notice, not a multi-section sales email.
 */
export function renderPreLaunchInviteEmail(params: {
  /** First name only, from our own outreach list rather than user input. Escaped anyway. */
  recipientName?: string;
  /** Whoever is sending this batch. Set from the admin form, so it can change per batch. */
  senderName: string;
  ctaUrl: string;
}) {
  const { recipientName, senderName, ctaUrl } = params;
  const greeting = recipientName ? `Hi ${escapeHtml(recipientName)},` : "Hi,";
  const sender = escapeHtml(senderName);
  const rows = [
    mkRow(
      [
        `<p style="margin:0; font-size:16px; line-height:26px; color:${COLORS.ink};">${greeting}</p>`,
        mkParagraph(
          `I&apos;m ${sender}. I built ${brand.name} after seeing suitable rooms sit empty while referrers and people looking for accommodation struggled to find accurate, up-to-date vacancies.`,
        ),
        mkParagraph(
          `People and professional referrers can search by location, accommodation type and support need, instead of relying on outdated lists and repeated phone calls.`,
        ),
      ].join(""),
      34,
    ),
    mkRow(mkSectionHeading("What providers can do", "One place for your vacancies and referrals"), 34),
    mkRow(
      mkFeatureGrid([
        { icon: "&#8962;", title: "Advertise any type of home", text: "HMOs and supported, transitional and adult social care accommodation." },
        { icon: "&#9719;", title: "Show live availability", text: "Room-level availability, photos, video and eligibility information." },
        { icon: "&#9993;", title: "Enquiries and referrals", text: "Direct enquiries and professional referrals arrive in one dashboard." },
        { icon: "&#10003;", title: "Build trust", text: "Due-diligence verification and approved accreditations on your profile." },
      ]),
      16,
    ),
    mkRow(
      mkParagraph(
        `It only takes a few minutes to create your provider profile and first advert. There&apos;s no promise of a placement, but keeping accurate vacancies visible gives the right referrers and applicants a clearer route to contact you.`,
        true,
      ) +
        mkParagraph(
          `We&apos;re inviting a limited group of providers to list before wider outreach begins, so we can improve the service around real vacancies and genuine referral workflows.`,
        ),
    ),
    mkRow(mkSectionHeading("Founding-provider offer", "Three months of Professional, on us"), 34),
    mkRow(
      mkOfferPanel({
        figure: "3",
        figureLabel: "months free",
        title: "Professional membership, free for 3 months",
        text: "Worth &pound;147. Publish up to 15 live adverts, manage room availability, receive enquiries and referrals, view advert analytics and use one promoted slot. No card needed and no obligation to continue afterwards.",
      }),
      18,
    ),
    `<tr>
              <td class="mk-px" align="center" style="padding:30px 40px 0;">
                ${mkButton("List your available rooms", ctaUrl)}
                <p style="margin:12px 0 0; font-size:12px; line-height:19px; color:${COLORS.inkFaint};">
                  If the button doesn&apos;t work, copy this link:<br />
                  <a href="${ctaUrl}" style="color:${COLORS.pine}; word-break:break-all;">${ctaUrl}</a>
                </p>
              </td>
            </tr>`,
    mkRow(
      mkTintNote(
        `<strong>To claim your 3 free months:</strong> create a provider account, then reply to this email. We&apos;ll switch on Professional for three months without asking for payment details.`,
      ),
      22,
    ),
    mkRow(
      `<p style="margin:0; font-size:15px; line-height:22px; color:${COLORS.ink};">Kind regards,<br /><strong>${sender}</strong></p>
                <p style="margin:16px 0 0; font-size:13px; line-height:20px; color:${COLORS.inkFaint}; font-style:italic;">
                  P.S. If ${brand.name} isn&apos;t relevant to your organisation, you can unsubscribe below. If it is, I&apos;d genuinely value your feedback on what would make vacancy and referral management more useful for your team.
                </p>`,
      30,
    ),
    `<tr><td style="padding:34px 0 0; font-size:0; line-height:0;">&nbsp;</td></tr>`,
  ].join("\n            ");

  return marketingDocument({
    preheader:
      "Put your available rooms in front of people and professional referrers, with 3 months of Professional free.",
    badge: "Provider invitation",
    heroEyebrow: "Fill your voids now",
    heroTitle: "Make your available rooms easier to find",
    heroIntro: `${brand.name} gives providers one place to publish live availability and receive relevant enquiries and referrals.`,
    rows,
    footerReason:
      "You are receiving this provider invitation because your organisation may offer accommodation relevant to RoomsNow users.",
  });
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
3 months of Professional, free — worth £147. Publish up to 15 live adverts, manage room availability, receive enquiries and referrals, view advert analytics and use one promoted slot. No card is needed and there is no obligation to continue afterwards.

List your available rooms: ${ctaUrl}

To claim your 3 free months, create a provider account and reply to this email. We'll switch on Professional for three months without asking for payment details.

${senderName}

P.S. If RoomsNow is not relevant to your organisation, you can unsubscribe below. If it is, I'd genuinely value your feedback on what would make vacancy and referral management more useful for your team.

---
${brand.name} · ${brand.tagline}
Questions? Email ${brand.supportEmail}

You are receiving this provider invitation because your organisation may offer accommodation relevant to RoomsNow users.
Unsubscribe from RoomsNow marketing emails: ${RESEND_UNSUBSCRIBE_URL}`;
}

/**
 * The provider mailshot (see sendProviderMailshot in
 * server/actions/provider-mailshot.ts). Unlike renderPreLaunchInviteEmail, it
 * goes to providers who already have an account. Both of its kinds share this
 * layout: a promo-code send adds the offer panel with the code, and a news or
 * update send leaves it out. The subject and body are typed by an admin for
 * each send, so everything they supply is escaped before it reaches the HTML.
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
      ? mkRow(
          `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${COLORS.pineDark}; border-radius:12px;">
                  <tr>
                    <td align="center" style="padding:26px 24px;">
                      <p style="margin:0; font-size:11px; font-weight:bold; letter-spacing:1.4px; text-transform:uppercase; color:${MKT.offerLabel};">Your code</p>
                      ${promoBlurb ? `<p style="margin:10px 0 0; font-size:15px; line-height:23px; color:${MKT.offerMuted};">${escapeHtml(promoBlurb)}</p>` : ""}
                      <table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" style="margin:16px auto 0;">
                        <tr>
                          <td style="padding:12px 26px; background-color:#FFFFFF; border:2px dashed ${MKT.offerLabel}; border-radius:10px; font-family:'Courier New', Courier, monospace; font-size:22px; font-weight:bold; letter-spacing:2px; color:${COLORS.pineDark};">${escapeHtml(promoCode)}</td>
                        </tr>
                      </table>
                      <p style="margin:12px 0 0; font-size:12px; line-height:18px; color:${MKT.offerMuted};">Enter it at checkout when you choose a plan from your Membership page.</p>
                    </td>
                  </tr>
                </table>`,
          22,
        )
      : "";

  const rows = [
    mkRow(
      `<p style="margin:0; font-size:16px; line-height:26px; color:${COLORS.ink};">${greeting}</p>
                <div style="margin-top:14px;">${paragraphsHtml(bodyText, COLORS.inkSoft)}</div>`,
      34,
    ),
    promoBlock,
    `<tr>
              <td class="mk-px" align="center" style="padding:24px 40px 0;">
                ${mkButton(escapeHtml(ctaLabel), ctaUrl)}
              </td>
            </tr>`,
    mkRow(`<p style="margin:0; font-size:15px; line-height:22px; color:${COLORS.ink};">Kind regards,<br /><strong>${sender}</strong></p>`, 30),
    `<tr><td style="padding:34px 0 0; font-size:0; line-height:0;">&nbsp;</td></tr>`,
  ]
    .filter(Boolean)
    .join("\n            ");

  return marketingDocument({
    preheader: escapeHtml(heading),
    badge: "For providers",
    heroEyebrow: badgeLabel,
    heroTitle: escapeHtml(heading),
    rows,
    footerReason: "You are receiving this because your organisation has a RoomsNow provider account.",
  });
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
