-- 24-hour provider stories
CREATE TABLE "ProviderStory" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "listingId" TEXT,
    "mediaType" TEXT NOT NULL,
    "mediaUrl" TEXT NOT NULL,
    "mediaKey" TEXT NOT NULL,
    "caption" TEXT,
    "views" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderStory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProviderStory_expiresAt_idx" ON "ProviderStory"("expiresAt");
CREATE INDEX "ProviderStory_companyId_expiresAt_idx" ON "ProviderStory"("companyId", "expiresAt");

ALTER TABLE "ProviderStory" ADD CONSTRAINT "ProviderStory_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProviderStory" ADD CONSTRAINT "ProviderStory_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE SET NULL ON UPDATE CASCADE;
