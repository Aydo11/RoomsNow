import Link from "next/link";
import { db } from "@/lib/db";
import { requireCompany } from "@/lib/rbac";
import { DashboardShell, StatCard } from "@/components/dashboard-shell";
import { EmptyState } from "@/components/ui";
import { RoomBoard } from "@/components/room-board";
import { providerNav } from "../nav";

export const metadata = { title: "Rooms" };
export const dynamic = "force-dynamic";

export default async function RoomsPage() {
  const { companyId } = await requireCompany();
  const [nav, listings, counts] = await Promise.all([
    providerNav(companyId),
    db.listing.findMany({
      where: { companyId, status: { not: "ARCHIVED" } },
      orderBy: { title: "asc" },
      include: {
        property: { select: { city: true } },
        rooms: { orderBy: { name: "asc" } },
      },
    }),
    db.room.groupBy({ by: ["status"], where: { property: { companyId } }, _count: true }),
  ]);

  const count = (status: string) => counts.find((c) => c.status === status)?._count ?? 0;
  const total = counts.reduce((sum, c) => sum + c._count, 0);

  return (
    <DashboardShell
      title="Rooms"
      subtitle="Change a room's status and anyone who saved the advert is told automatically."
      nav={nav}
      active="/provider/rooms"
    >
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Available" value={count("AVAILABLE")} hint={`of ${total} rooms`} />
        <StatCard label="Reserved" value={count("RESERVED")} />
        <StatCard label="Occupied" value={count("OCCUPIED")} />
        <StatCard label="Void or maintenance" value={count("VOID") + count("MAINTENANCE")} />
      </div>

      {listings.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="No rooms to manage yet"
            body="Rooms are created with your first advert, and you can add more at any time."
            actionHref="/provider/adverts/new"
            actionLabel="Post an advert"
          />
        </div>
      ) : (
        <div className="mt-8 space-y-8">
          {listings.map((listing) => (
            <section key={listing.id}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-[20px]">
                  <Link href={`/provider/adverts/${listing.id}`} className="hover:text-pine-dark">
                    {listing.title}
                  </Link>
                </h2>
                <p className="text-[13px] text-ink-faint">{listing.property.city}</p>
              </div>
              <div className="mt-3">
                <RoomBoard listingId={listing.id} rooms={listing.rooms} />
              </div>
            </section>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
