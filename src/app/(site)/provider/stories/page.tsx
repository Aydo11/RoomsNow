import { db } from "@/lib/db";
import { requireCompany } from "@/lib/rbac";
import { DashboardShell } from "@/components/dashboard-shell";
import { PostStoryForm } from "@/components/story-forms";
import { deleteStoryAction } from "@/server/actions/stories";
import { STORY_MAX_ACTIVE } from "@/lib/stories";
import Link from "next/link";
import { planLimits } from "@/lib/billing";
import { providerNav } from "../nav";

export const metadata = { title: "Stories" };
export const dynamic = "force-dynamic";

function hoursLeft(expiresAt: Date) {
  const hours = Math.max(0, (expiresAt.getTime() - Date.now()) / 3_600_000);
  return hours >= 1 ? `${Math.floor(hours)}h left` : `${Math.max(1, Math.round(hours * 60))}m left`;
}

export default async function ProviderStoriesPage() {
  const { companyId } = await requireCompany();
  const now = new Date();
  const [nav, stories, adverts, limits] = await Promise.all([
    providerNav(companyId),
    db.providerStory.findMany({ where: { companyId, expiresAt: { gt: now } }, orderBy: { createdAt: "desc" }, include: { listing: { select: { title: true } } } }),
    db.listing.findMany({ where: { companyId, status: "ACTIVE" }, orderBy: { updatedAt: "desc" }, select: { id: true, title: true }, take: 100 }),
    planLimits(companyId),
  ]);
  const paid = limits.membership.tier !== "FREE";

  return (
    <DashboardShell
      title="Stories"
      subtitle="Post quick photos and videos of rooms you have available. Stories show at the top of the search page for 24 hours, and people can enquire straight from them."
      nav={nav}
      active="/provider/stories"
    >
      {paid ? (
        <PostStoryForm adverts={adverts} allowVideo={Boolean(limits.membership.videoUploads)} />
      ) : (
        <section className="card p-5 sm:p-6">
          <h2 className="text-[18px]">Stories are a paid feature</h2>
          <p className="mt-2 max-w-[60ch] text-[15px] text-ink-soft">Post photo and video stories of your available rooms at the top of the search page. Stories come with the Professional and Business plans.</p>
          <Link href="/provider/membership" className="btn-primary mt-4">See plans</Link>
        </section>
      )}

      <section className="mt-8">
        <h2 className="text-[18px]">Live now <span className="text-[14px] font-normal text-ink-faint">({stories.length} of {STORY_MAX_ACTIVE})</span></h2>
        {stories.length === 0 ? (
          <p className="mt-2 text-[15px] text-ink-soft">You have no live stories. Post one above to appear in the stories rail.</p>
        ) : (
          <ul className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {stories.map((story) => (
              <li key={story.id} className="card overflow-hidden">
                <div className="aspect-[9/16] bg-black">
                  {story.mediaType === "VIDEO"
                    ? <video src={`${story.mediaUrl}#t=0.1`} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                    // eslint-disable-next-line @next/next/no-img-element -- user-uploaded story media
                    : <img src={story.mediaUrl} alt="" className="h-full w-full object-cover" />}
                </div>
                <div className="space-y-1 p-3 text-[13px]">
                  <p className="text-ink-soft"><span className="font-semibold text-ink tabular-nums">{story.views}</span> view{story.views === 1 ? "" : "s"} · {hoursLeft(story.expiresAt)}</p>
                  {story.caption && <p className="line-clamp-2">{story.caption}</p>}
                  {story.listing && <p className="truncate text-ink-faint">Linked: {story.listing.title}</p>}
                  <form action={deleteStoryAction}>
                    <input type="hidden" name="id" value={story.id} />
                    <button type="submit" className="mt-1 text-clay hover:underline">Remove</button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </DashboardShell>
  );
}
