ALTER TABLE "Message"
  ADD COLUMN "attachmentType" TEXT,
  ADD COLUMN "isPinned" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "pinnedAt" TIMESTAMP(3),
  ADD COLUMN "pinnedById" TEXT;
