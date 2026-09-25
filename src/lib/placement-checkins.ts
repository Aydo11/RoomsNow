import "server-only";
import { db } from "./db";
import { notify, notifyCompany } from "./notify";

/**
 * Check-ins after move-in. Four and twelve weeks after a referral reaches
 * MOVED_IN, the referrer and the provider are each asked "Is the placement
 * going well?". Answers flag placements at risk early and give councils the
 * sustainment figures they report on.
 */
export const CHECKIN_WEEKS = [4, 12] as const;
export type CheckInWeek = (typeof CHECKIN_WEEKS)[number];

export const HEALTH_LABELS = {
  GOING_WELL: "Going well",
  SOME_CONCERNS: "Some concerns",
  AT_RISK: "At risk",
  ENDED: "Placement ended",
} as const;

const DAY = 24 * 60 * 60 * 1000;
/** A prompt only goes out inside its window, so old placements aren't all asked at once. */
const WINDOWS: Record<CheckInWeek, [number, number]> = { 4: [28, 84], 12: [84, 120] };

/** When the referral moved in: its latest MOVED_IN event. */
export async function movedInAt(referralId: string): Promise<Date | null> {
  const event = await db.referralEvent.findFirst({
    where: { referralId, status: "MOVED_IN" },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  return event?.createdAt ?? null;
}

export async function runPlacementCheckIns(now = new Date()) {
  let sent = 0;
  for (const week of CHECKIN_WEEKS) {
    const [minDays, maxDays] = WINDOWS[week];
    const field = week === 4 ? "checkIn4SentAt" : "checkIn12SentAt";
    const due = await db.referral.findMany({
      where: {
        status: "MOVED_IN",
        [field]: null,
        events: {
          some: {
            status: "MOVED_IN",
            createdAt: { lte: new Date(now.getTime() - minDays * DAY), gte: new Date(now.getTime() - maxDays * DAY) },
          },
        },
      },
      select: { id: true, reference: true, referrerId: true, applicantFirstName: true, listing: { select: { companyId: true } } },
      take: 200,
    });

    for (const referral of due) {
      try {
        const href = `/checkins/${referral.id}?week=${week}`;
        const title = `${week}-week check-in: how is ${referral.applicantFirstName}'s placement going?`;
        const body = "It takes 30 seconds. Answers help spot placements that need support before they break down.";
        await notify({ userId: referral.referrerId, type: "REFERRAL", title, body, href, email: true });
        if (referral.listing) await notifyCompany(referral.listing.companyId, { type: "REFERRAL", title, body, href, email: true });
        await db.referral.update({ where: { id: referral.id }, data: { [field]: now } });
        sent += 1;
      } catch (error) {
        console.error("[checkins] prompt failed", error);
      }
    }
  }
  return { sent };
}

let started = false;
export function schedulePlacementCheckIns() {
  if (started) return;
  started = true;
  const tick = () => runPlacementCheckIns().catch((error) => console.error("[checkins] run failed", error));
  setTimeout(tick, 2 * 60_000);
  setInterval(tick, 60 * 60_000);
}

/** Lets the other side know straight away when a placement is flagged. */
export async function alertOtherSide(
  referral: { id: string; reference: string; referrerId: string; applicantFirstName: string; listing: { companyId: string } | null },
  side: "REFERRER" | "PROVIDER",
  health: keyof typeof HEALTH_LABELS,
) {
  if (health !== "AT_RISK" && health !== "ENDED") return;
  const title = health === "AT_RISK" ? `${referral.applicantFirstName}'s placement has been flagged at risk` : `${referral.applicantFirstName}'s placement has ended`;
  const body = `The ${side === "REFERRER" ? "referrer" : "provider"} answered the check-in for referral ${referral.reference}. Get in touch to agree next steps.`;
  const href = `/checkins/${referral.id}`;
  if (side === "REFERRER" && referral.listing) await notifyCompany(referral.listing.companyId, { type: "REFERRAL", title, body, href, email: true });
  if (side === "PROVIDER") await notify({ userId: referral.referrerId, type: "REFERRAL", title, body, href, email: true });
}
