-- Charity appeals can show bank transfer details; posts can pick a font
ALTER TABLE "NewsPost" ADD COLUMN "appealBankAccountName" TEXT;
ALTER TABLE "NewsPost" ADD COLUMN "appealBankSortCode" TEXT;
ALTER TABLE "NewsPost" ADD COLUMN "appealBankAccountNumber" TEXT;
ALTER TABLE "NewsPost" ADD COLUMN "appealBankReference" TEXT;
ALTER TABLE "NewsPost" ADD COLUMN "bodyFont" TEXT;
