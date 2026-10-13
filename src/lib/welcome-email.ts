import "server-only";
import { db } from "./db";
import { audit } from "./audit";
import { sendEmail } from "./notify";
import { escapeHtml, renderEmail, renderSeekerAboutEmail, renderSeekerAboutText } from "./email-template";

const SENT_ACTION = "email.welcome_sent";

/**
 * Sends the welcome ("about RoomsNow") email to someone looking for a room,
 * once. Called when they confirm their email address, so it never lands
 * before the verification email and never goes to an address that isn't
 * theirs. Never throws: a mail problem must not break verification.
 */
export async function sendSeekerWelcome(userId: string) {
  try {
    const user = await db.user.findUnique({ where: { id: userId }, select: { id: true, role: true, email: true, firstName: true } });
    if (!user || user.role !== "USER") return false;
    const already = await db.auditLog.findFirst({ where: { action: SENT_ACTION, targetId: user.id }, select: { id: true } });
    if (already) return false;

    const appUrl = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
    await sendEmail({
      to: user.email,
      subject: "Welcome to RoomsNow, and thank you for joining",
      html: renderSeekerAboutEmail({ mode: "welcome", appUrl, firstName: user.firstName }),
      text: renderSeekerAboutText({ mode: "welcome", appUrl, firstName: user.firstName }),
    });
    await audit({ actorId: user.id, action: SENT_ACTION, targetType: "User", targetId: user.id });
    return true;
  } catch (error) {
    console.error("Welcome email failed", error);
    return false;
  }
}

const ROLE_WELCOME: Record<string, { subject: string; heading: string; body: string; cta: string; path: string }> = {
  PROVIDER: {
    subject: "Welcome to RoomsNow",
    heading: "Your RoomsNow account is ready",
    body: "Thanks for joining RoomsNow. You can start straight away: add your first advert and people looking for a room in your area can find you and get in touch.",
    cta: "Add your first advert",
    path: "/provider",
  },
  REFERRER: {
    subject: "Welcome to RoomsNow",
    heading: "Your RoomsNow account is ready",
    body: "Thanks for joining RoomsNow. You can now search rooms, send referrals and keep track of every placement in one place.",
    cta: "Go to your referrals",
    path: "/referrals",
  },
  SERVICE_PROVIDER: {
    subject: "Welcome to RoomsNow",
    heading: "Your RoomsNow account is ready",
    body: "Thanks for joining RoomsNow. Finish your business profile and upload your insurance so we can verify you and show your business to providers.",
    cta: "Finish your profile",
    path: "/service-provider",
  },
};

/**
 * The welcome email every new account gets straight after signing up. There
 * is no email confirmation step any more, so this is the first thing people
 * receive. Sent once per person. Never throws.
 */
export async function sendSignupWelcome(userId: string) {
  try {
    const user = await db.user.findUnique({ where: { id: userId }, select: { id: true, role: true, email: true, firstName: true } });
    if (!user) return false;
    if (user.role === "USER") return sendSeekerWelcome(user.id);
    const content = ROLE_WELCOME[user.role];
    if (!content) return false;
    const already = await db.auditLog.findFirst({ where: { action: SENT_ACTION, targetId: user.id }, select: { id: true } });
    if (already) return false;

    const appUrl = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
    const greeting = `Hi ${user.firstName},`;
    await sendEmail({
      to: user.email,
      subject: content.subject,
      text: `${greeting}\n\n${content.body}\n\n${content.cta}: ${appUrl}${content.path}\n\nAny questions, just reply to this email.\n\nRoomsNow`,
      html: renderEmail({
        preheader: content.body,
        heading: content.heading,
        bodyHtml: `${escapeHtml(greeting)}<br><br>${escapeHtml(content.body)}<br><br>Any questions, just reply to this email.`,
        ctaLabel: content.cta,
        ctaUrl: `${appUrl}${content.path}`,
      }),
    });
    await audit({ actorId: user.id, action: SENT_ACTION, targetType: "User", targetId: user.id });
    return true;
  } catch (error) {
    console.error("Welcome email failed", error);
    return false;
  }
}
