import { effectiveProviderTier } from "./entitlements";
import { whatsappAccess } from "./whatsapp-access";
import { whatsappNumber } from "./whatsapp";

export type WhatsappDisplayCompany = {
  status?: string;
  whatsappEnabled?: boolean;
  whatsappNumber?: string | null;
  whatsappAddonStatus?: string | null;
  whatsappGrantActive?: boolean;
  whatsappGrantExpiresAt?: Date | null;
  subscription?: Parameters<typeof effectiveProviderTier>[0]["subscription"];
  membershipGrants?: Parameters<typeof effectiveProviderTier>[0]["membershipGrants"];
};

/** Never show a contact action without paid access, a valid number and explicit opt-in. */
export function showWhatsappContact(listingStatus: string, company: WhatsappDisplayCompany) {
  return listingStatus === "ACTIVE" && company.status === "ACTIVE" && Boolean(company.whatsappEnabled) &&
    Boolean(company.whatsappNumber && whatsappNumber(company.whatsappNumber.startsWith("+") ? company.whatsappNumber : `+${company.whatsappNumber}`)) &&
    whatsappAccess(effectiveProviderTier({ subscription: company.subscription ?? null, membershipGrants: company.membershipGrants ?? [] }), company.whatsappAddonStatus,
      { whatsappGrantActive: company.whatsappGrantActive ?? false, whatsappGrantExpiresAt: company.whatsappGrantExpiresAt ?? null }).allowed;
}
