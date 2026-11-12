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

/** Most-read published posts, for the News sidebar. */
export function popularNews(take = 4) {
  return db.newsPost.findMany({ where: live(), orderBy: [{ views: "desc" }, { publishedAt: "desc" }], take });
}

/** Active admins (full or moderator) who can be asked to keep a post up to date. */
export async function newsTeam() {
  const people = await db.user.findMany({
    where: { role: "ADMIN", status: "ACTIVE" },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    select: { id: true, firstName: true, lastName: true, adminPermissions: true },
  });
  return people.map((p) => ({ id: p.id, name: `${p.firstName} ${p.lastName}`.trim(), moderator: !p.adminPermissions.includes("ALL") }));
}
