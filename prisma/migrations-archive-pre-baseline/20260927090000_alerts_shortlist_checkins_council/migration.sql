-- Room alerts without an account, client shortlists, placement check-ins and council access.
ALTER TABLE "Referral" ADD COLUMN IF NOT EXISTS "checkIn4SentAt" TIMESTAMP(3);
ALTER TABLE "Referral" ADD COLUMN IF NOT EXISTS "checkIn12SentAt" TIMESTAMP(3);

DO $$ BEGIN
    CREATE TYPE "PlacementHealth" AS ENUM ('GOING_WELL', 'SOME_CONCERNS', 'AT_RISK', 'ENDED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "RoomAlert" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "where" TEXT NOT NULL,
    "support" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "token" TEXT NOT NULL,
    "confirmedAt" TIMESTAMP(3),
    "lastAlertedAt" TIMESTAMP(3),
    "alertsSent" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RoomAlert_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "RoomAlert_token_key" ON "RoomAlert"("token");
CREATE INDEX IF NOT EXISTS "RoomAlert_confirmedAt_idx" ON "RoomAlert"("confirmedAt");
CREATE INDEX IF NOT EXISTS "RoomAlert_email_idx" ON "RoomAlert"("email");
CREATE INDEX IF NOT EXISTS "RoomAlert_phone_idx" ON "RoomAlert"("phone");

CREATE TABLE IF NOT EXISTS "ShortlistItem" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "note" TEXT,
    "addedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ShortlistItem_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ShortlistItem_clientId_listingId_key" ON "ShortlistItem"("clientId", "listingId");

CREATE TABLE IF NOT EXISTS "PlacementCheckIn" (
    "id" TEXT NOT NULL,
    "referralId" TEXT NOT NULL,
    "week" INTEGER NOT NULL,
    "side" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "health" "PlacementHealth" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PlacementCheckIn_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "PlacementCheckIn_referralId_week_side_key" ON "PlacementCheckIn"("referralId", "week", "side");
CREATE INDEX IF NOT EXISTS "PlacementCheckIn_health_idx" ON "PlacementCheckIn"("health");

CREATE TABLE IF NOT EXISTS "CouncilAccess" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "councilName" TEXT NOT NULL,
    "areas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "grantedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CouncilAccess_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "CouncilAccess_userId_key" ON "CouncilAccess"("userId");

DO $$ BEGIN
    ALTER TABLE "ShortlistItem" ADD CONSTRAINT "ShortlistItem_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    ALTER TABLE "ShortlistItem" ADD CONSTRAINT "ShortlistItem_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    ALTER TABLE "PlacementCheckIn" ADD CONSTRAINT "PlacementCheckIn_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "Referral"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    ALTER TABLE "PlacementCheckIn" ADD CONSTRAINT "PlacementCheckIn_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    ALTER TABLE "CouncilAccess" ADD CONSTRAINT "CouncilAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
