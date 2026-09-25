import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireReferrer } from "@/lib/rbac";
import { teamMemberIds } from "@/lib/referral-team";
import { matchesForClient } from "@/server/client-matches";
import { tourSlides } from "@/server/tour";
import { matchBand } from "@/lib/client-matching";
import { TourFeed } from "@/components/tour-feed";

export const metadata = { title: "Tour matches", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/** How many of the best matches to tour. */
const LIMIT = 30;

/**
 * Tour mode for one client: their best-matching rooms, strongest first, with
 * the match score on each and a Refer button that fills in the referral.
 */
export default async function ClientTourPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ vetted?: string; all?: string }>;
}) {
  const [{ id }, query, user] = await Promise.all([params, searchParams, requireReferrer()]);
  const teamIds = await teamMemberIds(user.id);
  const client = await db.client.findFirst({
    where: { id, referrerId: { in: teamIds } },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      dateOfBirth: true,
      preferredLocation: true,
      supportTypes: true,
      assessment: true,
      deletedAt: true,
      referrals: { select: { listingId: true } },
    },
  });
  if (!client) notFound();
  if (client.deletedAt) redirect(`/referrals/clients/${client.id}`);

  const vettedOnly = query.vetted === "1";
  const { rows } = await matchesForClient(client, { vettedOnly });
  const visible = rows.filter((row) => query.all === "1" || row.match.score >= 46).slice(0, LIMIT);
  const matches = new Map(visible.map((row) => [row.listing.id, { score: row.match.score, label: matchBand(row.match.score).label }]));
  const referred = new Set(client.referrals.map((referral) => referral.listingId).filter((value): value is string => Boolean(value)));
  const slides = await tourSlides(
    visible.map((row) => row.listing.id),
    { userId: user.id, matches, referred },
  );

  const back = `/referrals/clients/${client.id}/matches${vettedOnly ? "?vetted=1" : ""}`;
  return (
    <TourFeed
      slides={slides}
      heading={`Matches for ${client.firstName}`}
      backHref={back}
      signedIn
      loginHref="/login"
      refer={{ clientId: client.id, clientName: `${client.firstName} ${client.lastName}` }}
      widenHref={
        vettedOnly
          ? `/referrals/clients/${client.id}/tour`
          : query.all !== "1"
            ? `/referrals/clients/${client.id}/tour?all=1`
            : null
      }
    />
  );
}
