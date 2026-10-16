-- External Services Marketplace: service businesses, adverts, evidence, plans, boosts, quotes, favourites, reviews, analytics.
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'SERVICE_PROVIDER';
ALTER TYPE "ReportTargetType" ADD VALUE IF NOT EXISTS 'SERVICE_BUSINESS';
ALTER TYPE "ReportTargetType" ADD VALUE IF NOT EXISTS 'SERVICE_ADVERT';

DO $$ BEGIN
    CREATE TYPE "ServiceBusinessStatus" AS ENUM ('ONBOARDING', 'PENDING_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'REJECTED', 'SUSPENDED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    CREATE TYPE "ServiceAdvertStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'ACTIVE', 'PAUSED', 'REJECTED', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    CREATE TYPE "ServicePlanTier" AS ENUM ('STANDARD', 'PRO');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    CREATE TYPE "ServicePriceType" AS ENUM ('FIXED', 'FROM', 'RANGE', 'HOURLY', 'QUOTE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    CREATE TYPE "ServiceQuoteStatus" AS ENUM ('NEW', 'VIEWED', 'QUOTED', 'ACCEPTED', 'DECLINED', 'COMPLETED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    CREATE TYPE "ServiceUrgency" AS ENUM ('FLEXIBLE', 'WITHIN_A_MONTH', 'WITHIN_A_WEEK', 'URGENT', 'EMERGENCY');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    CREATE TYPE "ServiceEvidenceType" AS ENUM ('PUBLIC_LIABILITY', 'EMPLOYERS_LIABILITY', 'INCORPORATION', 'QUALIFICATION', 'LICENCE', 'ACCREDITATION', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    CREATE TYPE "ServiceEvidenceStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
CREATE TABLE IF NOT EXISTS "ServiceBusiness" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tradingName" TEXT,
    "slug" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "website" TEXT,
    "socialLinks" JSONB,
    "logoUrl" TEXT,
    "coverUrl" TEXT,
    "companyNumber" TEXT,
    "categories" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "areas" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "postcodes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "nationalCoverage" BOOLEAN NOT NULL DEFAULT false,
    "basePostcode" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "radiusMiles" INTEGER,
    "description" TEXT,
    "yearsExperience" INTEGER,
    "openingHours" TEXT,
    "emergencyAvailable" BOOLEAN NOT NULL DEFAULT false,
    "pricingSummary" TEXT,
    "quoteOnly" BOOLEAN NOT NULL DEFAULT true,
    "terms" TEXT,
    "cancellationPolicy" TEXT,
    "responseTarget" TEXT,
    "responseMinutes" INTEGER,
    "portfolio" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "status" "ServiceBusinessStatus" NOT NULL DEFAULT 'ONBOARDING',
    "statusReason" TEXT,
    "submittedAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "profileViews" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ServiceBusiness_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "ServiceEvidence" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "type" "ServiceEvidenceType" NOT NULL,
    "label" TEXT NOT NULL,
    "issuer" TEXT,
    "reference" TEXT,
    "expiresAt" TIMESTAMP(3),
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "status" "ServiceEvidenceStatus" NOT NULL DEFAULT 'PENDING',
    "reviewNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ServiceEvidence_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "ServiceSubscription" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "tier" "ServicePlanTier" NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIALING',
    "trialEndsAt" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "billingProvider" TEXT,
    "externalCustomerId" TEXT,
    "externalSubscriptionId" TEXT,
    "boostCredits" INTEGER NOT NULL DEFAULT 0,
    "creditsPeriod" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ServiceSubscription_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "ServiceAdvert" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subcategory" TEXT,
    "description" TEXT NOT NULL,
    "locations" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "nationwide" BOOLEAN NOT NULL DEFAULT false,
    "priceType" "ServicePriceType" NOT NULL DEFAULT 'QUOTE',
    "priceFrom" INTEGER,
    "priceTo" INTEGER,
    "priceUnit" TEXT,
    "images" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "availability" TEXT,
    "emergency" BOOLEAN NOT NULL DEFAULT false,
    "sameDay" BOOLEAN NOT NULL DEFAULT false,
    "qualifications" TEXT,
    "website" TEXT,
    "status" "ServiceAdvertStatus" NOT NULL DEFAULT 'DRAFT',
    "reviewNote" TEXT,
    "submittedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "views" INTEGER NOT NULL DEFAULT 0,
    "enquiries" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ServiceAdvert_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "ServiceBoost" (
    "id" TEXT NOT NULL,
    "advertId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "days" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL,
    "externalPaymentId" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ServiceBoost_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "ServiceQuoteRequest" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "advertId" TEXT,
    "requesterId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "conversationId" TEXT,
    "service" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "preferredDate" TIMESTAMP(3),
    "urgency" "ServiceUrgency" NOT NULL DEFAULT 'FLEXIBLE',
    "description" TEXT NOT NULL,
    "budgetMin" INTEGER,
    "budgetMax" INTEGER,
    "attachments" JSONB,
    "status" "ServiceQuoteStatus" NOT NULL DEFAULT 'NEW',
    "quoteAmount" INTEGER,
    "quoteNote" TEXT,
    "quoteValidUntil" TIMESTAMP(3),
    "declineReason" TEXT,
    "viewedAt" TIMESTAMP(3),
    "quotedAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "declinedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ServiceQuoteRequest_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "ServiceFavourite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "advertId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ServiceFavourite_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "ServiceReview" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "quality" INTEGER NOT NULL,
    "communication" INTEGER NOT NULL,
    "timeliness" INTEGER NOT NULL,
    "value" INTEGER NOT NULL,
    "comment" TEXT,
    "hiddenAt" TIMESTAMP(3),
    "hiddenReason" TEXT,
    "reply" TEXT,
    "replyAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ServiceReview_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "ServiceEvent" (
    "id" TEXT NOT NULL,
    "businessId" TEXT,
    "advertId" TEXT,
    "type" TEXT NOT NULL,
    "category" TEXT,
    "location" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ServiceEvent_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "serviceBusinessId" TEXT;
ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "serviceAdvertId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "ServiceBusiness_ownerId_key" ON "ServiceBusiness"("ownerId");
CREATE UNIQUE INDEX IF NOT EXISTS "ServiceBusiness_slug_key" ON "ServiceBusiness"("slug");
CREATE INDEX IF NOT EXISTS "ServiceBusiness_status_idx" ON "ServiceBusiness"("status");
CREATE INDEX IF NOT EXISTS "ServiceEvidence_businessId_status_idx" ON "ServiceEvidence"("businessId", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "ServiceSubscription_businessId_key" ON "ServiceSubscription"("businessId");
CREATE UNIQUE INDEX IF NOT EXISTS "ServiceSubscription_externalSubscriptionId_key" ON "ServiceSubscription"("externalSubscriptionId");
CREATE INDEX IF NOT EXISTS "ServiceAdvert_status_category_idx" ON "ServiceAdvert"("status", "category");
CREATE INDEX IF NOT EXISTS "ServiceAdvert_businessId_status_idx" ON "ServiceAdvert"("businessId", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "ServiceBoost_externalPaymentId_key" ON "ServiceBoost"("externalPaymentId");
CREATE INDEX IF NOT EXISTS "ServiceBoost_advertId_endsAt_idx" ON "ServiceBoost"("advertId", "endsAt");
CREATE INDEX IF NOT EXISTS "ServiceBoost_endsAt_idx" ON "ServiceBoost"("endsAt");
CREATE INDEX IF NOT EXISTS "ServiceQuoteRequest_businessId_status_idx" ON "ServiceQuoteRequest"("businessId", "status");
CREATE INDEX IF NOT EXISTS "ServiceQuoteRequest_companyId_status_idx" ON "ServiceQuoteRequest"("companyId", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "ServiceFavourite_userId_advertId_key" ON "ServiceFavourite"("userId", "advertId");
CREATE UNIQUE INDEX IF NOT EXISTS "ServiceReview_quoteId_key" ON "ServiceReview"("quoteId");
CREATE INDEX IF NOT EXISTS "ServiceReview_businessId_hiddenAt_idx" ON "ServiceReview"("businessId", "hiddenAt");
CREATE INDEX IF NOT EXISTS "ServiceEvent_businessId_type_createdAt_idx" ON "ServiceEvent"("businessId", "type", "createdAt");
CREATE INDEX IF NOT EXISTS "ServiceEvent_type_createdAt_idx" ON "ServiceEvent"("type", "createdAt");
CREATE INDEX IF NOT EXISTS "Conversation_serviceBusinessId_idx" ON "Conversation"("serviceBusinessId");
DO $$ BEGIN
    ALTER TABLE "ServiceBusiness" ADD CONSTRAINT "ServiceBusiness_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    ALTER TABLE "ServiceEvidence" ADD CONSTRAINT "ServiceEvidence_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "ServiceBusiness"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    ALTER TABLE "ServiceSubscription" ADD CONSTRAINT "ServiceSubscription_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "ServiceBusiness"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    ALTER TABLE "ServiceAdvert" ADD CONSTRAINT "ServiceAdvert_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "ServiceBusiness"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    ALTER TABLE "ServiceBoost" ADD CONSTRAINT "ServiceBoost_advertId_fkey" FOREIGN KEY ("advertId") REFERENCES "ServiceAdvert"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    ALTER TABLE "ServiceBoost" ADD CONSTRAINT "ServiceBoost_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "ServiceBusiness"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    ALTER TABLE "ServiceQuoteRequest" ADD CONSTRAINT "ServiceQuoteRequest_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "ServiceBusiness"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    ALTER TABLE "ServiceQuoteRequest" ADD CONSTRAINT "ServiceQuoteRequest_advertId_fkey" FOREIGN KEY ("advertId") REFERENCES "ServiceAdvert"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    ALTER TABLE "ServiceQuoteRequest" ADD CONSTRAINT "ServiceQuoteRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    ALTER TABLE "ServiceQuoteRequest" ADD CONSTRAINT "ServiceQuoteRequest_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    ALTER TABLE "ServiceFavourite" ADD CONSTRAINT "ServiceFavourite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    ALTER TABLE "ServiceFavourite" ADD CONSTRAINT "ServiceFavourite_advertId_fkey" FOREIGN KEY ("advertId") REFERENCES "ServiceAdvert"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    ALTER TABLE "ServiceReview" ADD CONSTRAINT "ServiceReview_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "ServiceQuoteRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    ALTER TABLE "ServiceReview" ADD CONSTRAINT "ServiceReview_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "ServiceBusiness"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    ALTER TABLE "ServiceReview" ADD CONSTRAINT "ServiceReview_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    ALTER TABLE "ServiceEvent" ADD CONSTRAINT "ServiceEvent_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "ServiceBusiness"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_serviceBusinessId_fkey" FOREIGN KEY ("serviceBusinessId") REFERENCES "ServiceBusiness"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_serviceAdvertId_fkey" FOREIGN KEY ("serviceAdvertId") REFERENCES "ServiceAdvert"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
