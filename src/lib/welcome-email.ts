import "server-only";
import { db } from "./db";
import { audit } from "./audit";
import { sendEmail } from "./notify";
import { renderSeekerAboutEmail, renderSeekerAboutText } from "./email-template";

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
