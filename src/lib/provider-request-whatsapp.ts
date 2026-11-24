import "server-only";
import { db } from "./db";
import { sendWhatsapp } from "./notify";
import { whatsappNumber } from "./whatsapp";

/**
 * WhatsApp ping to a provider when someone requests one of their rooms, so it
 * isn't missed in an inbox. Only goes to the number the provider gave for
 * WhatsApp enquiries, with WhatsApp switched on. Sends nothing until the
 * Twilio template TWILIO_WA_REQUEST_SID ({{1}} advert title, {{2}} link) is set.
 * Never throws: the request itself must not fail because a message did.
 */
export async function whatsappProviderNewRequest(companyId: string, listingTitle: string, requestId: string) {
  const contentSid = process.env.TWILIO_WA_REQUEST_SID;
  if (!contentSid || !process.env.TWILIO_WHATSAPP_FROM) return false;
  try {
    const company = await db.company.findUnique({ where: { id: companyId }, select: { whatsappEnabled: true, whatsappNumber: true } });
    const digits = company?.whatsappEnabled && company.whatsappNumber ? whatsappNumber(`+${company.whatsappNumber.replace(/^\+/, "")}`) : null;
    if (!digits) return false;
    const appUrl = (process.env.APP_URL ?? "https://www.roomsnow.co.uk").replace(/\/$/, "");
    await sendWhatsapp({
      to: `+${digits}`,
      contentSid,
      variables: { "1": listingTitle.slice(0, 60), "2": `${appUrl}/provider/requests?request=${encodeURIComponent(requestId)}` },
    });
    return true;
  } catch (error) {
    console.error("[provider-request-whatsapp] failed", error);
    return false;
  }
}
