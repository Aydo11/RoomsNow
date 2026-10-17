import { effectiveProviderTier } from "./entitlements";
import { whatsappAccess } from "./whatsapp-access";
import { whatsappNumber } from "./whatsapp";

export type WhatsappDisplayCompany = {
  status?: string;
  /** Provider verification status. WhatsApp is only shown for verified (APPROVED) providers. */
  verification?: string;
  whatsappEnabled?: boolean;
  whatsappNumber?: string | null;
  whatsappAddonStatus?: string | null;
  whatsappGrantActive?: boolean;
  whatsappGrantExpiresAt?: Date | null;
  subscription?: Parameters<typeof effectiveProviderTier>[0]["subscription"];
  membershipGrants?: Parameters<typeof effectiveProviderTier>[0]["membershipGrants"];
};

/**
 * Never show a contact action without a verified provider, paid access, a
 * valid number and explicit opt-in. Verification matters most: WhatsApp takes
 * the conversation off RoomsNow, which is where rental scams happen.
 */
export function showWhatsappContact(listingStatus: string, company: WhatsappDisplayCompany) {
  return listingStatus === "ACTIVE" && company.status === "ACTIVE" && company.verification === "APPROVED" && Boolean(company.whatsappEnabled) &&
    Boolean(company.whatsappNumber && whatsappNumber(company.whatsappNumber.startsWith("+") ? company.whatsappNumber : `+${company.whatsappNumber}`)) &&
    whatsappAccess(effectiveProviderTier({ subscription: company.subscription ?? null, membershipGrants: company.membershipGrants ?? [] }), company.whatsappAddonStatus,
      { whatsappGrantActive: company.whatsappGrantActive ?? false, whatsappGrantExpiresAt: company.whatsappGrantExpiresAt ?? null }).allowed;
}
