import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/rbac";
import { DashboardShell } from "@/components/dashboard-shell";
import { NewsPostForm } from "@/components/news-post-form";
import { adminNav } from "../../nav";
import { hasAdminPermission } from "@/lib/admin-permissions";
import { canEditNews } from "@/lib/news";
import { newsTeam } from "@/server/news";

export const metadata = { title: "Edit news post" };
export const dynamic = "force-dynamic";

export default async function EditNewsPostPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ check?: string }> }) {
  const admin = await requireAdmin(["MODERATION", "NEWS"]);
  const fullAdmin = hasAdminPermission(admin, "NEWS");
  const { id } = await params;
  const [nav, post, team] = await Promise.all([adminNav(), db.newsPost.findUnique({ where: { id } }), newsTeam()]);
  if (!post || !canEditNews({ id: admin.id, fullAdmin }, post)) notFound();
  const { check } = await searchParams;

  return (
    <DashboardShell title="Edit news post" subtitle={post.title} nav={nav} active="/admin/news">
      <p className="mb-4 text-[14px]"><Link href="/admin/news" className="text-pine-dark hover:underline">← All news posts</Link></p>
      <NewsPostForm post={post} check={check === "1"} team={team} defaultAuthor={`${admin.firstName} ${admin.lastName}`.trim()} fullAdmin={fullAdmin} />
    </DashboardShell>
  );
}
