-- Reply chasing and tenant-confirmed move-ins
ALTER TABLE "AccommodationRequest" ADD COLUMN "providerChaseSentAt" TIMESTAMP(3);
ALTER TABLE "AccommodationRequest" ADD COLUMN "seekerFollowUpSentAt" TIMESTAMP(3);
ALTER TABLE "AccommodationRequest" ADD COLUMN "tenantConfirmedAt" TIMESTAMP(3);

-- "I've found a room"
ALTER TABLE "User" ADD COLUMN "foundHomeAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "foundHomeElsewhere" BOOLEAN NOT NULL DEFAULT false;

-- Licensing readiness checklist
CREATE TABLE "LicensingItem" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "documentId" TEXT,
    "documentName" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LicensingItem_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "LicensingItem_companyId_key_key" ON "LicensingItem"("companyId", "key");
ALTER TABLE "LicensingItem" ADD CONSTRAINT "LicensingItem_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
