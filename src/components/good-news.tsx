import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import type { CelebrationKind } from "./success-celebration";
import { GoodNewsCelebration } from "./good-news-celebration";

/**
 * Notifications worth a celebration (with a chime) the next time the person
 * opens RoomsNow. Keyed on the notification titles set in
 * server/actions/admin.ts and server/actions/accreditations.ts, so a change to
 * one of those titles needs updating here too.
 */
const CELEBRATE: Record<string, CelebrationKind> = {
  "Advert approved": "approved",
  "Verification approved": "verified",
  "Accreditation approved": "accreditation",
};

const LOOKBACK_MS = 14 * 24 * 60 * 60 * 1000;

/** Mounted once in the site layout. Renders nothing unless there's unread good news. */
export async function GoodNews() {
  const user = await getCurrentUser();
  if (!user) return null;
  const items = await db.notification.findMany({
    where: {
      userId: user.id,
      readAt: null,
      createdAt: { gte: new Date(Date.now() - LOOKBACK_MS) },
      title: { in: Object.keys(CELEBRATE) },
    },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { id: true, title: true, body: true },
  });
  if (items.length === 0) return null;
  return (
    <GoodNewsCelebration
      items={items.map((item) => ({
        id: item.id,
        kind: CELEBRATE[item.title],
        // The advert approval message names the advert; the others use the standard copy.
        message: CELEBRATE[item.title] === "approved" && item.body ? item.body : undefined,
      }))}
    />
  );
}
