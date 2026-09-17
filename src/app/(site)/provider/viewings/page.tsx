import Link from "next/link";
import { db } from "@/lib/db";
import { requireCompany } from "@/lib/rbac";
import { DashboardShell } from "@/components/dashboard-shell";
import { EmptyState } from "@/components/ui";
import { StatusPill } from "@/components/badges";
import { ViewingRowActions } from "@/components/viewing-row-actions";
import { providerNav } from "../nav";
import { dateTime } from "@/lib/format";

export const metadata = { title: "Viewings" };
export const dynamic = "force-dynamic";

const STATUS_LABEL = {
  PROPOSED: "Awaiting confirmation",
  CONFIRMED: "Confirmed",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  NO_SHOW: "No-show",
} as const;

const STATUS_TONE = {
  PROPOSED: "warn",
  CONFIRMED: "good",
  COMPLETED: "muted",
  CANCELLED: "muted",
  NO_SHOW: "muted",
} as const;

const VIEW_FILTERS = [
  { value: "needs-confirming", label: "Needs confirming", statuses: ["PROPOSED"] },
  { value: "upcoming", label: "Upcoming", statuses: ["CONFIRMED"] },
  { value: "past", label: "Past", statuses: ["COMPLETED", "CANCELLED", "NO_SHOW"] },
  { value: "all", label: "All", statuses: null },
] as const;

export default async function ProviderViewingsPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { companyId } = await requireCompany();
  const query = await searchParams;
  const activeFilter = VIEW_FILTERS.find((filter) => filter.value === query.view) ?? VIEW_FILTERS[0];

  const [nav, viewings] = await Promise.all([
    providerNav(companyId),
    db.viewing.findMany({
      where: { listing: { companyId } },
      orderBy: { scheduledFor: "asc" },
      include: {
        listing: { select: { id: true, title: true } },
        request: { select: { id: true, applicant: { select: { id: true, firstName: true, lastName: true } } } },
        referral: { select: { id: true, applicantFirstName: true, applicantLastName: true, reference: true } },
      },
    }),
  ]);

  const visible = activeFilter.statuses
    ? viewings.filter((viewing) => (activeFilter.statuses as readonly string[]).includes(viewing.status))
    : viewings;

  return (
    <DashboardShell
      title="Viewings"
      subtitle="Everything you've proposed or confirmed across requests and referrals, in one place — so nothing gets missed."
      nav={nav}
      active="/provider/viewings"
    >
      {viewings.length === 0 ? (
        <EmptyState title="No viewings yet" body="Propose a viewing from a request or referral and it'll show up here." />
      ) : (
        <>
          <nav className="mb-5 flex flex-wrap gap-2" aria-label="Filter viewings">
            {VIEW_FILTERS.map((filter) => {
              const count = filter.statuses
                ? viewings.filter((viewing) => (filter.statuses as readonly string[]).includes(viewing.status)).length
                : viewings.length;
              const selected = filter.value === activeFilter.value;
              return (
                <Link
                  key={filter.value}
                  href={filter.value === "needs-confirming" ? "/provider/viewings" : `/provider/viewings?view=${filter.value}`}
                  className={selected ? "chip chip-active" : "chip hover:border-pine hover:text-pine-dark"}
                  aria-current={selected ? "page" : undefined}
                >
                  {filter.label} <span className="ml-1 opacity-70">{count}</span>
                </Link>
              );
            })}
          </nav>

          {visible.length === 0 ? (
            <EmptyState title={`No ${activeFilter.label.toLowerCase()} viewings`} body="Choose another filter to see the rest." />
          ) : (
            <ul className="space-y-3">
              {visible.map((viewing) => {
                const name = viewing.request
                  ? `${viewing.request.applicant.firstName} ${viewing.request.applicant.lastName}`
                  : viewing.referral
                    ? `${viewing.referral.applicantFirstName} ${viewing.referral.applicantLastName}`
                    : "Applicant";
                const profileHref = viewing.request
                  ? `/provider/applicants/${viewing.request.applicant.id}`
                  : viewing.referral
                    ? `/provider/referrals`
                    : undefined;

                return (
                  <li key={viewing.id} className="card p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        {profileHref ? (
                          <Link href={profileHref} className="text-[16px] font-semibold text-ink hover:text-pine-dark hover:underline">
                            {name}
                          </Link>
                        ) : (
                          <span className="text-[16px] font-semibold">{name}</span>
                        )}
                        <p className="mt-0.5 text-[13px] text-ink-soft">
                          <Link href={`/provider/adverts/${viewing.listing.id}`} className="hover:text-pine-dark hover:underline">
                            {viewing.listing.title}
                          </Link>
                          {viewing.referral ? ` · referral ${viewing.referral.reference}` : ""}
                        </p>
                        <p className="mt-1 text-[15px] font-medium">{dateTime(viewing.scheduledFor)}</p>
                        {viewing.note && <p className="mt-0.5 text-[13px] text-ink-soft">{viewing.note}</p>}
                        {viewing.outcomeNote && <p className="mt-0.5 text-[13px] text-ink-faint">{viewing.outcomeNote}</p>}
                      </div>
                      <StatusPill status={STATUS_LABEL[viewing.status]} tone={STATUS_TONE[viewing.status]} />
                    </div>
                    <div className="mt-3 border-t border-line pt-3">
                      <ViewingRowActions id={viewing.id} status={viewing.status} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </DashboardShell>
  );
}
