import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/rbac";
import { DashboardShell } from "@/components/dashboard-shell";
import { Stars } from "@/components/star-rating";
import { setResidentReviewHiddenAction } from "@/server/actions/resident-reviews";
import { shortDate } from "@/lib/format";
import { adminNav } from "../nav";

export const metadata = { title: "Resident reviews" };
export const dynamic = "force-dynamic";

/** Moderation for resident reviews: newest first, take down or restore. */
export default async function AdminReviewsPage() {
  await requireAdmin("MODERATION");
  const [nav, reviews] = await Promise.all([
    adminNav(),
    db.residentReview.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
        providerReply: true,
        hiddenAt: true,
        hiddenReason: true,
        company: { select: { name: true, slug: true } },
        author: { select: { firstName: true, lastName: true, email: true } },
      },
    }),
  ]);

  return (
    <DashboardShell
      title="Resident reviews"
      subtitle="Reviews go live straight away. Take one down if it names a person, shares private details, or is abusive. The resident's name is never shown publicly."
      nav={nav}
      active="/admin/reviews"
    >
      {reviews.length === 0 ? (
        <p className="text-[14px] text-ink-soft">No resident reviews yet.</p>
      ) : (
        <ul className="space-y-3">
          {reviews.map((review) => (
            <li key={review.id} className="card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Stars rating={review.rating} />
                  <Link href={`/companies/${review.company.slug}`} className="text-[14px] font-semibold hover:text-pine-dark">
                    {review.company.name}
                  </Link>
                </div>
                <span className="text-[12.5px] text-ink-faint">
                  {shortDate(review.createdAt)} · by {review.author.firstName} {review.author.lastName} ({review.author.email})
                </span>
              </div>
              {review.comment && <p className="mt-2 whitespace-pre-line text-[14px] text-ink">{review.comment}</p>}
              {review.providerReply && <p className="mt-2 text-[13px] text-ink-soft">Provider reply: {review.providerReply}</p>}
              <form action={setResidentReviewHiddenAction} className="mt-3 flex flex-wrap items-center gap-2">
                <input type="hidden" name="reviewId" value={review.id} />
                {review.hiddenAt ? (
                  <>
                    <span className="text-[13px] text-clay">Taken down{review.hiddenReason ? `: ${review.hiddenReason}` : ""}</span>
                    <input type="hidden" name="hide" value="0" />
                    <button type="submit" className="btn-ghost">
                      Restore
                    </button>
                  </>
                ) : (
                  <>
                    <input type="hidden" name="hide" value="1" />
                    <input name="reason" className="field max-w-xs py-1.5 text-[13px]" placeholder="Reason (kept private)" aria-label="Reason" />
                    <button type="submit" className="btn-ghost text-clay">
                      Take down
                    </button>
                  </>
                )}
              </form>
            </li>
          ))}
        </ul>
      )}
    </DashboardShell>
  );
}
