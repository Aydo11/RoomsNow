import { db } from "@/lib/db";
import { requireUser } from "@/lib/rbac";
import { DashboardShell } from "@/components/dashboard-shell";
import { EmptyState } from "@/components/ui";
import { SavedSearchList } from "@/components/saved-search-list";
import { describeSavedSearch } from "@/lib/saved-search-alerts";
import { userNav } from "../nav";
import { referrerNav } from "../../referrals/nav";

export const metadata = { title: "Saved alerts" };
export const dynamic = "force-dynamic";

export default async function AlertsPage() {
  const user = await requireUser("/dashboard/alerts");
  const nav = user.role === "REFERRER" ? await referrerNav(user.id) : await userNav(user.id);

  const searches = await db.savedSearch.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  const rows = searches.map((search) => ({
    id: search.id,
    label: search.label,
    summary: describeSavedSearch({
      where: search.where,
      support: search.support,
      type: search.type,
      maxRent: search.maxRent,
    }),
    frequency: search.frequency,
    lastAlertedAt: search.lastAlertedAt,
  }));

  return (
    <DashboardShell
      title="Saved alerts"
      subtitle="We'll email you when accommodation matching one of these searches goes live."
      nav={nav}
      active="/dashboard/alerts"
    >
      {rows.length === 0 ? (
        <EmptyState
          title="No saved alerts yet"
          body="Search for accommodation, then save the filters as an alert — we'll email you the moment somewhere matching goes live, or send a daily roundup instead."
          actionHref="/search"
          actionLabel="Search accommodation"
        />
      ) : (
        <SavedSearchList searches={rows} />
      )}
    </DashboardShell>
  );
}
