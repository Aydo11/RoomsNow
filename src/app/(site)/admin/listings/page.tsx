import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/rbac";
import { DashboardShell } from "@/components/dashboard-shell";
import { EmptyState } from "@/components/ui";
import { StatusPill } from "@/components/badges";
import { ListingModeration } from "@/components/admin-controls";
import { adminNav } from "../nav";
import { LISTING_STATUSES } from "@/lib/taxonomy";
import { rentRange, timeAgo } from "@/lib/format";
import type { ListingStatus } from "@prisma/client";

export const metadata = { title: "Adverts" };
export const dynamic = "force-dynamic";

const TABS: { value: string; label: string }[] = [
  { value: "PENDING_REVIEW", label: "Awaiting review" },
  { value: "ACTIVE", label: "Live" },
  { value: "REJECTED", label: "Rejected" },
  { value: "DRAFT", label: "Draft" },
  { value: "PAUSED", label: "Paused" },
  { value: "ARCHIVED", label: "Archived" },
];

export default async function AdminListingsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdmin("MODERATION");
  const query = await searchParams;
  const status = (query.status ?? "PENDING_REVIEW") as ListingStatus;
  const [nav, listings] = await Promise.all([
    adminNav(),
    db.listing.findMany({
      where: { status },
      orderBy: { updatedAt: "desc" },
      take: 100,
      include: {
        company: { select: { name: true, slug: true, verification: true } },
        property: { select: { city: true, postcode: true } },
        media: { where: { type: "IMAGE" }, take: 1, orderBy: [{ isPrimary: "desc" }, { position: "asc" }] },
        _count: { select: { rooms: true } },
      },
    }),
  ]);

  return (
    <DashboardShell title="Adverts" nav={nav} active="/admin/listings">
      <ul className="mb-6 flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <li key={tab.value}>
            <Link
              href={`/admin/listings?status=${tab.value}`}
              className={tab.value === status ? "chip bg-ink text-white" : "chip hover:bg-paper-sunk"}
            >
              {tab.label}
            </Link>
          </li>
        ))}
      </ul>

      {listings.length === 0 ? (
        <EmptyState title="Nothing here" body="No adverts with this status right now." />
      ) : (
        <ul className="space-y-4">
          {listings.map((listing) => (
            <li key={listing.id} className="card flex flex-wrap gap-5 p-4">
              <div className="h-24 w-32 shrink-0 overflow-hidden rounded-[10px] bg-paper-sunk">
                {listing.media[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={listing.media[0].url} alt="" className="h-full w-full object-contain" />
                ) : (
                  <span className="grid h-full place-items-center text-[12px] text-ink-faint">No photo</span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/listings/${listing.id}`} className="text-[17px] hover:text-pine-dark">
                    {listing.title}
                  </Link>
                  <StatusPill status={LISTING_STATUSES[listing.status]} tone="muted" />
                </div>
                <p className="mt-1 text-[14px] text-ink-soft">
                  <Link href={`/companies/${listing.company.slug}`} className="hover:underline">
                    {listing.company.name}
                  </Link>{" "}
                  · {listing.property.city} · {rentRange(listing.weeklyRentFrom, listing.weeklyRentTo)}
                </p>
                <p className="mt-1 text-[13px] text-ink-faint">
                  {listing.reference} · {listing._count.rooms} rooms · updated {timeAgo(listing.updatedAt)}
                </p>
                {listing.rejectionNote && (
                  <p className="mt-2 text-[13px] text-clay-dark">Note: {listing.rejectionNote}</p>
                )}
              </div>

              <ListingModeration id={listing.id} status={listing.status} featured={listing.featured} />
            </li>
          ))}
        </ul>
      )}
    </DashboardShell>
  );
}
