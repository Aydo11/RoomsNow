import "server-only";
import { db } from "./db";
import { notifyCompany } from "./notify";
import { notifyInstantSavedSearches } from "./saved-search-alerts";

const LETTABLE_ROOM_STATUSES = new Set(["AVAILABLE", "RESERVED", "VOID"]);

/** 21 days with nobody touching an advert earns a "still available?" nudge. */
const STALE_NUDGE_AFTER_MS = 21 * 24 * 60 * 60 * 1000;
/** A further 7 unanswered days after that, the advert pauses itself. */
const STALE_PAUSE_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Keeps a listing's live/paused state honest against what its rooms
 * actually say, rather than trusting a provider to remember to pause an
 * advert themselves once every room is taken. The public search already
 * enforces this at query time (see the `rooms: { some: ... }` clause in
 * buildWhere, src/server/search.ts) — this makes the same rule visible on
 * the advert itself, instead of it just quietly vanishing from results.
 *
 * Called after any room status change (see updateRoomStatusAction).
 */
export async function syncListingAvailability(listingId: string) {
  const listing = await db.listing.findUnique({
    where: { id: listingId },
    select: {
      id: true,
      title: true,
      status: true,
      pausedReason: true,
      companyId: true,
      rooms: { select: { status: true } },
    },
  });
  if (!listing) return;
  const hasLettableRoom = listing.rooms.some((room: { status: string }) => LETTABLE_ROOM_STATUSES.has(room.status));

  if (listing.status === "ACTIVE" && !hasLettableRoom) {
    await db.listing.update({ where: { id: listing.id }, data: { status: "PAUSED", pausedReason: "NO_AVAILABILITY" } });
    await notifyCompany(listing.companyId, {
      type: "LISTING",
      title: "Advert paused — no rooms available",
      body: `“${listing.title}” has been paused because every room is unavailable. Update a room's status or add availability to bring it back.`,
      href: `/provider/adverts/${listing.id}`,
      email: true,
    });
    return;
  }

  // Only reverses a pause this same mechanism made — a provider's own
  // deliberate pause is never undone just because a room's status changed.
  if (listing.status === "PAUSED" && listing.pausedReason === "NO_AVAILABILITY" && hasLettableRoom) {
    await db.listing.update({
      where: { id: listing.id },
      data: { status: "ACTIVE", pausedReason: null, availabilityConfirmedAt: new Date(), staleNudgeSentAt: null },
    });
    await notifyCompany(listing.companyId, {
      type: "LISTING",
      title: "Advert is live again",
      body: `“${listing.title}” is live again now a room is available.`,
      href: `/provider/adverts/${listing.id}`,
      email: true,
    });
    notifyInstantSavedSearches(listing.id).catch((error) => console.error("[saved-search-alerts]", error));
  }
}

/**
 * Runs hourly (see scheduleListingFreshnessCheck) to catch adverts that have
 * quietly gone stale — let outside the platform, or simply forgotten about.
 * Two stages, both reset the moment a provider touches the advert (editing
 * it, changing a room, or confirming availability — see
 * confirmListingAvailabilityAction and the writes in server/actions/listings.ts):
 *
 *   1. Unconfirmed for STALE_NUDGE_AFTER_MS → one email asking to confirm.
 *   2. Unconfirmed for a further STALE_PAUSE_AFTER_MS → auto-paused, so a
 *      forgotten advert can never sit in search indefinitely.
 */
export async function runListingFreshnessCheck() {
  const now = new Date();

  const dueForPause = await db.listing.findMany({
    where: { status: "ACTIVE", staleNudgeSentAt: { lte: new Date(now.getTime() - STALE_PAUSE_AFTER_MS) } },
    select: { id: true, title: true, companyId: true },
  });
  for (const listing of dueForPause) {
    await db.listing.update({ where: { id: listing.id }, data: { status: "PAUSED", pausedReason: "STALE" } });
    await notifyCompany(listing.companyId, {
      type: "LISTING",
      title: "Advert paused — no reply to our availability check",
      body: `“${listing.title}” has been paused because nobody confirmed it was still available. Confirm it any time to bring it straight back.`,
      href: `/provider/adverts/${listing.id}`,
      email: true,
    });
  }

  const dueForNudge = await db.listing.findMany({
    where: {
      status: "ACTIVE",
      staleNudgeSentAt: null,
      availabilityConfirmedAt: { lte: new Date(now.getTime() - STALE_NUDGE_AFTER_MS) },
    },
    select: { id: true, title: true, companyId: true },
  });
  for (const listing of dueForNudge) {
    await notifyCompany(listing.companyId, {
      type: "LISTING",
      title: "Still available?",
      body: `It's been a few weeks since “${listing.title}” was last confirmed. Confirm it's still available, or pause it if it's let — otherwise we'll pause it automatically in a week.`,
      href: `/provider/adverts/${listing.id}`,
      email: true,
    });
    await db.listing.update({ where: { id: listing.id }, data: { staleNudgeSentAt: now } });
  }

  return { paused: dueForPause.length, nudged: dueForNudge.length };
}

let freshnessScheduled = false;

/**
 * Called once from instrumentation.ts when the server process boots. Runs
 * hourly alongside the saved-search digest (see scheduleSavedSearchDigest)
 * — same in-process pattern, so this needs no new infrastructure either.
 */
export function scheduleListingFreshnessCheck() {
  if (freshnessScheduled) return;
  freshnessScheduled = true;

  const HOUR_MS = 60 * 60 * 1000;
  const run = () => {
    runListingFreshnessCheck().catch((error) => {
      console.error("[listing-freshness] failed", error);
    });
  };
  // Offset from the saved-search digest's own boot delay so the two hourly
  // jobs don't both land on the exact same tick every time.
  setTimeout(run, 150_000);
  setInterval(run, HOUR_MS);
}
