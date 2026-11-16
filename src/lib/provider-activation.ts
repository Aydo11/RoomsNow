import "server-only";
import { db } from "./db";
import { notifyCompany } from "./notify";
import { audit } from "./audit";
import { ACTIVATION_LOOKBACK_MS, activationAction, activationDue, type ActivationStage } from "./provider-activation-rules";

const MESSAGES: Record<ActivationStage, { title: string; body: string; href: string }> = {
  no_advert: {
    title: "Add your first advert",
    body: "Your RoomsNow account is ready but you haven't advertised a room yet. Housing teams and people looking for a room search by what's free now. Add your first advert in a few minutes: area, rooms available, rent and who the room suits. You can add photos and details later.",
    href: "/provider/adverts/new",
  },
  draft_only: {
    title: "Your advert is still a draft",
    body: "You started an advert on RoomsNow but haven't submitted it, so nobody searching can see it yet. Finish and submit it and we'll review it before it goes live.",
    href: "/provider/adverts",
  },
};

/**
 * Hourly: remind providers who registered but never advertised, or left an
 * advert in draft. Each reminder is sent once (recorded in the audit log).
 */
export async function runProviderActivationNudges(now = new Date()) {
  const since = new Date(now.getTime() - ACTIVATION_LOOKBACK_MS);
  const companies = await db.company.findMany({
    where: {
      status: "ACTIVE",
      // No live, pending or paused adverts; recent enough to be worth a nudge.
      listings: { none: { status: { in: ["PENDING_REVIEW", "ACTIVE", "PAUSED", "REJECTED"] } } },
      OR: [{ createdAt: { gte: since } }, { listings: { some: { status: "DRAFT", updatedAt: { gte: since } } } }],
    },
    select: { id: true, createdAt: true, listings: { select: { status: true, updatedAt: true } } },
    take: 500,
  });
  if (!companies.length) return { sent: 0 };

  const logs = await db.auditLog.findMany({
    where: { targetType: "Company", targetId: { in: companies.map((c) => c.id) }, action: { startsWith: "nudge.provider_activation." } },
    select: { targetId: true, action: true },
  });

  let sent = 0;
  for (const company of companies) {
    const drafts = company.listings.filter((l) => l.status === "DRAFT");
    const due = activationDue({
      createdAt: company.createdAt,
      listingStatuses: company.listings.map((l) => l.status),
      latestDraftUpdate: drafts.length ? new Date(Math.max(...drafts.map((d) => d.updatedAt.getTime()))) : null,
      sent: logs.filter((log) => log.targetId === company.id).map((log) => log.action),
    }, now);
    if (!due) continue;
    try {
      await notifyCompany(company.id, { type: "LISTING", ...MESSAGES[due.stage], email: true });
      await audit({ action: activationAction(due.stage, due.step), targetType: "Company", targetId: company.id });
      sent += 1;
    } catch (error) {
      console.error("[provider-activation] reminder failed", error);
    }
  }
  return { sent };
}

let scheduled = false;
/** Called once from instrumentation.ts when the server boots; then hourly. */
export function scheduleProviderActivationNudges() {
  if (scheduled) return;
  scheduled = true;
  const run = () => runProviderActivationNudges().catch((error) => console.error("[provider-activation] failed", error));
  setTimeout(run, 7 * 60_000);
  setInterval(run, 60 * 60_000);
}
