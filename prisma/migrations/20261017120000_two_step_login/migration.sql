-- Two-step login (authenticator app) for admins
ALTER TABLE "User" ADD COLUMN "totpSecret" TEXT,
ADD COLUMN "totpEnabledAt" TIMESTAMP(3),
ADD COLUMN "totpLastStep" INTEGER,
ADD COLUMN "totpRecoveryCodes" TEXT[] DEFAULT ARRAY[]::TEXT[];
