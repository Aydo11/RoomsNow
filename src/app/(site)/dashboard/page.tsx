import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/rbac";
import { DashboardShell, StatCard } from "@/components/dashboard-shell";
import { ListingCard } from "@/components/listing-card";
import { userNav } from "./nav";
import { searchListings } from "@/server/search";
import { matchScore } from "@/lib/matching";
import { PIPELINE_LABELS } from "@/lib/taxonomy";
import { timeAgo } from "@/lib/format";

export const metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

export default async function UserDashboard() {
  const user = await requireUser("/dashboard");
  const nav = await userNav(user.id);

  const [saved, requests, ad, notifications] = await Promise.all([
    db.savedListing.count({ where: { userId: user.id } }),
    db.accommodationRequest.findMany({
      where: { applicantId: user.id },
      orderBy: { updatedAt: "desc" },
      take: 5,
      include: { listing: { select: { id: true, title: true } } },
    }),
    db.lookingForAd.findFirst({ where: { userId: user.id }, orderBy: { updatedAt: "desc" } }),
    db.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 5 }),
  ]);

  const seeker = {
    city: ad?.city ?? user.locationLabel,
    preferredLocations: user.profile?.preferredLocations ?? [],
    supportTypes: ad?.supportTypes ?? user.profile?.supportTypes ?? [],
    preferredTypes: ad?.accommodationTypes ?? user.profile?.preferredTypes ?? [],
    availableFrom: ad?.moveInDate ?? user.profile?.availableFrom ?? null,
    genderArrangement: ad?.genderArrangement ?? user.profile?.genderArrangement ?? null,
    age: ad?.age ?? null,
    budgetWeekly: ad?.budgetWeekly ?? null,
  };

  const suggestions = await searchListings({
    where: seeker.city ?? undefined,
    support: seeker.supportTypes,
  });

  const scored = suggestions.items
    .map((listing) => ({
      listing,
      score: matchScore(seeker, {
        city: listing.property.city,
        supportTypes: listing.supportTypes,
        accommodationType: listing.accommodationType,
        availableFrom: listing.availableFrom,
        genderArrangement: listing.genderArrangement,
        minAge: listing.minAge,
        maxAge: listing.maxAge,
        wheelchairAccess: listing.wheelchairAccess,
        weeklyRentFrom: listing.weeklyRentFrom,
      }).score,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  return (
    <DashboardShell
      title={`Hello, ${user.firstName}`}
      subtitle="Your accommodation search in one place."
      nav={nav}
      active="/dashboard"
      action={
        <Link href="/dashboard/advert" className="btn-primary">
          {ad ? "Edit your advert" : "Create your advert"}
        </Link>
      }
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        <StatCard label="Saved properties" value={saved} />
        <StatCard label="Open requests" value={requests.filter((r) => !["DECLINED", "WITHDRAWN"].includes(r.status)).length} />
        <StatCard
          className="col-span-2 sm:col-span-1"
          label="Your advert"
          value={ad ? (ad.status === "ACTIVE" ? "Live" : "Paused") : "None yet"}
          hint={ad ? `Seen ${ad.views} times` : "Providers can find you once it's live"}
        />
      </div>

      {!ad && (
        <div className="card mt-5 p-5 sm:mt-6 sm:p-6">
          <h2 className="text-[20px]">Let providers come to you</h2>
          <p className="mt-2 max-w-[62ch] text-[15px] leading-relaxed text-ink-soft">
            Post what you&apos;re looking for and providers searching their area can find you and
            invite you to apply. You choose what&apos;s visible.
          </p>
          <Link href="/dashboard/advert" className="btn-primary mt-4">Create your advert</Link>
        </div>
      )}

      {scored.length > 0 && (
        <section className="mt-8">
          <h2 className="text-[22px]">Suggested for you</h2>
          <p className="mt-1 text-[14px] text-ink-soft">
            Compatibility is a search aid based on what you&apos;ve told us — not a decision about
            whether somewhere is suitable.
          </p>
          <div className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {scored.map(({ listing, score }) => (
              <ListingCard key={listing.id} listing={listing} match={score} compact />
            ))}
          </div>
        </section>
      )}

      <div className="mt-7 grid gap-6 lg:mt-8 lg:grid-cols-2">
        <section>
          <h2 className="text-[20px]">Recent requests</h2>
          {requests.length === 0 ? (
            <p className="card mt-3 p-5 text-[15px] text-ink-soft">
              You haven&apos;t requested any accommodation yet.
            </p>
          ) : (
            <ul className="card mt-3 divide-y divide-line">
              {requests.map((request) => (
                <li key={request.id} className="flex min-w-0 items-start justify-between gap-3 px-3.5 py-3 sm:items-center sm:px-4">
                  <Link href={`/listings/${request.listing.id}`} className="min-w-0 text-[15px] hover:text-pine-dark">
                    <span className="block truncate">{request.listing.title}</span>
                    <span className="block text-[13px] text-ink-faint">{timeAgo(request.updatedAt)}</span>
                  </Link>
                  <span className="max-w-[42%] shrink-0 rounded-pill bg-paper-sunk px-2.5 py-1 text-center text-[11px] leading-tight text-ink-soft sm:max-w-none sm:text-[12px]">
                    {PIPELINE_LABELS[request.status]}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="text-[20px]">Notifications</h2>
          {notifications.length === 0 ? (
            <p className="card mt-3 p-5 text-[15px] text-ink-soft">Nothing yet.</p>
          ) : (
            <ul className="card mt-3 divide-y divide-line">
              {notifications.map((notification) => (
                <li key={notification.id} className="px-4 py-3">
                  <Link href={notification.href ?? "/dashboard"} className="block">
                    <span className="text-[15px]">{notification.title}</span>
                    {notification.body && (
                      <span className="mt-0.5 block text-[14px] text-ink-soft">{notification.body}</span>
                    )}
                    <span className="mt-1 block text-[12px] text-ink-faint">{timeAgo(notification.createdAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </DashboardShell>
  );
}
