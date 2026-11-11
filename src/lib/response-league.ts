import { median } from "./response-label";

/** Replies needed in the window before a provider can appear in the league. */
export const LEAGUE_MIN_REPLIES = 3;
export const LEAGUE_DAYS = 30;

/** Fastest median first reply first; more replies breaks a tie. Pure, so it can be tested. */
export function rankResponders(samples: Map<string, number[]>, min = LEAGUE_MIN_REPLIES) {
  return [...samples.entries()]
    .filter(([, values]) => values.length >= min)
    .map(([companyId, values]) => ({ companyId, minutes: median(values)!, replies: values.length }))
    .sort((a, b) => a.minutes - b.minutes || b.replies - a.replies);
}

/** "12 min", "2 hr 5 min", "1 day 3 hr". */
export function formatReplyTime(minutes: number) {
  if (minutes < 60) return `${Math.max(1, Math.round(minutes))} min`;
  if (minutes < 24 * 60) {
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return m ? `${h} hr ${m} min` : `${h} hr`;
  }
  const d = Math.floor(minutes / (24 * 60));
  const h = Math.round((minutes % (24 * 60)) / 60);
  return h ? `${d} day${d === 1 ? "" : "s"} ${h} hr` : `${d} day${d === 1 ? "" : "s"}`;
}
