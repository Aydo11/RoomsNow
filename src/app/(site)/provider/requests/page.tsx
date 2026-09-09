import Link from "next/link";
import { db } from "@/lib/db";
import { requireCompany } from "@/lib/rbac";
import { DashboardShell } from "@/components/dashboard-shell";
import { EmptyState } from "@/components/ui";
import { PipelineTrail } from "@/components/pipeline";
import { StatusUpdater } from "@/components/status-updater";
import { ArchiveRequestButton } from "@/components/archive-request-button";
import { providerNav } from "../nav";
import { PIPELINE, PIPELINE_LABELS } from "@/lib/taxonomy";
import { ageFrom, shortDate } from "@/lib/format";

export const metadata = { title: "Requests" };
export const dynamic = "force-dynamic";

const REQUEST_FILTERS = [
  { value: "all", label: "All", statuses: null },
  { value: "new", label: "New", statuses: ["SUBMITTED", "RECEIVED"] },
  { value: "reviewing", label: "Reviewing", statuses: ["UNDER_REVIEW", "ASSESSMENT"] },
  { value: "offers", label: "Offers", statuses: ["OFFERED", "ACCEPTED"] },
  { value: "completed", label: "Completed", statuses: ["MOVED_IN"] },
  { value: "closed", label: "Closed", statuses: ["DECLINED", "WITHDRAWN"] },
  { value: "archived", label: "Archived", statuses: null },
] as const;

export default async function ProviderRequestsPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { companyId } = await requireCompany();
  const query = await searchParams;
  const activeFilter = REQUEST_FILTERS.find((filter) => filter.value === query.view) ?? REQUEST_FILTERS[0];
  const [nav, requests] = await Promise.all([
    providerNav(companyId),
    db.accommodationRequest.findMany({
      where: { listing: { companyId } },
      orderBy: { createdAt: "desc" },
      include: {
        listing: { select: { id: true, title: true } },
        applicant: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            locationLabel: true,
            profile: { select: { dateOfBirth: true, supportTypes: true } },
          },
        },
      },
    }),
  ]);
  const unarchived = requests.filter((request) => !request.archivedAt);
  const visibleRequests =
    activeFilter.value === "archived"
      ? requests.filter((request) => request.archivedAt)
      : activeFilter.statuses
        ? unarchived.filter((request) => (activeFilter.statuses as readonly string[]).includes(request.status))
        : unarchived;

  return (
    <DashboardShell
      title="Accommodation requests"
      subtitle="Open a request when you need its details, then update the status so applicants know where they stand."
      nav={nav}
      active="/provider/requests"
    >
      {requests.length === 0 ? (
        <EmptyState title="No requests yet" body="Requests from your live adverts appear here." />
      ) : (
        <>
          <nav className="mb-5 flex flex-wrap gap-2" aria-label="Filter accommodation requests">
            {REQUEST_FILTERS.map((filter) => {
              const count =
                filter.value === "archived"
                  ? requests.filter((request) => request.archivedAt).length
                  : filter.statuses
                    ? unarchived.filter((request) => (filter.statuses as readonly string[]).includes(request.status)).length
                    : unarchived.length;
              const selected = filter.value === activeFilter.value;
              return (
                <Link
                  key={filter.value}
                  href={filter.value === "all" ? "/provider/requests" : `/provider/requests?view=${filter.value}`}
                  className={selected ? "chip chip-active" : "chip hover:border-pine hover:text-pine-dark"}
                  aria-current={selected ? "page" : undefined}
                >
                  {filter.label} <span className="ml-1 opacity-70">{count}</span>
                </Link>
              );
            })}
          </nav>

          {visibleRequests.length === 0 ? (
            <EmptyState title={`No ${activeFilter.label.toLowerCase()} requests`} body="Choose another filter to see the rest of your requests." />
          ) : (
            <ul className="space-y-3">
              {visibleRequests.map((request) => (
                <li key={request.id}>
                  <details className="card group overflow-hidden">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3.5 hover:bg-paper [&::-webkit-details-marker]:hidden">
                      <span className="min-w-0">
                        <Link
                          href={`/provider/applicants/${request.applicant.id}`}
                          className="block truncate text-[16px] font-semibold text-ink hover:text-pine-dark hover:underline"
                        >
                          {request.applicant.firstName} {request.applicant.lastName}
                        </Link>
                        <span className="mt-0.5 block truncate text-[13px] text-ink-soft">
                          {request.listing.title} · applied {shortDate(request.createdAt)}
                          {request.archivedAt ? " · Archived" : ""}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-3">
                        <span className="chip">{PIPELINE_LABELS[request.status]}</span>
                        <svg viewBox="0 0 20 20" className="h-4 w-4 text-ink-faint transition group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          <path d="m5 7.5 5 5 5-5" />
                        </svg>
                      </span>
                    </summary>

                    <div className="border-t border-line p-5">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <p className="text-[14px] text-ink-soft">
                            {request.applicant.profile?.dateOfBirth ? `${ageFrom(request.applicant.profile.dateOfBirth)} · ` : ""}
                            {request.applicant.locationLabel ?? "Location not given"}
                          </p>
                          <p className="mt-1 text-[14px]">
                            <Link href={`/provider/adverts/${request.listing.id}`} className="text-pine-dark hover:underline">
                              View {request.listing.title}
                            </Link>
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Link href={`/provider/applicants/${request.applicant.id}`} className="btn-secondary">View profile</Link>
                          <Link href="/messages" className="btn-secondary">Message</Link>
                          <ArchiveRequestButton requestId={request.id} archived={Boolean(request.archivedAt)} />
                        </div>
                      </div>

                      <div className="mt-4"><PipelineTrail status={request.status} /></div>

                      <dl className="mt-4 grid gap-3 text-[14px] sm:grid-cols-2">
                        {request.moveInDate && <div><dt className="text-ink-faint">Wants to move</dt><dd>{shortDate(request.moveInDate)}</dd></div>}
                        {request.accommodationNeeds && <div><dt className="text-ink-faint">Accommodation needs</dt><dd className="whitespace-pre-line">{request.accommodationNeeds}</dd></div>}
                        {request.supportNeeds && <div><dt className="text-ink-faint">Support needs</dt><dd className="whitespace-pre-line">{request.supportNeeds}</dd></div>}
                        {request.additionalInfo && <div><dt className="text-ink-faint">Anything else</dt><dd className="whitespace-pre-line">{request.additionalInfo}</dd></div>}
                      </dl>

                      <div className="mt-5 border-t border-line pt-4">
                        <StatusUpdater
                          kind="request"
                          id={request.id}
                          current={request.status}
                          note={request.statusNote}
                          options={[...PIPELINE, "DECLINED"].map((value) => ({ value, label: PIPELINE_LABELS[value] }))}
                        />
                      </div>
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </DashboardShell>
  );
}
