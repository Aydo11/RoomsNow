CREATE TYPE "AccreditationStatus" AS ENUM ('UNDER_ASSESSMENT', 'APPROVED', 'REJECTED', 'EXPIRED');

CREATE TABLE "ProviderAccreditation" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "scheme" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rating" TEXT,
    "referenceNumber" TEXT,
    "publicUrl" TEXT,
    "status" "AccreditationStatus" NOT NULL DEFAULT 'UNDER_ASSESSMENT',
    "submittedBy" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProviderAccreditation_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Document" ADD COLUMN "accreditationId" TEXT;

CREATE INDEX "ProviderAccreditation_companyId_status_idx" ON "ProviderAccreditation"("companyId", "status");
CREATE INDEX "ProviderAccreditation_status_createdAt_idx" ON "ProviderAccreditation"("status", "createdAt");

ALTER TABLE "ProviderAccreditation" ADD CONSTRAINT "ProviderAccreditation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Document" ADD CONSTRAINT "Document_accreditationId_fkey" FOREIGN KEY ("accreditationId") REFERENCES "ProviderAccreditation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
