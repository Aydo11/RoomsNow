-- Admin-managed blocked and flagged words for messages and adverts
CREATE TABLE "BlockedPhrase" (
    "id" TEXT NOT NULL,
    "phrase" TEXT NOT NULL,
    "action" TEXT NOT NULL DEFAULT 'BLOCK',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlockedPhrase_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BlockedPhrase_phrase_key" ON "BlockedPhrase"("phrase");
