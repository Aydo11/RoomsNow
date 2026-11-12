-- Public News section: RoomsNow news, charity appeals and sector news
CREATE TABLE "NewsPost" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "imageUrl" TEXT,
    "imageKey" TEXT,
    "linkUrl" TEXT,
    "linkLabel" TEXT,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "appealStatus" TEXT,
    "appealOrganiser" TEXT,
    "appealRelationship" TEXT,
    "appealPurpose" TEXT,
    "appealDonationRecipient" TEXT,
    "appealCharityRegistration" TEXT,
    "appealGiftAidStatus" TEXT,
    "appealDonateUrl" TEXT,
    "appealVolunteerUrl" TEXT,
    "sectorSourceName" TEXT,
    "sectorSourceUrl" TEXT,
    "sectorReviewedOn" DATE,
    "publishedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "NewsPost_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "NewsPost_slug_key" ON "NewsPost"("slug");
CREATE INDEX "NewsPost_publishedAt_idx" ON "NewsPost"("publishedAt");
CREATE INDEX "NewsPost_category_publishedAt_idx" ON "NewsPost"("category", "publishedAt");
