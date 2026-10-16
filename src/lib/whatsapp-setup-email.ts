import "server-only";
import { db } from "./db";
import { notifyCompany, sendEmail } from "./notify";
import { escapeHtml, renderEmail } from "./email-template";

const STEPS = [
  "Sign in to RoomsNow and open your dashboard.",
  "Press “Set up WhatsApp now”.",
  "Enter your business WhatsApp number (for example 07700 900123).",
  "Tick the box to confirm the number can be shown on your adverts.",
  "Press “Enable WhatsApp enquiries”. Open one of your live adverts to see the green WhatsApp button.",
];

/**
 * Tells a provider their WhatsApp access is ready and exactly how to switch
 * the button on: an in-app notification plus a step-by-step email to every
 * staff member. Used when an admin grants WhatsApp and when the paid add-on
 * starts. Never throws: a mail problem must not undo the grant or payment.
 */
export async function sendWhatsappSetupInstructions(companyId: string, opening: string) {
  try {
    await notifyCompany(companyId, {
      type: "MEMBERSHIP",
      title: "WhatsApp is ready: finish setting it up",
      body: `${opening} Open your dashboard, press “Set up WhatsApp now”, add your business number and press Enable. The button stays off until you do.`,
      href: "/provider",
    });

    const staff = await db.companyStaff.findMany({
      where: { companyId },
      select: { user: { select: { email: true, firstName: true, status: true } } },
    });
    const appUrl = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
    const url = `${appUrl}/provider`;
    for (const { user } of staff) {
      if (user.status !== "ACTIVE") continue;
      const greeting = `Hi ${user.firstName},`;
      await sendEmail({
        to: user.email,
        subject: "WhatsApp enquiries are ready to switch on",
        text: [
          greeting,
          opening,
          "How to switch it on (about a minute):",
          ...STEPS.map((step, index) => `${index + 1}. ${step}`),
          `Go to your dashboard: ${url}`,
          "Your number is only shown once you press Enable, and you can turn the button off any time in Company profile → WhatsApp enquiries.",
        ].join("\n\n"),
        html: renderEmail({
          preheader: "Add your WhatsApp number to switch the button on.",
          heading: "WhatsApp enquiries are ready",
          bodyHtml: `${escapeHtml(greeting)}<br><br>${escapeHtml(opening)}<br><br><strong>How to switch it on (about a minute):</strong><ol style="margin:8px 0 0;padding-left:20px;">${STEPS.map((step) => `<li style="margin:0 0 6px;">${escapeHtml(step)}</li>`).join("")}</ol>`,
          ctaLabel: "Set up WhatsApp",
          ctaUrl: url,
          note: "Your number is only shown once you press Enable. You can turn the button off any time in Company profile → WhatsApp enquiries.",
        }),
      });
    }
  } catch (error) {
    console.error("[whatsapp-setup] instructions failed", error);
  }
}
