/**
 * Single source of truth for branding. Change these values and the whole
 * product renames itself — nothing else hard-codes the name.
 */
export const brand = {
  name: "RoomsNow",
  shortName: "RoomsNow",
  tagline: "Housing and accommodation, findable.",
  description:
    "Find and advertise housing across the UK, including HMOs, supported and transitional accommodation, adult social care housing, shared homes and self-contained properties.",
  supportEmail: "info@roomsnow.co.uk",
  /** The company behind RoomsNow, as registered at Companies House. Shown in the footer, privacy notice and terms. */
  legal: {
    name: "Rooms Now Ltd",
    number: "17450621",
    jurisdiction: "England and Wales",
    registeredOffice: "63, 33a Grove Lane, Birmingham, B21 9ES",
  },
  currency: "GBP",
  currencySymbol: "£",
  // Legal / trust copy. Deliberately makes no regulatory claims.
  trustNote:
    "Verification confirms we have checked a provider's stated identity and documents. It is not a regulatory endorsement, inspection or accreditation.",
} as const;
