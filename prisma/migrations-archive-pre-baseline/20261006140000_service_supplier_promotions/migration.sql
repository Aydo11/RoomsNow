ALTER TABLE "ServiceAdvert"
ADD COLUMN "sponsoredUntil" TIMESTAMP(3),
ADD COLUMN "sponsoredBid" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "sponsoredImpressions" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "sponsoredClicks" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "ServicePromotionPurchase" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "advertId" TEXT,
    "kind" TEXT NOT NULL,
    "pack" TEXT NOT NULL,
    "credits" INTEGER NOT NULL DEFAULT 0,
    "days" INTEGER NOT NULL DEFAULT 0,
    "amount" INTEGER NOT NULL,
    "externalPaymentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ServicePromotionPurchase_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ServicePromotionPurchase_externalPaymentId_key" ON "ServicePromotionPurchase"("externalPaymentId");
CREATE INDEX "ServicePromotionPurchase_businessId_kind_createdAt_idx" ON "ServicePromotionPurchase"("businessId", "kind", "createdAt");
CREATE INDEX "ServicePromotionPurchase_advertId_kind_createdAt_idx" ON "ServicePromotionPurchase"("advertId", "kind", "createdAt");
CREATE INDEX "ServiceAdvert_status_sponsoredUntil_sponsoredBid_idx" ON "ServiceAdvert"("status", "sponsoredUntil", "sponsoredBid");

ALTER TABLE "ServicePromotionPurchase" ADD CONSTRAINT "ServicePromotionPurchase_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "ServiceBusiness"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ServicePromotionPurchase" ADD CONSTRAINT "ServicePromotionPurchase_advertId_fkey" FOREIGN KEY ("advertId") REFERENCES "ServiceAdvert"("id") ON DELETE SET NULL ON UPDATE CASCADE;
