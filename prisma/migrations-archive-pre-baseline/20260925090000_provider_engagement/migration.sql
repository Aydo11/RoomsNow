-- Response-time badge, weekly summary email and quick replies.
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "responseMinutes" INTEGER;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "responseSampleSize" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "weeklySummary" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "weeklySummarySentAt" TIMESTAMP(3);
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "weeklySummaryViews" INTEGER;

CREATE TABLE IF NOT EXISTS "QuickReply" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QuickReply_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "QuickReply_companyId_createdAt_idx" ON "QuickReply"("companyId", "createdAt");

DO $$ BEGIN
    ALTER TABLE "QuickReply" ADD CONSTRAINT "QuickReply_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
