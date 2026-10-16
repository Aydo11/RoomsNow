CREATE TYPE "ReferralDataBasis" AS ENUM (
  'CONSENT',
  'CONTRACT',
  'LEGAL_OBLIGATION',
  'VITAL_INTERESTS',
  'PUBLIC_TASK',
  'LEGITIMATE_INTERESTS',
  'RECOGNISED_LEGITIMATE_INTERESTS',
  'OTHER'
);

ALTER TABLE "Referral"
  ADD COLUMN "dataSharingBasis" "ReferralDataBasis",
  ADD COLUMN "dataSharingConfirmedAt" TIMESTAMP(3),
  ADD COLUMN "specialCategoryConditionConfirmed" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "privacyNoticeVersion" TEXT;
