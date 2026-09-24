-- Client needs & risk assessment (already applied via db push on production).
ALTER TABLE "Client"
  ADD COLUMN IF NOT EXISTS "assessment" JSONB,
  ADD COLUMN IF NOT EXISTS "assessedAt" TIMESTAMP(3);

-- Referral organisations: colleagues with their own logins sharing one caseload.
CREATE TYPE "ReferralOrgRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

CREATE TABLE "ReferralOrganisation" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReferralOrganisation_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ReferralOrganisation_ownerId_idx" ON "ReferralOrganisation"("ownerId");

CREATE TABLE "ReferralOrgMember" (
  "id" TEXT NOT NULL,
  "organisationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" "ReferralOrgRole" NOT NULL DEFAULT 'MEMBER',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReferralOrgMember_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ReferralOrgMember_userId_key" ON "ReferralOrgMember"("userId");
CREATE INDEX "ReferralOrgMember_organisationId_idx" ON "ReferralOrgMember"("organisationId");

CREATE TABLE "ReferralOrgInvite" (
  "id" TEXT NOT NULL,
  "organisationId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "role" "ReferralOrgRole" NOT NULL DEFAULT 'MEMBER',
  "tokenHash" TEXT NOT NULL,
  "invitedById" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "acceptedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReferralOrgInvite_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ReferralOrgInvite_tokenHash_key" ON "ReferralOrgInvite"("tokenHash");
CREATE INDEX "ReferralOrgInvite_organisationId_acceptedAt_idx" ON "ReferralOrgInvite"("organisationId", "acceptedAt");
CREATE INDEX "ReferralOrgInvite_email_idx" ON "ReferralOrgInvite"("email");

ALTER TABLE "ReferralOrganisation" ADD CONSTRAINT "ReferralOrganisation_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReferralOrgMember" ADD CONSTRAINT "ReferralOrgMember_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "ReferralOrganisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReferralOrgMember" ADD CONSTRAINT "ReferralOrgMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReferralOrgInvite" ADD CONSTRAINT "ReferralOrgInvite_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "ReferralOrganisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReferralOrgInvite" ADD CONSTRAINT "ReferralOrgInvite_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
