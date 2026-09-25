import "server-only";
import { db } from "./db";
import { sendEmail } from "./notify";
import { escapeHtml, renderEmail } from "./email-template";
import { advertStrength } from "./advert-strength";
import { isSummaryTime } from "./uk-time";

/**
 * A short Monday-morning email to each provider with live adverts: views,
 * enquiries, referrals and move-ins for the past week, plus one tip from the
 * advert strength checks. It's a reminder that RoomsNow is working for them
 * (and a nudge to improve the weakest advert).
 *
 * Views are only stored as a running total per advert, so the company keeps
 * the total from the last summary (weeklySummaryViews) and this week's figure
 * is the difference. The first summary shows the running total instead.
 *
 * Providers turn it off from their company settings (Company.weeklySummary).
 */
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
/** Allows for the hourly check drifting a little either side of the hour. */
const RESEND_AFTER_MS = 6 * 24 * 60 * 60 * 1000;

const APP_URL = () => (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

export type WeeklyStats = {
  views: number;
  viewsAreTotal: boolean;
  enquiries: number;
  referrals: number;
  moveIns: number;
  tip: { title: string; listingId: string; score: number; action: string; gain: number } | null;
};

export async function weeklyStatsFor(companyId: string, baselineViews: number | null, now = new Date()) {
  const since = new Date(now.getTime() - WEEK_MS);
  const [listings, enquiries, referrals, referralMoveIns, requestMoveIns] = await Promise.all([
    db.listing.findMany({
      where: { companyId, status: { in: ["ACTIVE", "PAUSED", "PENDING_REVIEW", "DRAFT"] } },
      select: {
        id: true, title: true, status: true, views: true, summary: true, description: true, weeklyRentFrom: true,
        availableFrom: true, minAge: true, maxAge: true, accessibilityNotes: true, wheelchairAccess: true,
        supportTypes: true, supportDescription: true, referralRoutes: true, referralProcess: true, houseRules: true,
        media: { select: { type: true } },
      },
    }),
    db.accommodationRequest.count({ where: { listing: { companyId }, createdAt: { gte: since } } }),
    db.referral.count({ where: { listing: { companyId }, createdAt: { gte: since } } }),
    db.referral.count({ where: { listing: { companyId }, status: "MOVED_IN", updatedAt: { gte: since } } }),
    db.accommodationRequest.count({ where: { listing: { companyId }, status: "MOVED_IN", updatedAt: { gte: since } } }),
  ]);

  const totalViews = listings.reduce((sum, listing) => sum + listing.views, 0);
  const live = listings.filter((listing) => listing.status === "ACTIVE");
  const weakest = live
    .map((listing) => ({ listing, strength: advertStrength(listing) }))
    .filter((entry) => entry.strength.todo.length > 0)
    .sort((a, b) => a.strength.score - b.strength.score)[0];

  const stats: WeeklyStats = {
    views: baselineViews == null ? totalViews : Math.max(0, totalViews - baselineViews),
    viewsAreTotal: baselineViews == null,
    enquiries,
    referrals,
    moveIns: referralMoveIns + requestMoveIns,
    tip: weakest
      ? {
          title: weakest.listing.title,
          listingId: weakest.listing.id,
          score: weakest.strength.score,
          action: weakest.strength.todo[0].label,
          gain: weakest.strength.todo[0].points - weakest.strength.todo[0].earned,
        }
      : null,
  };
  return { stats, totalViews, liveAdverts: live.length };
}

const lowerFirst = (value: string) => value.charAt(0).toLowerCase() + value.slice(1);

function statCell(value: number, label: string) {
  return `<td align="center" style="padding:14px 6px; border:1px solid #D9E2EC; border-radius:10px; background:#F6F8FB;">
      <div style="font-size:26px; font-weight:700; color:#171F2E; line-height:1.1;">${value}</div>
      <div style="margin-top:4px; font-size:12px; color:#445064;">${label}</div>
    </td>`;
}

export function renderWeeklySummary(companyName: string, stats: WeeklyStats) {
  const app = APP_URL();
  const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);
  const viewsLabel = stats.viewsAreTotal ? plural(stats.views, "view so far", "views so far") : plural(stats.views, "view", "views");
  const headline = stats.viewsAreTotal
    ? `Here's how your adverts are doing on RoomsNow.`
    : stats.views + stats.enquiries + stats.referrals === 0
      ? `A quiet week. A few small improvements can help your adverts get noticed.`
      : `Your adverts were busy this week.`;
  const tipHtml = stats.tip
    ? `<p style="margin:18px 0 0; padding:14px 16px; border-radius:10px; background:#E8F2FC; color:#0F4F87; font-size:14px; line-height:1.55;">
        <strong>Tip:</strong> “${escapeHtml(stats.tip.title)}” is at ${stats.tip.score}% strength.
        Next step: ${escapeHtml(lowerFirst(stats.tip.action))} (+${stats.tip.gain}%).
        <a href="${app}/provider/adverts/${stats.tip.listingId}" style="color:#0F4F87;">Improve it</a>
      </p>`
    : "";
  const bodyHtml = `<p style="margin:0 0 16px;">${escapeHtml(headline)}</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="6" style="border-collapse:separate;">
      <tr>
        ${statCell(stats.views, viewsLabel)}
        ${statCell(stats.enquiries, plural(stats.enquiries, "enquiry", "enquiries"))}
      </tr>
      <tr>
        ${statCell(stats.referrals, plural(stats.referrals, "referral", "referrals"))}
        ${statCell(stats.moveIns, plural(stats.moveIns, "move-in", "move-ins"))}
      </tr>
    </table>
    ${tipHtml}`;
  const subject = stats.viewsAreTotal
    ? `Your RoomsNow summary: ${stats.views} ${viewsLabel}`
    : `This week on RoomsNow: ${stats.views} ${viewsLabel}, ${stats.enquiries} ${plural(stats.enquiries, "enquiry", "enquiries")}, ${stats.referrals} ${plural(stats.referrals, "referral", "referrals")}`;
  const text = [
    `${companyName}: your week on RoomsNow`,
    "",
    headline,
    "",
    `${stats.views} ${viewsLabel}`,
    `${stats.enquiries} ${plural(stats.enquiries, "enquiry", "enquiries")}`,
    `${stats.referrals} ${plural(stats.referrals, "referral", "referrals")}`,
    `${stats.moveIns} ${plural(stats.moveIns, "move-in", "move-ins")}`,
    ...(stats.tip ? ["", `Tip: "${stats.tip.title}" is at ${stats.tip.score}% strength. Next step: ${lowerFirst(stats.tip.action)} (+${stats.tip.gain}%): ${app}/provider/adverts/${stats.tip.listingId}`] : []),
    "",
    `Open your dashboard: ${app}/provider`,
    `Turn these emails off in your company settings: ${app}/provider/settings`,
  ].join("\n");
  const html = renderEmail({
    preheader: subject,
    heading: `${escapeHtml(companyName)}: your week on RoomsNow`,
    bodyHtml,
    ctaLabel: "Open your dashboard",
    ctaUrl: `${app}/provider`,
    note: `You get this every Monday while you have live adverts. <a href="${app}/provider/settings" style="color:#758196;">Turn it off in your company settings</a>.`,
  });
  return { subject, text, html };
}

export async function runWeeklySummaries(now = new Date()) {
  if (!isSummaryTime(now)) return { sent: 0 };
  const due = await db.company.findMany({
    where: {
      status: "ACTIVE",
      weeklySummary: true,
      OR: [{ weeklySummarySentAt: null }, { weeklySummarySentAt: { lt: new Date(now.getTime() - RESEND_AFTER_MS) } }],
      listings: { some: { status: "ACTIVE" } },
    },
    select: { id: true, name: true, tradingName: true, email: true, weeklySummaryViews: true },
    take: 500,
  });

  let sent = 0;
  for (const company of due) {
    try {
      const { stats, totalViews } = await weeklyStatsFor(company.id, company.weeklySummaryViews, now);
      const email = renderWeeklySummary(company.tradingName || company.name, stats);
      // Mark it first, so a delivery failure can't turn into an email every hour.
      await db.company.update({
        where: { id: company.id },
        data: { weeklySummarySentAt: now, weeklySummaryViews: totalViews },
      });
      await sendEmail({ to: company.email, ...email });
      sent += 1;
    } catch (error) {
      console.error(`[weekly-summary] ${company.id} failed`, error);
    }
  }
  return { sent };
}

let scheduled = false;

/** Called once from instrumentation.ts when the server boots; checks hourly. */
export function scheduleWeeklySummary() {
  if (scheduled) return;
  scheduled = true;
  const run = () => {
    runWeeklySummaries().catch((error) => console.error("[weekly-summary] failed", error));
  };
  setTimeout(run, 120_000);
  setInterval(run, 60 * 60 * 1000);
}
