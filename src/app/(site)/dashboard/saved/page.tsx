import { db } from "@/lib/db";
import { requireUser } from "@/lib/rbac";
import { DashboardShell } from "@/components/dashboard-shell";
import { ListingCard } from "@/components/listing-card";
import { EmptyState } from "@/components/ui";
import { userNav } from "../nav";
import { COVER_MEDIA } from "@/lib/cover-image";

export const metadata = { title: "Saved properties" };
export const dynamic = "force-dynamic";

export default async function SavedPage() {
  const user = await requireUser("/dashboard/saved");
  const nav = await userNav(user.id);

  const saves = await db.savedListing.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      listing: {
        include: {
          company: { select: { id: true, name: true, slug: true, logoUrl: true, verification: true } },
          property: { select: { city: true, area: true, postcode: true, showExactAddress: true, addressLine1: true, latitude: true, longitude: true, verification: true } },
          media: COVER_MEDIA,
          rooms: { select: { status: true } },
        },
      },
    },
  });

  return (
    <DashboardShell
      title="Saved properties"
      subtitle="We'll tell you when availability changes on anything saved here."
      nav={nav}
      active="/dashboard/saved"
    >
      {saves.length === 0 ? (
        <EmptyState
          title="Nothing saved yet"
          body="Tap the heart on any advert and it lands here, with alerts when rooms free up."
          actionHref="/search"
          actionLabel="Search accommodation"
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {saves.map((save) => (
            <ListingCard key={save.id} listing={{ ...save.listing, distanceMiles: null }} />
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
