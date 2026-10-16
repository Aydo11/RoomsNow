-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'PROVIDER', 'REFERRER', 'SERVICE_PROVIDER', 'ADMIN');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DELETED');

-- CreateEnum
CREATE TYPE "ContactMethod" AS ENUM ('MESSAGE', 'EMAIL', 'PHONE');

-- CreateEnum
CREATE TYPE "OrgType" AS ENUM ('SUPPORTED_ACCOMMODATION_PROVIDER', 'HOUSING_PROVIDER', 'MANAGING_AGENT', 'LANDLORD', 'CHARITY', 'COMMUNITY_ORGANISATION', 'OTHER');

-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('OWNER', 'MANAGER', 'STAFF');

-- CreateEnum
CREATE TYPE "AccommodationType" AS ENUM ('SINGLE_ROOM', 'SHARED_ACCOMMODATION', 'MOTHER_AND_BABY_UNIT', 'SELF_CONTAINED', 'FLAT', 'HOUSE', 'OTHER');

-- CreateEnum
CREATE TYPE "GenderArrangement" AS ENUM ('ANY', 'FEMALE_ONLY', 'MALE_ONLY', 'MIXED');

-- CreateEnum
CREATE TYPE "RoomStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'OCCUPIED', 'VOID', 'MAINTENANCE', 'UNAVAILABLE');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'ACTIVE', 'PAUSED', 'REJECTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ReferralRoute" AS ENUM ('SELF_REFERRAL', 'PROFESSIONAL_REFERRAL', 'LOCAL_AUTHORITY', 'ANY');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('IMAGE', 'VIDEO', 'VIDEO_URL', 'DOCUMENT');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('SUBMITTED', 'RECEIVED', 'UNDER_REVIEW', 'ASSESSMENT', 'OFFERED', 'ACCEPTED', 'MOVED_IN', 'DECLINED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('SUBMITTED', 'RECEIVED', 'UNDER_REVIEW', 'ASSESSMENT', 'OFFERED', 'ACCEPTED', 'MOVED_IN', 'DECLINED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "ReferralDataBasis" AS ENUM ('CONSENT', 'CONTRACT', 'LEGAL_OBLIGATION', 'VITAL_INTERESTS', 'PUBLIC_TASK', 'LEGITIMATE_INTERESTS', 'RECOGNISED_LEGITIMATE_INTERESTS', 'OTHER');

-- CreateEnum
CREATE TYPE "Urgency" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'EMERGENCY');

-- CreateEnum
CREATE TYPE "MembershipTier" AS ENUM ('FREE', 'PROFESSIONAL', 'BUSINESS', 'REFERRER_FREE', 'REFERRER_PRO');

-- CreateEnum
CREATE TYPE "MembershipAudience" AS ENUM ('PROVIDER', 'REFERRER');

-- CreateEnum
CREATE TYPE "ClientStatus" AS ENUM ('ACTIVE', 'PLACED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'TRIALING', 'PAST_DUE', 'CANCELLED', 'INCOMPLETE');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentKind" AS ENUM ('SUBSCRIPTION', 'FEATURED_LISTING', 'BOOST', 'BOOST_PACK', 'OTHER');

-- CreateEnum
CREATE TYPE "VerificationType" AS ENUM ('COMPANY', 'PROPERTY');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('NOT_REQUESTED', 'PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AccreditationStatus" AS ENUM ('UNDER_ASSESSMENT', 'APPROVED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ReportReason" AS ENUM ('SCAM', 'INCORRECT_INFORMATION', 'UNSAFE_ACCOMMODATION', 'INAPPROPRIATE_CONTENT', 'MISLEADING_INFORMATION', 'OTHER');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'REVIEWING', 'ACTIONED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "ReportTargetType" AS ENUM ('LISTING', 'USER', 'COMPANY', 'MESSAGE', 'LOOKING_FOR_AD', 'SERVICE_BUSINESS', 'SERVICE_ADVERT');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('MESSAGE', 'REQUEST', 'REFERRAL', 'LISTING', 'SAVED_LISTING', 'MEMBERSHIP', 'VERIFICATION', 'REVIEW', 'SYSTEM');

-- CreateEnum
CREATE TYPE "AlertFrequency" AS ENUM ('INSTANT', 'DAILY', 'OFF');

-- CreateEnum
CREATE TYPE "AcquisitionSource" AS ENUM ('SOCIAL_MEDIA', 'EMAIL', 'SEARCH_ENGINE', 'REFERRAL', 'WORD_OF_MOUTH', 'PRESS', 'OTHER');

-- CreateEnum
CREATE TYPE "ProviderReferralStatus" AS ENUM ('SIGNED_UP', 'QUALIFIED');

-- CreateEnum
CREATE TYPE "ViewingStatus" AS ENUM ('PROPOSED', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "ReferralOrgRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "PlacementHealth" AS ENUM ('GOING_WELL', 'SOME_CONCERNS', 'AT_RISK', 'ENDED');

-- CreateEnum
CREATE TYPE "ServiceBusinessStatus" AS ENUM ('ONBOARDING', 'PENDING_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "ServiceAdvertStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'ACTIVE', 'PAUSED', 'REJECTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ServicePlanTier" AS ENUM ('FREE', 'STANDARD', 'PRO');

-- CreateEnum
CREATE TYPE "ServicePriceType" AS ENUM ('FIXED', 'FROM', 'RANGE', 'HOURLY', 'QUOTE');

-- CreateEnum
CREATE TYPE "ServiceQuoteStatus" AS ENUM ('NEW', 'VIEWED', 'QUOTED', 'ACCEPTED', 'DECLINED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ServiceUrgency" AS ENUM ('FLEXIBLE', 'WITHIN_A_MONTH', 'WITHIN_A_WEEK', 'URGENT', 'EMERGENCY');

-- CreateEnum
CREATE TYPE "ServiceEvidenceType" AS ENUM ('PUBLIC_LIABILITY', 'EMPLOYERS_LIABILITY', 'INCORPORATION', 'QUALIFICATION', 'LICENCE', 'ACCREDITATION', 'OTHER');

-- CreateEnum
CREATE TYPE "ServiceEvidenceStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "SupportOrgStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "SupportScope" AS ENUM ('NATIONAL', 'LOCAL');

-- CreateEnum
CREATE TYPE "SupportPostKind" AS ENUM ('EVENT', 'TRAINING', 'ANNOUNCEMENT', 'SERVICE_UPDATE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "adminPermissions" TEXT[] DEFAULT ARRAY['ALL']::TEXT[],
    "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "locationLabel" TEXT,
    "contactMethod" "ContactMethod" NOT NULL DEFAULT 'MESSAGE',
    "avatarUrl" TEXT,
    "organisation" TEXT,
    "jobTitle" TEXT,
    "socialLinks" JSONB,
    "emailVerified" TIMESTAMP(3),
    "emailVerificationRequired" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMP(3),
    "tokenVersion" INTEGER NOT NULL DEFAULT 0,
    "passwordChangedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "retainUntil" TIMESTAMP(3),
    "acquisitionSource" "AcquisitionSource",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailVerificationToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "photoUrl" TEXT,
    "about" TEXT,
    "accommodationNeeds" TEXT,
    "supportNeeds" TEXT,
    "preferredLocations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "preferredTypes" "AccommodationType"[] DEFAULT ARRAY[]::"AccommodationType"[],
    "genderArrangement" "GenderArrangement" NOT NULL DEFAULT 'ANY',
    "dateOfBirth" TIMESTAMP(3),
    "availableFrom" TIMESTAMP(3),
    "accessibilityNeeds" TEXT,
    "otherRequirements" TEXT,
    "supportTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "publicProfile" BOOLEAN NOT NULL DEFAULT false,
    "showPhoto" BOOLEAN NOT NULL DEFAULT false,
    "showAge" BOOLEAN NOT NULL DEFAULT true,
    "showLocation" BOOLEAN NOT NULL DEFAULT true,
    "discoverable" BOOLEAN NOT NULL DEFAULT false,
    "socialLinks" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tradingName" TEXT,
    "slug" TEXT NOT NULL,
    "registrationNumber" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "whatsappEnabled" BOOLEAN NOT NULL DEFAULT false,
    "whatsappNumber" TEXT,
    "whatsappAddonStatus" "SubscriptionStatus",
    "whatsappAddonSubscriptionId" TEXT,
    "whatsappAddonPeriodEnd" TIMESTAMP(3),
    "whatsappAddonCancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "whatsappGrantActive" BOOLEAN NOT NULL DEFAULT false,
    "whatsappGrantExpiresAt" TIMESTAMP(3),
    "website" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "postcode" TEXT,
    "operatingAreas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "orgType" "OrgType" NOT NULL DEFAULT 'SUPPORTED_ACCOMMODATION_PROVIDER',
    "about" TEXT,
    "logoUrl" TEXT,
    "bannerUrl" TEXT,
    "socialLinks" JSONB,
    "supportTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "verification" "VerificationStatus" NOT NULL DEFAULT 'NOT_REQUESTED',
    "verifiedAt" TIMESTAMP(3),
    "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "boostCredits" INTEGER NOT NULL DEFAULT 0,
    "referralCode" TEXT,
    "referralRewardsClaimed" INTEGER NOT NULL DEFAULT 0,
    "freeSponsorMonths" INTEGER NOT NULL DEFAULT 0,
    "responseMinutes" INTEGER,
    "responseSampleSize" INTEGER NOT NULL DEFAULT 0,
    "weeklySummary" BOOLEAN NOT NULL DEFAULT true,
    "weeklySummarySentAt" TIMESTAMP(3),
    "weeklySummaryViews" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuickReply" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuickReply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderAccreditation" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "scheme" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rating" TEXT,
    "referenceNumber" TEXT,
    "publicUrl" TEXT,
    "status" "AccreditationStatus" NOT NULL DEFAULT 'UNDER_ASSESSMENT',
    "submittedBy" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderAccreditation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyStaff" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "staffRole" "StaffRole" NOT NULL DEFAULT 'STAFF',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyStaff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Property" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT NOT NULL,
    "area" TEXT,
    "postcode" TEXT NOT NULL,
    "showExactAddress" BOOLEAN NOT NULL DEFAULT false,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "propertyType" "AccommodationType" NOT NULL DEFAULT 'SHARED_ACCOMMODATION',
    "bedrooms" INTEGER NOT NULL DEFAULT 1,
    "verification" "VerificationStatus" NOT NULL DEFAULT 'NOT_REQUESTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "RoomStatus" NOT NULL DEFAULT 'AVAILABLE',
    "monthlyRent" INTEGER,
    "weeklyRent" INTEGER,
    "ensuite" BOOLEAN NOT NULL DEFAULT false,
    "furnished" BOOLEAN NOT NULL DEFAULT true,
    "sizeSqm" DOUBLE PRECISION,
    "availableFrom" TIMESTAMP(3),
    "vacantSince" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "listingId" TEXT,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Listing" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "description" TEXT,
    "status" "ListingStatus" NOT NULL DEFAULT 'DRAFT',
    "accommodationType" "AccommodationType" NOT NULL DEFAULT 'SHARED_ACCOMMODATION',
    "genderArrangement" "GenderArrangement" NOT NULL DEFAULT 'ANY',
    "minAge" INTEGER,
    "maxAge" INTEGER,
    "ensuite" BOOLEAN NOT NULL DEFAULT false,
    "furnished" BOOLEAN NOT NULL DEFAULT true,
    "selfContained" BOOLEAN NOT NULL DEFAULT false,
    "sharedFacilities" BOOLEAN NOT NULL DEFAULT true,
    "wheelchairAccess" BOOLEAN NOT NULL DEFAULT false,
    "accessibilityNotes" TEXT,
    "petsAllowed" BOOLEAN NOT NULL DEFAULT false,
    "supportTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "supportDescription" TEXT,
    "supportAvailability" TEXT,
    "supportProvider" TEXT,
    "referralRoutes" "ReferralRoute"[] DEFAULT ARRAY[]::"ReferralRoute"[],
    "eligibility" TEXT,
    "referralProcess" TEXT,
    "houseRules" TEXT,
    "weeklyRentFrom" INTEGER,
    "weeklyRentTo" INTEGER,
    "billsIncluded" BOOLEAN NOT NULL DEFAULT true,
    "housingBenefit" BOOLEAN NOT NULL DEFAULT true,
    "availableFrom" TIMESTAMP(3),
    "pausedReason" TEXT,
    "availabilityConfirmedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "staleNudgeSentAt" TIMESTAMP(3),
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "featuredUntil" TIMESTAMP(3),
    "sponsoredBid" INTEGER NOT NULL DEFAULT 0,
    "sponsoredImpressions" INTEGER NOT NULL DEFAULT 0,
    "sponsoredClicks" INTEGER NOT NULL DEFAULT 0,
    "boostStartsAt" TIMESTAMP(3),
    "boostPriorityUntil" TIMESTAMP(3),
    "boostedUntil" TIMESTAMP(3),
    "boostedImpressions" INTEGER NOT NULL DEFAULT 0,
    "boostedClicks" INTEGER NOT NULL DEFAULT 0,
    "views" INTEGER NOT NULL DEFAULT 0,
    "enquiries" INTEGER NOT NULL DEFAULT 0,
    "whatsappClicks" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3),
    "rejectionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Listing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListingMedia" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "type" "MediaType" NOT NULL DEFAULT 'IMAGE',
    "url" TEXT NOT NULL,
    "storageKey" TEXT,
    "caption" TEXT,
    "roomId" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListingMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LookingForAd" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "postcode" TEXT,
    "radiusMiles" INTEGER NOT NULL DEFAULT 10,
    "accommodationTypes" "AccommodationType"[] DEFAULT ARRAY[]::"AccommodationType"[],
    "supportTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "moveInDate" TIMESTAMP(3),
    "budgetWeekly" INTEGER,
    "genderArrangement" "GenderArrangement" NOT NULL DEFAULT 'ANY',
    "age" INTEGER,
    "accessibilityNeeds" TEXT,
    "about" TEXT,
    "lookingFor" TEXT,
    "photoUrl" TEXT,
    "videoUrl" TEXT,
    "status" "ListingStatus" NOT NULL DEFAULT 'ACTIVE',
    "views" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LookingForAd_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccommodationRequest" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "moveInDate" TIMESTAMP(3),
    "accommodationNeeds" TEXT,
    "supportNeeds" TEXT,
    "additionalInfo" TEXT,
    "status" "RequestStatus" NOT NULL DEFAULT 'SUBMITTED',
    "statusNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "AccommodationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Referral" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "listingId" TEXT,
    "referrerId" TEXT NOT NULL,
    "clientId" TEXT,
    "applicantFirstName" TEXT NOT NULL,
    "applicantLastName" TEXT NOT NULL,
    "applicantDob" TIMESTAMP(3),
    "applicantPhone" TEXT,
    "applicantEmail" TEXT,
    "applicantUserId" TEXT,
    "organisation" TEXT,
    "referrerJobTitle" TEXT,
    "preferredLocation" TEXT,
    "accommodationNeeds" TEXT,
    "supportNeeds" TEXT,
    "supportTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "urgency" "Urgency" NOT NULL DEFAULT 'MEDIUM',
    "additionalInfo" TEXT,
    "dataSharingBasis" "ReferralDataBasis",
    "dataSharingConfirmedAt" TIMESTAMP(3),
    "specialCategoryConditionConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "privacyNoticeVersion" TEXT,
    "status" "ReferralStatus" NOT NULL DEFAULT 'SUBMITTED',
    "statusNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "checkIn4SentAt" TIMESTAMP(3),
    "checkIn12SentAt" TIMESTAMP(3),

    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderReview" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "referralId" TEXT NOT NULL,
    "referrerId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderReferral" (
    "id" TEXT NOT NULL,
    "referrerCompanyId" TEXT NOT NULL,
    "referredCompanyId" TEXT NOT NULL,
    "status" "ProviderReferralStatus" NOT NULL DEFAULT 'SIGNED_UP',
    "qualifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderReferral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "referrerId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "phone" TEXT,
    "email" TEXT,
    "preferredLocation" TEXT,
    "accommodationNeeds" TEXT,
    "supportNeeds" TEXT,
    "supportTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "riskNotes" TEXT,
    "status" "ClientStatus" NOT NULL DEFAULT 'ACTIVE',
    "photoUrl" TEXT,
    "deletedAt" TIMESTAMP(3),
    "assessment" JSONB,
    "assessedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientShare" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "sharedById" TEXT NOT NULL,
    "note" TEXT,
    "reviewStatus" TEXT,
    "reviewNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientShare_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferrerProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "agencyType" TEXT,
    "bannerUrl" TEXT,
    "logoUrl" TEXT,
    "about" TEXT,
    "website" TEXT,
    "publicEmail" TEXT,
    "publicPhone" TEXT,
    "areasCovered" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "specialisms" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferrerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralEvent" (
    "id" TEXT NOT NULL,
    "referralId" TEXT NOT NULL,
    "status" "ReferralStatus" NOT NULL,
    "note" TEXT,
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferralEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "requestId" TEXT,
    "referralId" TEXT,
    "roomId" TEXT,
    "stage" TEXT NOT NULL DEFAULT 'new',
    "assignedTo" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Viewing" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "requestId" TEXT,
    "referralId" TEXT,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "status" "ViewingStatus" NOT NULL DEFAULT 'PROPOSED',
    "outcomeNote" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Viewing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "subject" TEXT,
    "listingId" TEXT,
    "lookingForAdId" TEXT,
    "companyId" TEXT,
    "serviceBusinessId" TEXT,
    "serviceAdvertId" TEXT,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationParticipant" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyId" TEXT,
    "lastReadAt" TIMESTAMP(3),
    "archived" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ConversationParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "attachmentUrl" TEXT,
    "attachmentName" TEXT,
    "attachmentType" TEXT,
    "clientId" TEXT,
    "clientCard" JSONB,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "pinnedAt" TIMESTAMP(3),
    "pinnedById" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Block" (
    "id" TEXT NOT NULL,
    "blockerId" TEXT NOT NULL,
    "blockedId" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Block_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedListing" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "notify" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedSearch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "where" TEXT,
    "radius" INTEGER,
    "support" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "type" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "gender" TEXT,
    "minAge" INTEGER,
    "wheelchair" BOOLEAN NOT NULL DEFAULT false,
    "furnished" BOOLEAN NOT NULL DEFAULT false,
    "ensuite" BOOLEAN NOT NULL DEFAULT false,
    "selfContained" BOOLEAN NOT NULL DEFAULT false,
    "petsAllowed" BOOLEAN NOT NULL DEFAULT false,
    "resident" TEXT,
    "housingBenefit" BOOLEAN NOT NULL DEFAULT false,
    "referral" "ReferralRoute"[] DEFAULT ARRAY[]::"ReferralRoute"[],
    "verifiedOnly" BOOLEAN NOT NULL DEFAULT false,
    "minRent" INTEGER,
    "maxRent" INTEGER,
    "frequency" "AlertFrequency" NOT NULL DEFAULT 'INSTANT',
    "lastAlertedAt" TIMESTAMP(3),
    "lastDigestAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedSearch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL DEFAULT 'SYSTEM',
    "title" TEXT NOT NULL,
    "body" TEXT,
    "href" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "tier" "MembershipTier" NOT NULL,
    "audience" "MembershipAudience" NOT NULL DEFAULT 'PROVIDER',
    "name" TEXT NOT NULL,
    "priceMonthly" INTEGER NOT NULL,
    "priceYearly" INTEGER,
    "maxListings" INTEGER NOT NULL,
    "maxRooms" INTEGER NOT NULL,
    "maxStaff" INTEGER NOT NULL,
    "maxPhotos" INTEGER NOT NULL DEFAULT 15,
    "videoUploads" BOOLEAN NOT NULL DEFAULT false,
    "analytics" BOOLEAN NOT NULL DEFAULT false,
    "priorityPlacement" BOOLEAN NOT NULL DEFAULT false,
    "featuredCredits" INTEGER NOT NULL DEFAULT 0,
    "includedBoosts" INTEGER NOT NULL DEFAULT 0,
    "enhancedProfile" BOOLEAN NOT NULL DEFAULT false,
    "prioritySupport" BOOLEAN NOT NULL DEFAULT false,
    "externalPriceId" TEXT,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "maxClients" INTEGER NOT NULL DEFAULT -1,
    "maxSharesPerClient" INTEGER NOT NULL DEFAULT -1,
    "priorityRouting" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MembershipGrant" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "grantedById" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MembershipGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserMembershipGrant" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "grantedById" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserMembershipGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "currentPeriodStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "billingProvider" TEXT,
    "externalCustomerId" TEXT,
    "externalSubscriptionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferrerSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "currentPeriodStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "billingProvider" TEXT,
    "externalCustomerId" TEXT,
    "externalSubscriptionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferrerSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferrerPayment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "kind" "PaymentKind" NOT NULL DEFAULT 'SUBSCRIPTION',
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "description" TEXT,
    "externalPaymentId" TEXT,
    "invoiceUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferrerPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "kind" "PaymentKind" NOT NULL DEFAULT 'SUBSCRIPTION',
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "description" TEXT,
    "externalPaymentId" TEXT,
    "invoiceUrl" TEXT,
    "boostSource" TEXT,
    "boostListingId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationRequest" (
    "id" TEXT NOT NULL,
    "type" "VerificationType" NOT NULL DEFAULT 'COMPANY',
    "companyId" TEXT NOT NULL,
    "propertyId" TEXT,
    "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "submittedBy" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "note" TEXT,
    "reviewNote" TEXT,
    "insuranceExpiresAt" TIMESTAMP(3),
    "insuranceReminderSentAt" TIMESTAMP(3),
    "declarationAcceptedAt" TIMESTAMP(3),
    "checklistVersion" TEXT NOT NULL DEFAULT '2026-09',
    "registrationChecked" BOOLEAN NOT NULL DEFAULT false,
    "insuranceChecked" BOOLEAN NOT NULL DEFAULT false,
    "governanceChecked" BOOLEAN NOT NULL DEFAULT false,
    "safeguardingChecked" BOOLEAN NOT NULL DEFAULT false,
    "identityChecked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "targetType" "ReportTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "reason" "ReportReason" NOT NULL,
    "detail" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
    "resolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportEvent" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "actorId" TEXT,
    "status" "ReportStatus" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT,
    "companyId" TEXT,
    "referralId" TEXT,
    "requestId" TEXT,
    "verificationRequestId" TEXT,
    "accreditationId" TEXT,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "url" TEXT NOT NULL,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "isPrivate" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "metadata" JSONB,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportType" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "SupportType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocationArea" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "region" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "LocationArea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralOrganisation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferralOrganisation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralOrgMember" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "ReferralOrgRole" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferralOrgMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralOrgInvite" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "ReferralOrgRole" NOT NULL DEFAULT 'MEMBER',
    "tokenHash" TEXT NOT NULL,
    "invitedById" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferralOrgInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomAlert" (
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

-- CreateTable
CREATE TABLE "ShortlistItem" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "note" TEXT,
    "addedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShortlistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlacementCheckIn" (
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

-- CreateTable
CREATE TABLE "CouncilAccess" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "councilName" TEXT NOT NULL,
    "areas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "grantedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CouncilAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResidentReview" (
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

-- CreateTable
CREATE TABLE "ServiceBusiness" (
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
    "categories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "areas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "postcodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
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
    "portfolio" TEXT[] DEFAULT ARRAY[]::TEXT[],
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

-- CreateTable
CREATE TABLE "ServiceEvidence" (
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

-- CreateTable
CREATE TABLE "ServiceSubscription" (
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

-- CreateTable
CREATE TABLE "ServiceAdvert" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subcategory" TEXT,
    "description" TEXT NOT NULL,
    "locations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "nationwide" BOOLEAN NOT NULL DEFAULT false,
    "priceType" "ServicePriceType" NOT NULL DEFAULT 'QUOTE',
    "priceFrom" INTEGER,
    "priceTo" INTEGER,
    "priceUnit" TEXT,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
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
    "sponsoredUntil" TIMESTAMP(3),
    "sponsoredBid" INTEGER NOT NULL DEFAULT 0,
    "sponsoredImpressions" INTEGER NOT NULL DEFAULT 0,
    "sponsoredClicks" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceAdvert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceBoost" (
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

-- CreateTable
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

-- CreateTable
CREATE TABLE "ServiceQuoteRequest" (
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
    "completionNote" TEXT,
    "completionPhotos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceQuoteRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceFavourite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "advertId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceFavourite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceReview" (
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

-- CreateTable
CREATE TABLE "ServiceEvent" (
    "id" TEXT NOT NULL,
    "businessId" TEXT,
    "advertId" TEXT,
    "type" TEXT NOT NULL,
    "category" TEXT,
    "location" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportOrganisation" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "description" TEXT,
    "categories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "scope" "SupportScope" NOT NULL DEFAULT 'LOCAL',
    "areas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "phone" TEXT,
    "phoneNote" TEXT,
    "otherPhones" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "textNumber" TEXT,
    "email" TEXT,
    "website" TEXT,
    "hours" TEXT,
    "howToAccess" TEXT,
    "crisis" BOOLEAN NOT NULL DEFAULT false,
    "status" "SupportOrgStatus" NOT NULL DEFAULT 'PENDING',
    "statusReason" TEXT,
    "ownerId" TEXT,
    "seedKey" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "views" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportOrganisation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportLocation" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "postcode" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "hours" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportPost" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "kind" "SupportPostKind" NOT NULL DEFAULT 'ANNOUNCEMENT',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "audience" TEXT NOT NULL DEFAULT 'everyone',
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "venue" TEXT,
    "free" BOOLEAN NOT NULL DEFAULT true,
    "bookingUrl" TEXT,
    "removedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsappClick" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT,
    "signedIn" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsappClick_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_status_idx" ON "User"("role", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_expiresAt_idx" ON "PasswordResetToken"("userId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "EmailVerificationToken_tokenHash_key" ON "EmailVerificationToken"("tokenHash");

-- CreateIndex
CREATE INDEX "EmailVerificationToken_userId_expiresAt_idx" ON "EmailVerificationToken"("userId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_userId_key" ON "UserProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Company_slug_key" ON "Company"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Company_referralCode_key" ON "Company"("referralCode");

-- CreateIndex
CREATE INDEX "Company_city_idx" ON "Company"("city");

-- CreateIndex
CREATE INDEX "QuickReply_companyId_createdAt_idx" ON "QuickReply"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "ProviderAccreditation_companyId_status_idx" ON "ProviderAccreditation"("companyId", "status");

-- CreateIndex
CREATE INDEX "ProviderAccreditation_status_createdAt_idx" ON "ProviderAccreditation"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyStaff_companyId_userId_key" ON "CompanyStaff"("companyId", "userId");

-- CreateIndex
CREATE INDEX "Property_city_idx" ON "Property"("city");

-- CreateIndex
CREATE INDEX "Property_latitude_longitude_idx" ON "Property"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "Room_propertyId_status_idx" ON "Room"("propertyId", "status");

-- CreateIndex
CREATE INDEX "Room_listingId_status_idx" ON "Room"("listingId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Listing_reference_key" ON "Listing"("reference");

-- CreateIndex
CREATE INDEX "Listing_status_featured_featuredUntil_idx" ON "Listing"("status", "featured", "featuredUntil");

-- CreateIndex
CREATE INDEX "Listing_status_boostedUntil_boostStartsAt_idx" ON "Listing"("status", "boostedUntil", "boostStartsAt");

-- CreateIndex
CREATE INDEX "Listing_status_publishedAt_idx" ON "Listing"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "Listing_status_weeklyRentFrom_idx" ON "Listing"("status", "weeklyRentFrom");

-- CreateIndex
CREATE INDEX "Listing_status_availableFrom_publishedAt_idx" ON "Listing"("status", "availableFrom", "publishedAt");

-- CreateIndex
CREATE INDEX "Listing_status_accommodationType_publishedAt_idx" ON "Listing"("status", "accommodationType", "publishedAt");

-- CreateIndex
CREATE INDEX "Listing_status_availabilityConfirmedAt_idx" ON "Listing"("status", "availabilityConfirmedAt");

-- CreateIndex
CREATE INDEX "Listing_companyId_status_updatedAt_idx" ON "Listing"("companyId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "Listing_companyId_idx" ON "Listing"("companyId");

-- CreateIndex
CREATE INDEX "ListingMedia_listingId_position_idx" ON "ListingMedia"("listingId", "position");

-- CreateIndex
CREATE INDEX "ListingMedia_roomId_position_idx" ON "ListingMedia"("roomId", "position");

-- CreateIndex
CREATE INDEX "LookingForAd_city_status_idx" ON "LookingForAd"("city", "status");

-- CreateIndex
CREATE INDEX "AccommodationRequest_status_idx" ON "AccommodationRequest"("status");

-- CreateIndex
CREATE INDEX "AccommodationRequest_applicantId_status_idx" ON "AccommodationRequest"("applicantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "AccommodationRequest_listingId_applicantId_key" ON "AccommodationRequest"("listingId", "applicantId");

-- CreateIndex
CREATE UNIQUE INDEX "Referral_reference_key" ON "Referral"("reference");

-- CreateIndex
CREATE INDEX "Referral_status_idx" ON "Referral"("status");

-- CreateIndex
CREATE INDEX "Referral_clientId_idx" ON "Referral"("clientId");

-- CreateIndex
CREATE INDEX "Referral_referrerId_status_idx" ON "Referral"("referrerId", "status");

-- CreateIndex
CREATE INDEX "Referral_listingId_createdAt_idx" ON "Referral"("listingId", "createdAt");

-- CreateIndex
CREATE INDEX "Referral_createdAt_idx" ON "Referral"("createdAt");

-- CreateIndex
CREATE INDEX "Referral_applicantEmail_idx" ON "Referral"("applicantEmail");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderReview_referralId_key" ON "ProviderReview"("referralId");

-- CreateIndex
CREATE INDEX "ProviderReview_companyId_createdAt_idx" ON "ProviderReview"("companyId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderReferral_referredCompanyId_key" ON "ProviderReferral"("referredCompanyId");

-- CreateIndex
CREATE INDEX "ProviderReferral_referrerCompanyId_status_idx" ON "ProviderReferral"("referrerCompanyId", "status");

-- CreateIndex
CREATE INDEX "Client_referrerId_status_idx" ON "Client"("referrerId", "status");

-- CreateIndex
CREATE INDEX "Client_referrerId_deletedAt_idx" ON "Client"("referrerId", "deletedAt");

-- CreateIndex
CREATE INDEX "ClientShare_companyId_revokedAt_idx" ON "ClientShare"("companyId", "revokedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ClientShare_clientId_companyId_key" ON "ClientShare"("clientId", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "ReferrerProfile_userId_key" ON "ReferrerProfile"("userId");

-- CreateIndex
CREATE INDEX "ReferralEvent_referralId_createdAt_idx" ON "ReferralEvent"("referralId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Application_requestId_key" ON "Application"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "Application_referralId_key" ON "Application"("referralId");

-- CreateIndex
CREATE INDEX "Viewing_listingId_idx" ON "Viewing"("listingId");

-- CreateIndex
CREATE INDEX "Viewing_requestId_idx" ON "Viewing"("requestId");

-- CreateIndex
CREATE INDEX "Viewing_referralId_idx" ON "Viewing"("referralId");

-- CreateIndex
CREATE INDEX "Viewing_status_scheduledFor_idx" ON "Viewing"("status", "scheduledFor");

-- CreateIndex
CREATE INDEX "Conversation_lastMessageAt_idx" ON "Conversation"("lastMessageAt");

-- CreateIndex
CREATE INDEX "Conversation_serviceBusinessId_idx" ON "Conversation"("serviceBusinessId");

-- CreateIndex
CREATE INDEX "ConversationParticipant_userId_archived_idx" ON "ConversationParticipant"("userId", "archived");

-- CreateIndex
CREATE UNIQUE INDEX "ConversationParticipant_conversationId_userId_key" ON "ConversationParticipant"("conversationId", "userId");

-- CreateIndex
CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Block_blockerId_blockedId_key" ON "Block"("blockerId", "blockedId");

-- CreateIndex
CREATE INDEX "SavedListing_listingId_idx" ON "SavedListing"("listingId");

-- CreateIndex
CREATE UNIQUE INDEX "SavedListing_userId_listingId_key" ON "SavedListing"("userId", "listingId");

-- CreateIndex
CREATE INDEX "SavedSearch_userId_idx" ON "SavedSearch"("userId");

-- CreateIndex
CREATE INDEX "SavedSearch_frequency_idx" ON "SavedSearch"("frequency");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_tier_key" ON "Membership"("tier");

-- CreateIndex
CREATE INDEX "MembershipGrant_companyId_revokedAt_expiresAt_idx" ON "MembershipGrant"("companyId", "revokedAt", "expiresAt");

-- CreateIndex
CREATE INDEX "MembershipGrant_grantedById_createdAt_idx" ON "MembershipGrant"("grantedById", "createdAt");

-- CreateIndex
CREATE INDEX "UserMembershipGrant_userId_revokedAt_expiresAt_idx" ON "UserMembershipGrant"("userId", "revokedAt", "expiresAt");

-- CreateIndex
CREATE INDEX "UserMembershipGrant_grantedById_createdAt_idx" ON "UserMembershipGrant"("grantedById", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_companyId_key" ON "Subscription"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "ReferrerSubscription_userId_key" ON "ReferrerSubscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ReferrerPayment_externalPaymentId_key" ON "ReferrerPayment"("externalPaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_externalPaymentId_key" ON "Payment"("externalPaymentId");

-- CreateIndex
CREATE INDEX "Payment_companyId_kind_boostSource_createdAt_idx" ON "Payment"("companyId", "kind", "boostSource", "createdAt");

-- CreateIndex
CREATE INDEX "VerificationRequest_status_idx" ON "VerificationRequest"("status");

-- CreateIndex
CREATE INDEX "VerificationRequest_companyId_idx" ON "VerificationRequest"("companyId");

-- CreateIndex
CREATE INDEX "Report_status_idx" ON "Report"("status");

-- CreateIndex
CREATE INDEX "Report_archivedAt_createdAt_idx" ON "Report"("archivedAt", "createdAt");

-- CreateIndex
CREATE INDEX "ReportEvent_reportId_createdAt_idx" ON "ReportEvent"("reportId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_targetType_targetId_idx" ON "AuditLog"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SupportType_slug_key" ON "SupportType"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "LocationArea_slug_key" ON "LocationArea"("slug");

-- CreateIndex
CREATE INDEX "ReferralOrganisation_ownerId_idx" ON "ReferralOrganisation"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "ReferralOrgMember_userId_key" ON "ReferralOrgMember"("userId");

-- CreateIndex
CREATE INDEX "ReferralOrgMember_organisationId_idx" ON "ReferralOrgMember"("organisationId");

-- CreateIndex
CREATE UNIQUE INDEX "ReferralOrgInvite_tokenHash_key" ON "ReferralOrgInvite"("tokenHash");

-- CreateIndex
CREATE INDEX "ReferralOrgInvite_organisationId_acceptedAt_idx" ON "ReferralOrgInvite"("organisationId", "acceptedAt");

-- CreateIndex
CREATE INDEX "ReferralOrgInvite_email_idx" ON "ReferralOrgInvite"("email");

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- CreateIndex
CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RoomAlert_token_key" ON "RoomAlert"("token");

-- CreateIndex
CREATE INDEX "RoomAlert_confirmedAt_idx" ON "RoomAlert"("confirmedAt");

-- CreateIndex
CREATE INDEX "RoomAlert_email_idx" ON "RoomAlert"("email");

-- CreateIndex
CREATE INDEX "RoomAlert_phone_idx" ON "RoomAlert"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "ShortlistItem_clientId_listingId_key" ON "ShortlistItem"("clientId", "listingId");

-- CreateIndex
CREATE INDEX "PlacementCheckIn_health_idx" ON "PlacementCheckIn"("health");

-- CreateIndex
CREATE UNIQUE INDEX "PlacementCheckIn_referralId_week_side_key" ON "PlacementCheckIn"("referralId", "week", "side");

-- CreateIndex
CREATE UNIQUE INDEX "CouncilAccess_userId_key" ON "CouncilAccess"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ResidentReview_requestId_key" ON "ResidentReview"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "ResidentReview_referralId_key" ON "ResidentReview"("referralId");

-- CreateIndex
CREATE INDEX "ResidentReview_companyId_hiddenAt_createdAt_idx" ON "ResidentReview"("companyId", "hiddenAt", "createdAt");

-- CreateIndex
CREATE INDEX "ResidentReview_listingId_idx" ON "ResidentReview"("listingId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceBusiness_ownerId_key" ON "ServiceBusiness"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceBusiness_slug_key" ON "ServiceBusiness"("slug");

-- CreateIndex
CREATE INDEX "ServiceBusiness_status_idx" ON "ServiceBusiness"("status");

-- CreateIndex
CREATE INDEX "ServiceEvidence_businessId_status_idx" ON "ServiceEvidence"("businessId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceSubscription_businessId_key" ON "ServiceSubscription"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceSubscription_externalSubscriptionId_key" ON "ServiceSubscription"("externalSubscriptionId");

-- CreateIndex
CREATE INDEX "ServiceAdvert_status_category_idx" ON "ServiceAdvert"("status", "category");

-- CreateIndex
CREATE INDEX "ServiceAdvert_businessId_status_idx" ON "ServiceAdvert"("businessId", "status");

-- CreateIndex
CREATE INDEX "ServiceAdvert_status_sponsoredUntil_sponsoredBid_idx" ON "ServiceAdvert"("status", "sponsoredUntil", "sponsoredBid");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceBoost_externalPaymentId_key" ON "ServiceBoost"("externalPaymentId");

-- CreateIndex
CREATE INDEX "ServiceBoost_advertId_endsAt_idx" ON "ServiceBoost"("advertId", "endsAt");

-- CreateIndex
CREATE INDEX "ServiceBoost_endsAt_idx" ON "ServiceBoost"("endsAt");

-- CreateIndex
CREATE UNIQUE INDEX "ServicePromotionPurchase_externalPaymentId_key" ON "ServicePromotionPurchase"("externalPaymentId");

-- CreateIndex
CREATE INDEX "ServicePromotionPurchase_businessId_kind_createdAt_idx" ON "ServicePromotionPurchase"("businessId", "kind", "createdAt");

-- CreateIndex
CREATE INDEX "ServicePromotionPurchase_advertId_kind_createdAt_idx" ON "ServicePromotionPurchase"("advertId", "kind", "createdAt");

-- CreateIndex
CREATE INDEX "ServiceQuoteRequest_businessId_status_idx" ON "ServiceQuoteRequest"("businessId", "status");

-- CreateIndex
CREATE INDEX "ServiceQuoteRequest_companyId_status_idx" ON "ServiceQuoteRequest"("companyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceFavourite_userId_advertId_key" ON "ServiceFavourite"("userId", "advertId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceReview_quoteId_key" ON "ServiceReview"("quoteId");

-- CreateIndex
CREATE INDEX "ServiceReview_businessId_hiddenAt_idx" ON "ServiceReview"("businessId", "hiddenAt");

-- CreateIndex
CREATE INDEX "ServiceEvent_businessId_type_createdAt_idx" ON "ServiceEvent"("businessId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "ServiceEvent_type_createdAt_idx" ON "ServiceEvent"("type", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SupportOrganisation_slug_key" ON "SupportOrganisation"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "SupportOrganisation_ownerId_key" ON "SupportOrganisation"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "SupportOrganisation_seedKey_key" ON "SupportOrganisation"("seedKey");

-- CreateIndex
CREATE INDEX "SupportOrganisation_status_idx" ON "SupportOrganisation"("status");

-- CreateIndex
CREATE INDEX "SupportLocation_organisationId_idx" ON "SupportLocation"("organisationId");

-- CreateIndex
CREATE INDEX "SupportPost_organisationId_idx" ON "SupportPost"("organisationId");

-- CreateIndex
CREATE INDEX "SupportPost_startsAt_idx" ON "SupportPost"("startsAt");

-- CreateIndex
CREATE INDEX "WhatsappClick_createdAt_idx" ON "WhatsappClick"("createdAt");

-- CreateIndex
CREATE INDEX "WhatsappClick_companyId_createdAt_idx" ON "WhatsappClick"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "WhatsappClick_listingId_createdAt_idx" ON "WhatsappClick"("listingId", "createdAt");

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailVerificationToken" ADD CONSTRAINT "EmailVerificationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuickReply" ADD CONSTRAINT "QuickReply_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderAccreditation" ADD CONSTRAINT "ProviderAccreditation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyStaff" ADD CONSTRAINT "CompanyStaff_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyStaff" ADD CONSTRAINT "CompanyStaff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingMedia" ADD CONSTRAINT "ListingMedia_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingMedia" ADD CONSTRAINT "ListingMedia_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LookingForAd" ADD CONSTRAINT "LookingForAd_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccommodationRequest" ADD CONSTRAINT "AccommodationRequest_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccommodationRequest" ADD CONSTRAINT "AccommodationRequest_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderReview" ADD CONSTRAINT "ProviderReview_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderReview" ADD CONSTRAINT "ProviderReview_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "Referral"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderReview" ADD CONSTRAINT "ProviderReview_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderReferral" ADD CONSTRAINT "ProviderReferral_referrerCompanyId_fkey" FOREIGN KEY ("referrerCompanyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderReferral" ADD CONSTRAINT "ProviderReferral_referredCompanyId_fkey" FOREIGN KEY ("referredCompanyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientShare" ADD CONSTRAINT "ClientShare_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientShare" ADD CONSTRAINT "ClientShare_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientShare" ADD CONSTRAINT "ClientShare_sharedById_fkey" FOREIGN KEY ("sharedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferrerProfile" ADD CONSTRAINT "ReferrerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralEvent" ADD CONSTRAINT "ReferralEvent_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "Referral"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "AccommodationRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "Referral"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Viewing" ADD CONSTRAINT "Viewing_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Viewing" ADD CONSTRAINT "Viewing_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "AccommodationRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Viewing" ADD CONSTRAINT "Viewing_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "Referral"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_lookingForAdId_fkey" FOREIGN KEY ("lookingForAdId") REFERENCES "LookingForAd"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_serviceBusinessId_fkey" FOREIGN KEY ("serviceBusinessId") REFERENCES "ServiceBusiness"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_serviceAdvertId_fkey" FOREIGN KEY ("serviceAdvertId") REFERENCES "ServiceAdvert"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Block" ADD CONSTRAINT "Block_blockerId_fkey" FOREIGN KEY ("blockerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Block" ADD CONSTRAINT "Block_blockedId_fkey" FOREIGN KEY ("blockedId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedListing" ADD CONSTRAINT "SavedListing_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedListing" ADD CONSTRAINT "SavedListing_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedSearch" ADD CONSTRAINT "SavedSearch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipGrant" ADD CONSTRAINT "MembershipGrant_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipGrant" ADD CONSTRAINT "MembershipGrant_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipGrant" ADD CONSTRAINT "MembershipGrant_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMembershipGrant" ADD CONSTRAINT "UserMembershipGrant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMembershipGrant" ADD CONSTRAINT "UserMembershipGrant_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMembershipGrant" ADD CONSTRAINT "UserMembershipGrant_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferrerSubscription" ADD CONSTRAINT "ReferrerSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferrerSubscription" ADD CONSTRAINT "ReferrerSubscription_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferrerPayment" ADD CONSTRAINT "ReferrerPayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferrerPayment" ADD CONSTRAINT "ReferrerPayment_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "ReferrerSubscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationRequest" ADD CONSTRAINT "VerificationRequest_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportEvent" ADD CONSTRAINT "ReportEvent_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportEvent" ADD CONSTRAINT "ReportEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "Referral"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "AccommodationRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_verificationRequestId_fkey" FOREIGN KEY ("verificationRequestId") REFERENCES "VerificationRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_accreditationId_fkey" FOREIGN KEY ("accreditationId") REFERENCES "ProviderAccreditation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralOrganisation" ADD CONSTRAINT "ReferralOrganisation_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralOrgMember" ADD CONSTRAINT "ReferralOrgMember_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "ReferralOrganisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralOrgMember" ADD CONSTRAINT "ReferralOrgMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralOrgInvite" ADD CONSTRAINT "ReferralOrgInvite_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "ReferralOrganisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralOrgInvite" ADD CONSTRAINT "ReferralOrgInvite_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShortlistItem" ADD CONSTRAINT "ShortlistItem_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShortlistItem" ADD CONSTRAINT "ShortlistItem_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlacementCheckIn" ADD CONSTRAINT "PlacementCheckIn_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "Referral"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlacementCheckIn" ADD CONSTRAINT "PlacementCheckIn_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouncilAccess" ADD CONSTRAINT "CouncilAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResidentReview" ADD CONSTRAINT "ResidentReview_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResidentReview" ADD CONSTRAINT "ResidentReview_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResidentReview" ADD CONSTRAINT "ResidentReview_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceBusiness" ADD CONSTRAINT "ServiceBusiness_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceEvidence" ADD CONSTRAINT "ServiceEvidence_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "ServiceBusiness"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceSubscription" ADD CONSTRAINT "ServiceSubscription_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "ServiceBusiness"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceAdvert" ADD CONSTRAINT "ServiceAdvert_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "ServiceBusiness"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceBoost" ADD CONSTRAINT "ServiceBoost_advertId_fkey" FOREIGN KEY ("advertId") REFERENCES "ServiceAdvert"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceBoost" ADD CONSTRAINT "ServiceBoost_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "ServiceBusiness"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServicePromotionPurchase" ADD CONSTRAINT "ServicePromotionPurchase_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "ServiceBusiness"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServicePromotionPurchase" ADD CONSTRAINT "ServicePromotionPurchase_advertId_fkey" FOREIGN KEY ("advertId") REFERENCES "ServiceAdvert"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceQuoteRequest" ADD CONSTRAINT "ServiceQuoteRequest_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "ServiceBusiness"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceQuoteRequest" ADD CONSTRAINT "ServiceQuoteRequest_advertId_fkey" FOREIGN KEY ("advertId") REFERENCES "ServiceAdvert"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceQuoteRequest" ADD CONSTRAINT "ServiceQuoteRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceQuoteRequest" ADD CONSTRAINT "ServiceQuoteRequest_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceFavourite" ADD CONSTRAINT "ServiceFavourite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceFavourite" ADD CONSTRAINT "ServiceFavourite_advertId_fkey" FOREIGN KEY ("advertId") REFERENCES "ServiceAdvert"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceReview" ADD CONSTRAINT "ServiceReview_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "ServiceQuoteRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceReview" ADD CONSTRAINT "ServiceReview_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "ServiceBusiness"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceReview" ADD CONSTRAINT "ServiceReview_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceEvent" ADD CONSTRAINT "ServiceEvent_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "ServiceBusiness"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportOrganisation" ADD CONSTRAINT "SupportOrganisation_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportLocation" ADD CONSTRAINT "SupportLocation_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "SupportOrganisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportPost" ADD CONSTRAINT "SupportPost_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "SupportOrganisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

