import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/rbac";
import { timeAgo } from "@/lib/format";
import { DashboardShell } from "@/components/dashboard-shell";
import { adminRemoveStoryAction } from "@/server/actions/stories";
import { PostStoryForm } from "@/components/story-forms";
import { hasAdminPermission } from "@/lib/admin-permissions";
import { adminNav } from "../nav";

export const metadata = { title: "Provider stories" };
export const dynamic = "force-dynamic";

/** Every live story, newest first, so the team can take down anything that breaks the rules. */
export default async function AdminStoriesPage() {
  const admin = await requireAdmin("MODERATION");
  const [nav, stories] = await Promise.all([
    adminNav(),
    db.providerStory.findMany({
      where: { expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { company: { select: { name: true, slug: true, verification: true } }, listing: { select: { id: true, title: true } } },
    }),
  ]);

  return (
    <DashboardShell title="Provider stories" subtitle={`Live 24-hour stories (${stories.length}). They go live without review, so check them here and remove anything unsafe or misleading.`} nav={nav} active="/admin/stories">
      {hasAdminPermission(admin, "ALL") && <div className="mb-8"><PostStoryForm adverts={[]} allowVideo official /></div>}
      {stories.length === 0 ? (
        <p className="text-[15px] text-ink-soft">No live stories right now.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {stories.map((story) => (
            <li key={story.id} className="card overflow-hidden">
              <div className="aspect-[9/16] bg-black">
                {story.mediaType === "VIDEO"
                  ? <video src={story.mediaUrl} controls muted playsInline preload="metadata" className="h-full w-full object-cover" />
                  // eslint-disable-next-line @next/next/no-img-element -- user-uploaded story media
                  : <img src={story.mediaUrl} alt="" className="h-full w-full object-cover" />}
              </div>
              <div className="space-y-1 p-3 text-[13px]">
                <p>{story.company ? <Link href={`/companies/${story.company.slug}`} className="font-semibold hover:underline">{story.company.name}</Link> : <span className="font-semibold text-pine-dark">RoomsNow (official)</span>}</p>
                <p className="text-ink-faint">{timeAgo(story.createdAt)} · {story.views} views{story.company ? ` · ${story.company.verification === "APPROVED" ? "verified" : "not verified"}` : ""}</p>
                {story.caption && <p>{story.caption}</p>}
                {story.listing && <p className="truncate"><Link href={`/listings/${story.listing.id}`} className="text-pine-dark hover:underline">{story.listing.title}</Link></p>}
                <form action={adminRemoveStoryAction}>
                  <input type="hidden" name="id" value={story.id} />
                  <button type="submit" className="mt-1 text-clay hover:underline">Remove story</button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </DashboardShell>
  );
}
