CREATE TABLE "ProExpert" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "specialism" TEXT NOT NULL,
    "bio" TEXT NOT NULL,
    "hourlyRate" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProExpert_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProServiceEnquiry" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "expertId" TEXT,
    "expertName" TEXT,
    "hours" INTEGER,
    "companyId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "phone" TEXT,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "adminNote" TEXT,
    "packSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProServiceEnquiry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProServiceEnquiry_reference_key" ON "ProServiceEnquiry"("reference");
CREATE INDEX "ProServiceEnquiry_status_createdAt_idx" ON "ProServiceEnquiry"("status", "createdAt");
CREATE INDEX "ProServiceEnquiry_companyId_createdAt_idx" ON "ProServiceEnquiry"("companyId", "createdAt");
