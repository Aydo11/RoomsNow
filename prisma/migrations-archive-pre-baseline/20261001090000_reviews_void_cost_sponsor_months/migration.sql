-- Resident reviews, void cost tracking and free sponsored months from provider invites.
ALTER TABLE "Room" ADD COLUMN IF NOT EXISTS "vacantSince" TIMESTAMP(3);
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "freeSponsorMonths" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "ResidentReview" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "listingId" TEXT,
    "authorId" TEXT NOT NULL,
    "requestId" TEXT,
    "referralId" TEXT,
    "rating" INTEGER NOT NULL,
    "feelSafe" BOOLEAN,
    "supportHelpful" BOOLEAN,
    "comment" TEXT,
    "stillLivingThere" BOOLEAN NOT NULL DEFAULT true,
    "hiddenAt" TIMESTAMP(3),
    "hiddenReason" TEXT,
    "providerReply" TEXT,
    "providerReplyAt" TIMESTAMP(3),
    "providerReplyBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ResidentReview_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ResidentReview_requestId_key" ON "ResidentReview"("requestId");
CREATE UNIQUE INDEX IF NOT EXISTS "ResidentReview_referralId_key" ON "ResidentReview"("referralId");
CREATE INDEX IF NOT EXISTS "ResidentReview_companyId_hiddenAt_createdAt_idx" ON "ResidentReview"("companyId", "hiddenAt", "createdAt");
CREATE INDEX IF NOT EXISTS "ResidentReview_listingId_idx" ON "ResidentReview"("listingId");

DO $$ BEGIN
    ALTER TABLE "ResidentReview" ADD CONSTRAINT "ResidentReview_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    ALTER TABLE "ResidentReview" ADD CONSTRAINT "ResidentReview_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    ALTER TABLE "ResidentReview" ADD CONSTRAINT "ResidentReview_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
