import "server-only";
import { db } from "./db";
import { sendEmail, sendSms } from "./notify";
import { escapeHtml, renderEmail } from "./email-template";
import { alertMatchesListing, DAILY_ALERT_CAP } from "./room-alert-rules";
import { publicLocation, rentRange } from "./format";

/**
 * Room alerts for people without an account. Sent when an advert goes live
 * (the same moments as saved-search alerts). Email always works; text
 * messages only when SMS_DRIVER is configured.
 */

export const smsEnabled = () => (process.env.SMS_DRIVER ?? "console") !== "console";
const appUrl = () => (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

export async function sendRoomAlertConfirmation(alert: { email: string | null; phone: string | null; where: string; token: string }) {
  const confirmUrl = `${appUrl()}/alerts/confirm/${alert.token}`;
  const place = alert.where || "anywhere in the UK";
  if (alert.email) {
    await sendEmail({
      to: alert.email,
      subject: "Confirm your RoomsNow room alerts",
      text: `Tap to start getting alerts for rooms in ${place}: ${confirmUrl}\n\nIf you didn't ask for this, ignore this email and nothing will be sent.`,
      html: renderEmail({
        preheader: `One tap to start alerts for rooms in ${place}.`,
        heading: "Confirm your room alerts",
        bodyHtml: `<p style="margin:0;">We'll tell you when a room comes up in <strong>${escapeHtml(place)}</strong>. Tap the button to start.</p>`,
        ctaLabel: "Start my alerts",
        ctaUrl: confirmUrl,
        note: "If you didn't ask for this, ignore this email and nothing will be sent.",
      }),
    });
  } else if (alert.phone) {
    await sendSms({ to: alert.phone, text: `RoomsNow: tap to start alerts for rooms in ${place}: ${confirmUrl}` });
  }
}

const LISTING_INCLUDE = {
  property: { select: { city: true, area: true, postcode: true, showExactAddress: true, addressLine1: true } },
} as const;

/** Called when an advert goes live. Never throws. */
export async function notifyRoomAlerts(listingId: string) {
  try {
    const listing = await db.listing.findUnique({ where: { id: listingId }, include: LISTING_INCLUDE });
    if (!listing || listing.status !== "ACTIVE") return;

    const alerts = await db.roomAlert.findMany({ where: { confirmedAt: { not: null } }, take: 5000 });
    const matches = alerts.filter((alert) => alertMatchesListing(alert, listing));
    if (!matches.length) return;

    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const location = publicLocation(listing.property);
    const rent = rentRange(listing.weeklyRentFrom, listing.weeklyRentTo);
    const listingUrl = `${appUrl()}/listings/${listing.id}?source=alert`;

    for (const alert of matches) {
      // Daily cap: alertsSent counts alerts since the count last reset (over a day ago).
      const sentToday = alert.lastAlertedAt && alert.lastAlertedAt > dayAgo ? alert.alertsSent : 0;
      if (sentToday >= DAILY_ALERT_CAP) continue;
      const stopUrl = `${appUrl()}/alerts/stop/${alert.token}`;
      try {
        if (alert.email) {
          await sendEmail({
            to: alert.email,
            subject: `A room has come up in ${listing.property.area ?? listing.property.city}`,
            text: `${listing.title}\n${rent} · ${location}\n\nSee it: ${listingUrl}\n\nStop these alerts: ${stopUrl}`,
            html: renderEmail({
              preheader: `${rent} · ${location}`,
              heading: "A room has come up",
              bodyHtml: `<p style="margin:0 0 8px;"><strong>${escapeHtml(listing.title)}</strong></p><p style="margin:0 0 16px;">${escapeHtml(rent)} · ${escapeHtml(location)}</p><p style="margin:0;">Create a free account to save rooms and message providers.</p>`,
              ctaLabel: "See the room",
              ctaUrl: listingUrl,
              note: `Don't want these any more? <a href="${stopUrl}">Stop room alerts</a>.`,
            }),
          });
        } else if (alert.phone && smsEnabled()) {
          await sendSms({ to: alert.phone, text: `RoomsNow: a room has come up in ${listing.property.area ?? listing.property.city}, ${rent}. ${listingUrl} Stop: ${stopUrl}` });
        } else {
          continue;
        }
        const reset = !alert.lastAlertedAt || alert.lastAlertedAt <= dayAgo;
        await db.roomAlert.update({
          where: { id: alert.id },
          data: { lastAlertedAt: new Date(), alertsSent: reset ? 1 : { increment: 1 } },
        });
      } catch (error) {
        console.error("[room-alerts] send failed", error);
      }
    }
  } catch (error) {
    console.error("[room-alerts] failed", error);
  }
}
