import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/rbac";
import { shortDate } from "@/lib/format";
import { isNewsCategory, NEWS_CATEGORIES } from "@/lib/news";
import { DashboardShell } from "@/components/dashboard-shell";
import { NewsPostForm } from "@/components/news-post-form";
import { deleteNewsPostAction, setNewsPinnedAction, setNewsPublishedAction } from "@/server/actions/news";
import { adminNav } from "../nav";

export const metadata = { title: "News" };
export const dynamic = "force-dynamic";

export default async function AdminNewsPage() {
  await requireAdmin("ALL");
  const [nav, posts] = await Promise.all([adminNav(), db.newsPost.findMany({ orderBy: [{ publishedAt: { sort: "desc", nulls: "first" } }, { createdAt: "desc" }], take: 200 })]);

  return (
    <DashboardShell
      title="News"
      subtitle="Post RoomsNow news, charity appeals and sector news at /news. Tick “Show as the homepage banner” to promote one post at the top of the homepage."
      nav={nav}
      active="/admin/news"
    >
      <NewsPostForm />

      <h2 className="mt-8 text-lg">All posts</h2>
      {posts.length === 0 ? (
        <p className="mt-2 text-[15px] text-ink-soft">No posts yet.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {posts.map((post) => (
            <li key={post.id} className="card flex flex-wrap items-start justify-between gap-4 p-4">
              <div className="min-w-0 flex-1">
                <p className="text-[13px] text-ink-faint">
                  {isNewsCategory(post.category) ? NEWS_CATEGORIES[post.category].label : post.category} ·{" "}
                  {post.publishedAt ? <span className="font-semibold text-pine-dark">Live since {shortDate(post.publishedAt)}</span> : <span className="text-clay">Draft</span>}
                  {post.appealStatus && <span> · {post.appealStatus === "OPEN" ? "Open appeal" : "Closed appeal"}</span>}
                  {post.pinned && <span className="font-semibold text-pine-dark"> · {post.appealStatus === "CLOSED" ? "Pinned (hidden from homepage while closed)" : "Homepage banner"}</span>}
                </p>
                <p className="mt-1 font-semibold">
                  {post.publishedAt ? <Link href={`/news/${post.slug}`} className="hover:underline">{post.title}</Link> : post.title}
                </p>
                <p className="mt-0.5 text-[14px] text-ink-soft">{post.summary}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href={`/admin/news/${post.id}`} className="btn-secondary">Edit</Link>
                <form action={setNewsPublishedAction.bind(null, post.id, !post.publishedAt)}>
                  <button className="btn-secondary">{post.publishedAt ? "Unpublish" : "Publish"}</button>
                </form>
                {post.publishedAt && (
                  <form action={setNewsPinnedAction.bind(null, post.id, !post.pinned)}>
                    <button className="btn-secondary">{post.pinned ? "Remove banner" : "Make homepage banner"}</button>
                  </form>
                )}
                <form action={deleteNewsPostAction.bind(null, post.id)}>
                  <button className="btn-secondary text-clay">Delete</button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </DashboardShell>
  );
}
