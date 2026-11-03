-- Official RoomsNow stories: posted by admins, not tied to a provider.
ALTER TABLE "ProviderStory" ALTER COLUMN "companyId" DROP NOT NULL;
ALTER TABLE "ProviderStory" ADD COLUMN "linkUrl" TEXT;
