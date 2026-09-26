import type { Prisma } from "@prisma/client";

/**
 * "Vetted" (a.k.a. preferred) providers: a CQC registration or BVSC recognition
 * that the RoomsNow team has checked against evidence, and that is still in date.
 * One definition, used by search, the vetted providers page and listing badges.
 */
export const VETTED_SCHEMES = ["CQC", "BVSC"] as const;
export type VettedScheme = (typeof VETTED_SCHEMES)[number];

export function vettedAccreditationWhere(schemes: readonly string[] = VETTED_SCHEMES, now = new Date()): Prisma.ProviderAccreditationWhereInput {
  return {
    scheme: { in: [...schemes] },
    status: "APPROVED",
    OR: [{ expiresAt: null }, { expiresAt: { gte: now } }],
  };
}

export function vettedCompanyWhere(schemes: readonly string[] = VETTED_SCHEMES, now = new Date()): Prisma.CompanyWhereInput {
  return { status: "ACTIVE", accreditations: { some: vettedAccreditationWhere(schemes, now) } };
}
