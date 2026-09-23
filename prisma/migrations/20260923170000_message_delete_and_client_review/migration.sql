ALTER TABLE "Message"
  ADD COLUMN "isDeleted" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "ClientShare"
  ADD COLUMN "reviewStatus" TEXT,
  ADD COLUMN "reviewNote" TEXT,
  ADD COLUMN "reviewedAt" TIMESTAMP(3);
