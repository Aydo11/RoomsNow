-- News posts: a byline, and a team member assigned to keep the post up to date
ALTER TABLE "NewsPost" ADD COLUMN "authorName" TEXT;
ALTER TABLE "NewsPost" ADD COLUMN "assigneeId" TEXT;
CREATE INDEX "NewsPost_assigneeId_idx" ON "NewsPost"("assigneeId");
