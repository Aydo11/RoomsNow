-- Page views for the News "Popular" list
ALTER TABLE "NewsPost" ADD COLUMN "views" INTEGER NOT NULL DEFAULT 0;
