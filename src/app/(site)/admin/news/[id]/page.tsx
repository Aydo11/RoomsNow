import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/rbac";
import { DashboardShell } from "@/components/dashboard-shell";
import { NewsPostForm } from "@/components/news-post-form";
import { adminNav } from "../../nav";

export const metadata = { title: "Edit news post" };
export const dynamic = "force-dynamic";

export default async function EditNewsPostPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ check?: string }> }) {
  await requireAdmin("ALL");
  const { id } = await params;
  const [nav, post] = await Promise.all([adminNav(), db.newsPost.findUnique({ where: { id } })]);
  if (!post) notFound();
  const { check } = await searchParams;

  return (
    <DashboardShell title="Edit news post" subtitle={post.title} nav={nav} active="/admin/news">
      <p className="mb-4 text-[14px]"><Link href="/admin/news" className="text-pine-dark hover:underline">← All news posts</Link></p>
      <NewsPostForm post={post} check={check === "1"} />
    </DashboardShell>
  );
}
