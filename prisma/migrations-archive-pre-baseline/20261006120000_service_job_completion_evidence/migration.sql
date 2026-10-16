-- Give service businesses a durable job record with optional completion notes
-- and photos. The images are uploaded by the business and remain attached to
-- the quote/job so both sides have a useful audit trail.
ALTER TABLE "ServiceQuoteRequest"
ADD COLUMN "completionNote" TEXT,
ADD COLUMN "completionPhotos" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
