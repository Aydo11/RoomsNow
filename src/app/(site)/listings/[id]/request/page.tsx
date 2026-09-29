import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/rbac";
import { RequestForm } from "@/components/request-form";
import { publicLocation } from "@/lib/format";

export const metadata = { title: "Request accommodation" };
export const dynamic = "force-dynamic";

export default async function RequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/listings/${id}/request`);
  const listing = await db.listing.findUnique({
    where: { id },
    include: { property: true, company: { select: { name: true } } },
  });
  if (!listing || listing.status !== "ACTIVE") notFound();

  return (
    <div className="shell max-w-3xl py-10">
      <Link href={`/listings/${listing.id}`} className="text-[14px] text-ink-soft hover:text-ink">
        ← Back to the advert
      </Link>

      <h1 className="mt-4 text-[30px]">Request accommodation</h1>
      <p className="mt-2 text-[16px] text-ink-soft">
        {listing.title} · {publicLocation(listing.property)} · {listing.company.name}
      </p>

      <div className="card mt-6 p-5">
        <h2 className="text-[17px]">What the provider will see</h2>
        <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">
          Your name, the answers below, and anything you&apos;ve made public on your profile. They
          will not see your address, date of birth or contact details unless you add them here. Adding a
          phone number makes it much easier for them to get back to you quickly.
        </p>
      </div>

      <RequestForm
        listingId={listing.id}
        defaults={{
          accommodationNeeds: user.profile?.accommodationNeeds ?? "",
          supportNeeds: user.profile?.supportNeeds ?? "",
          moveInDate: user.profile?.availableFrom?.toISOString().slice(0, 10) ?? "",
          phone: user.phone ?? "",
        }}
      />
    </div>
  );
}
