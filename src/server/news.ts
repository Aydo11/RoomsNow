import { db } from "@/lib/db";
import type { NewsCategory } from "@/lib/news";

const live = () => ({ publishedAt: { not: null, lte: new Date() } });

export function publishedNews(category?: NewsCategory, take = 30) {
  return db.newsPost.findMany({
    where: { ...live(), ...(category ? { category } : {}) },
    orderBy: { publishedAt: "desc" },
    take,
  });
}

export function newsPostBySlug(slug: string) {
  return db.newsPost.findFirst({ where: { slug, ...live() } });
}

/** The homepage banner: the newest pinned, published post. */
export function pinnedNews() {
  return db.newsPost.findFirst({
    // Closed appeals stay in News but never headline the homepage.
    where: { pinned: true, ...live(), OR: [{ appealStatus: null }, { appealStatus: { not: "CLOSED" } }] },
    orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    select: { slug: true, title: true, summary: true, category: true, appealStatus: true },
  });
}
