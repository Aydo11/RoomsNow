import { db } from "@/lib/db";
import { DashboardShell, StatCard } from "@/components/dashboard-shell";
import { ServiceReviewReplyForm } from "@/components/service-forms";
import { Stars } from "@/components/star-rating";
import { requireServiceBusiness } from "@/server/service-marketplace";
import { summariseServiceReviews } from "@/lib/service-marketplace";
import { monthYear } from "@/lib/format";
import { serviceProviderNav } from "../nav";

export const metadata = { title: "Reviews" };
export const dynamic = "force-dynamic";

export default async function ServiceReviewsPage() {
  const { user, business } = await requireServiceBusiness();
  const [nav, reviews] = await Promise.all([
    serviceProviderNav(user.id),
    db.serviceReview.findMany({ where: { businessId: business.id }, orderBy: { createdAt: "desc" }, include: { quote: { select: { service: true } } } }),
  ]);
  const visible = reviews.filter((review) => !review.hiddenAt);
  const summary = summariseServiceReviews(visible);
  const scores: Array<[string, number | null]> = [["Quality", summary.quality], ["Communication", summary.communication], ["Timeliness", summary.timeliness], ["Value", summary.value]];

  return (
    <DashboardShell
      title="Reviews"
      subtitle="Reviews come only from providers whose job you completed through RoomsNow. You can reply publicly but can't edit or remove a review — contact us if one breaks our rules."
      nav={nav}
      active="/service-provider/reviews"
    >
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="Overall" value={summary.rating?.toFixed(1) ?? "—"} hint={`${summary.count} review${summary.count === 1 ? "" : "s"}`} />
        {scores.map(([label, value]) => <StatCard key={label} label={label} value={value?.toFixed(1) ?? "—"} />)}
      </div>
      {reviews.length === 0 ? (
        <p className="card mt-6 p-6 text-[15px] text-ink-soft">No reviews yet. Providers can review you once a job is marked complete.</p>
      ) : (
        <ul className="mt-6 space-y-4">
          {reviews.map((review) => (
            <li key={review.id} className="card p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2"><Stars rating={review.rating} /><span className="text-[13px] text-ink-faint">{review.quote.service} · {monthYear(review.createdAt)}</span></div>
                {review.hiddenAt && <span className="text-[12px] font-medium text-clay">Hidden by RoomsNow</span>}
              </div>
              {review.comment && <p className="mt-2 text-[15px] text-ink">{review.comment}</p>}
              <p className="mt-2 text-[12.5px] text-ink-faint">Quality {review.quality} · Communication {review.communication} · Timeliness {review.timeliness} · Value {review.value}</p>
              {!review.hiddenAt && <ServiceReviewReplyForm reviewId={review.id} initialReply={review.reply} />}
            </li>
          ))}
        </ul>
      )}
    </DashboardShell>
  );
}
