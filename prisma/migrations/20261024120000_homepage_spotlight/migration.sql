-- Paid homepage spotlight for organisations
CREATE TABLE "HomepageSpotlight" (
    "id" TEXT NOT NULL,
    "orgType" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "orgName" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "logoUrl" TEXT,
    "headline" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "amount" INTEGER NOT NULL DEFAULT 0,
    "externalPaymentId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HomepageSpotlight_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "HomepageSpotlight_externalPaymentId_key" ON "HomepageSpotlight"("externalPaymentId");
CREATE INDEX "HomepageSpotlight_status_startsAt_endsAt_idx" ON "HomepageSpotlight"("status", "startsAt", "endsAt");
CREATE INDEX "HomepageSpotlight_orgType_orgId_idx" ON "HomepageSpotlight"("orgType", "orgId");
