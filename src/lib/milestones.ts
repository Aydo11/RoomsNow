import "server-only";
import { db } from "./db";
import { notifyCompany } from "./notify";

/**
 * Small wins worth celebrating for a provider: their first enquiry, first
 * referral, first move-in, and an advert reaching 100 views. Each one sends a
 * normal notification with a fixed title. GoodNews (components/good-news.tsx)
 * turns unread notifications with these titles into a celebration with the
 * chime the next time someone from the company opens RoomsNow.
 *
 * Every milestone happens once per company. The check looks for an earlier
 * notification with the same title sent to any of the company's staff, so no
 * extra table is needed. Milestones never block the action that triggered
 * them: any failure is logged and ignored.
 */
export const MILESTONE_TITLES = {
  firstEnquiry: "Your first enquiry",
  firstReferral: "Your first referral",
  firstMoveIn: "Your first move-in",
  hundredViews: "100 views on an advert",
} as const;

type Milestone = keyof typeof MILESTONE_TITLES;

async function alreadyCelebrated(companyId: string, milestone: Milestone, key?: string) {
  const existing = await db.notification.findFirst({
    where: {
      title: MILESTONE_TITLES[milestone],
      ...(key ? { href: { contains: key } } : {}),
      user: { staffOf: { some: { companyId } } },
    },
    select: { id: true },
  });
  return Boolean(existing);
}

async function celebrate(companyId: string, milestone: Milestone, body: string, href: string, key?: string) {
  try {
    if (await alreadyCelebrated(companyId, milestone, key)) return;
    await notifyCompany(companyId, { type: "SYSTEM", title: MILESTONE_TITLES[milestone], body, href });
  } catch (error) {
    console.error(`[milestones] ${milestone} failed`, error);
  }
}

/** Call after a new accommodation request is created. */
export async function checkFirstEnquiry(companyId: string, requestId: string) {
  const count = await db.accommodationRequest.count({ where: { listing: { companyId } } }).catch(() => 0);
  if (count !== 1) return;
  await celebrate(
    companyId,
    "firstEnquiry",
    "Someone wants to live in one of your homes. Replying quickly makes a big difference.",
    `/provider/requests?request=${encodeURIComponent(requestId)}`,
  );
}

/** Call after a new referral to one of the company's adverts is created. */
export async function checkFirstReferral(companyId: string, referralId: string) {
  const count = await db.referral.count({ where: { listing: { companyId } } }).catch(() => 0);
  if (count !== 1) return;
  await celebrate(
    companyId,
    "firstReferral",
    "A professional has referred someone to your advert. Take a look and let them know what happens next.",
    `/provider/referrals/${referralId}`,
  );
}

/** Call after a referral or a direct request moves to MOVED_IN. */
export async function checkFirstMoveIn(companyId: string, href: string) {
  const [referrals, requests] = await Promise.all([
    db.referral.count({ where: { listing: { companyId }, status: "MOVED_IN" } }),
    db.accommodationRequest.count({ where: { listing: { companyId }, status: "MOVED_IN" } }),
  ]).catch(() => [0, 0]);
  if (referrals + requests !== 1) return;
  await celebrate(companyId, "firstMoveIn", "Someone has a new home because of you. That's what RoomsNow is here for.", href);
}

/** Call with an advert's view count right after it goes up. Fires once, on reaching 100. */
export async function checkHundredViews(listing: { id: string; companyId: string; title: string; views: number }) {
  if (listing.views !== 100) return;
  await celebrate(
    listing.companyId,
    "hundredViews",
    `“${listing.title}” has now been viewed 100 times.`,
    `/provider/adverts/${listing.id}`,
    listing.id,
  );
}
