import "server-only";
import { db } from "./db";
import { notify, sendEmail } from "./notify";
import { escapeHtml, renderEmail } from "./email-template";
import { ACCOMMODATION_TYPES, supportLabel } from "./taxonomy";
import type { Listing, Property, Company, SavedSearch } from "@prisma/client";

/** The listing shape every matcher below needs — just enough to score a match. */
export type MatchableListing = Listing & {
  property: Pick<Property, "city" | "area" | "postcode">;
  company: Pick<Company, "verification">;
};

const LISTING_MATCH_INCLUDE = {
  property: { select: { city: true, area: true, postcode: true } },
  company: { select: { verification: true } },
} as const;

/** Human label for a saved search, used when someone doesn't type their own. */
export function describeSavedSearch(input: {
  where?: string | null;
  support: string[];
  type: string[];
  maxRent?: number | null;
}): string {
  const parts: string[] = [];
  if (input.where) parts.push(input.where);
  if (input.type.length) {
    parts.push(input.type.map((t) => ACCOMMODATION_TYPES[t as keyof typeof ACCOMMODATION_TYPES] ?? t).join(", "));
  }
  if (input.support.length) parts.push(input.support.slice(0, 2).map(supportLabel).join(", "));
  if (input.maxRent) parts.push(`up to £${input.maxRent}/wk`);
  return parts.length ? parts.join(" · ") : "All accommodation";
}

/**
 * Same criteria the public search filters on (see buildWhere in
 * src/server/search.ts), evaluated in JS against one listing rather than as a
 * Prisma where-clause, since by the time this runs we already have the
 * listing in hand and just need a yes/no per saved search.
 */
export function listingMatchesSavedSearch(listing: MatchableListing, search: SavedSearch): boolean {
  if (search.where) {
    const needle = search.where.trim().toLowerCase();
    const haystack = `${listing.property.city} ${listing.property.area ?? ""}`.toLowerCase();
    const postcodeMatch = listing.property.postcode.toUpperCase().startsWith(search.where.trim().toUpperCase());
    if (!haystack.includes(needle) && !postcodeMatch) return false;
  }
  if (search.support.length && !search.support.some((s) => listing.supportTypes.includes(s))) return false;
  if (search.type.length && !search.type.includes(listing.accommodationType)) return false;
  if (search.gender && search.gender !== "ANY" && listing.genderArrangement !== search.gender && listing.genderArrangement !== "ANY") {
    return false;
  }
  if (search.minAge !== null && listing.minAge !== null && listing.minAge > search.minAge) return false;
  if (search.wheelchair && !listing.wheelchairAccess) return false;
  if (search.furnished && !listing.furnished) return false;
  if (search.ensuite && !listing.ensuite) return false;
  if (search.selfContained && !listing.selfContained) return false;
  if (search.petsAllowed && !listing.petsAllowed) return false;
  if (search.referral.length && !search.referral.some((r) => listing.referralRoutes.includes(r))) return false;
  if (search.verifiedOnly && listing.company.verification !== "APPROVED") return false;
  if (search.maxRent !== null && listing.weeklyRentFrom !== null && listing.weeklyRentFrom > search.maxRent * 100) return false;
  if (search.minRent !== null && listing.weeklyRentFrom !== null && listing.weeklyRentFrom < search.minRent * 100) return false;
  return true;
}

/**
 * Fires the moment an advert goes live (first approval, or a paused advert
 * coming back). Only INSTANT alerts are considered here — DAILY alerts are
 * rolled up by runSavedSearchDigest so nobody gets pinged twice for the same
 * advert.
 */
export async function notifyInstantSavedSearches(listingId: string) {
  const listing = await db.listing.findUnique({ where: { id: listingId }, include: LISTING_MATCH_INCLUDE });
  if (!listing || listing.status !== "ACTIVE") return;

  const candidates = await db.savedSearch.findMany({ where: { frequency: "INSTANT" } });
  if (!candidates.length) return;
  const matches = candidates.filter((search) => listingMatchesSavedSearch(listing, search));
  if (!matches.length) return;

  const now = new Date();
  const area = listing.property.area ?? listing.property.city;
  await Promise.all(
    matches.map(async (search) => {
      await notify({
        userId: search.userId,
        type: "LISTING",
        title: "New accommodation matches your alert",
        body: `“${listing.title}” in ${area} matches your "${search.label}" alert.`,
        href: `/listings/${listing.id}`,
        email: true,
      });
      await db.savedSearch.update({ where: { id: search.id }, data: { lastAlertedAt: now, lastDigestAt: now } });
    }),
  );
}

/**
 * Rolls up everything new since each daily saved search last ran into a
 * single email. Runs in-process (see scheduleSavedSearchDigest) rather than
 * as a separate Render cron service, so shipping this doesn't need any new
 * infrastructure or deploy-config changes.
 */
export async function runSavedSearchDigest() {
  const now = new Date();
  const dueBefore = new Date(now.getTime() - 20 * 60 * 60 * 1000);
  const dueSearches = await db.savedSearch.findMany({
    where: { frequency: "DAILY", lastDigestAt: { lte: dueBefore } },
    include: { user: { select: { email: true } } },
  });
  if (!dueSearches.length) return { checked: 0, sent: 0 };

  const appUrl = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  let sent = 0;

  for (const search of dueSearches) {
    const freshListings = await db.listing.findMany({
      where: { status: "ACTIVE", publishedAt: { gt: search.lastDigestAt } },
      include: LISTING_MATCH_INCLUDE,
      take: 200,
    });
    const matches = freshListings.filter((listing) => listingMatchesSavedSearch(listing, search));

    if (matches.length) {
      const shown = matches.slice(0, 10);
      const rows = shown
        .map((listing) => {
          const area = listing.property.area ?? listing.property.city;
          return `<li style="margin:0 0 8px;"><a href="${appUrl}/listings/${listing.id}" style="color:#1c4d3d;">${escapeHtml(listing.title)}</a> — ${escapeHtml(area)}</li>`;
        })
        .join("");
      const subject = `${matches.length} new match${matches.length === 1 ? "" : "es"} for "${search.label}"`;

      await sendEmail({
        to: search.user.email,
        subject,
        text: shown.map((m) => `${m.title} — ${appUrl}/listings/${m.id}`).join("\n"),
        html: renderEmail({
          preheader: `${matches.length} new advert${matches.length === 1 ? "" : "s"} match your saved search.`,
          heading: subject,
          bodyHtml: `<ul style="margin:0;padding-left:18px;">${rows}</ul>`,
          ctaLabel: "Manage your alerts",
          ctaUrl: `${appUrl}/dashboard/alerts`,
        }),
      });
      await db.notification.create({
        data: {
          userId: search.userId,
          type: "LISTING",
          title: subject,
          body: shown.map((m) => m.title).join(", "),
          href: "/dashboard/alerts",
        },
      });
      sent += 1;
    }

    await db.savedSearch.update({ where: { id: search.id }, data: { lastDigestAt: now } });
  }

  return { checked: dueSearches.length, sent };
}

let digestScheduled = false;

/**
 * Called once from instrumentation.ts when the server process boots. Checks
 * hourly for saved searches whose daily digest is due, rather than relying
 * on a separate scheduled service — this app already runs as one long-lived
 * process on Render, so this needs no new infrastructure.
 */
export function scheduleSavedSearchDigest() {
  if (digestScheduled) return;
  digestScheduled = true;

  const HOUR_MS = 60 * 60 * 1000;
  const run = () => {
    runSavedSearchDigest().catch((error) => {
      console.error("[saved-search-digest] failed", error);
    });
  };
  // Give the server a minute to finish booting before the first check.
  setTimeout(run, 60_000);
  setInterval(run, HOUR_MS);
}
