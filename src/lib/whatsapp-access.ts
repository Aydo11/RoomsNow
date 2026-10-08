/**
 * Who can show a WhatsApp button on their adverts:
 *  - Business plan: included.
 *  - Professional plan: with the paid WhatsApp add-on (£20 a month).
 *  - Free plan: not available.
 * Pure so it can be unit-tested and used on both the provider and public side.
 */

export const WHATSAPP_ADDON_PRICE = 2000; // pence per month
export const WHATSAPP_ADDON_LABEL = "£20/month";

/** Add-on statuses that still count as paid up (Stripe retries failed payments). */
const ADDON_LIVE = new Set(["ACTIVE", "TRIALING", "PAST_DUE"]);

export type WhatsappAccess =
  | { allowed: true; reason: "INCLUDED" | "ADDON" }
  | { allowed: false; reason: "NEEDS_ADDON" | "NEEDS_UPGRADE" };

export function whatsappAccess(tier: string, addonStatus: string | null | undefined): WhatsappAccess {
  if (tier === "BUSINESS") return { allowed: true, reason: "INCLUDED" };
  if (tier === "PROFESSIONAL") {
    return addonStatus && ADDON_LIVE.has(addonStatus) ? { allowed: true, reason: "ADDON" } : { allowed: false, reason: "NEEDS_ADDON" };
  }
  return { allowed: false, reason: "NEEDS_UPGRADE" };
}

/** One line for plan comparison lists. */
export function whatsappPlanLine(tier: string) {
  if (tier === "BUSINESS") return { enabled: true, text: "WhatsApp enquiry button included" };
  if (tier === "PROFESSIONAL") return { enabled: true, text: `WhatsApp enquiry button: ${WHATSAPP_ADDON_LABEL} add-on` };
  return { enabled: false, text: "WhatsApp enquiry button" };
}
