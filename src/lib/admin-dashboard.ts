/** Pure helpers for the admin Overview dashboard (layout and thresholds agreed with ChatGPT). */

export type Delta = { text: string; tone: "up" | "down" | "flat" };

/** Change vs the previous period. A zero previous period shows as a count, not a percentage. */
export function delta(current: number, previous: number): Delta {
  const diff = current - previous;
  const tone = diff > 0 ? "up" : diff < 0 ? "down" : "flat";
  if (previous === 0) return { text: diff === 0 ? "No change" : `${diff > 0 ? "+" : ""}${diff} vs 0`, tone };
  const pct = Math.round((diff / previous) * 100);
  return { text: `${pct > 0 ? "+" : ""}${pct}% vs previous 30 days`, tone };
}

const ukDay = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(d);

/** Counts per UK calendar day for the last `days` days, oldest first, ending today. */
export function dailySeries(dates: Date[], days: number, now = new Date()): { day: string; count: number }[] {
  const keys = Array.from({ length: days }, (_, i) => ukDay(new Date(now.getTime() - (days - 1 - i) * 86_400_000)));
  const counts = new Map(keys.map((k) => [k, 0]));
  for (const d of dates) {
    const k = ukDay(d);
    if (counts.has(k)) counts.set(k, counts.get(k)! + 1);
  }
  return keys.map((day) => ({ day, count: counts.get(day)! }));
}

export type Alert = { level: "red" | "amber"; text: string; href: string };

/** Alerts with starting thresholds; tune once normal volumes are known. */
export function dashboardAlerts(x: {
  availableRooms: number;
  liveAdverts: number;
  pendingAdverts: number;
  pendingVerification: number;
  pendingAccreditations: number;
  newProEnquiries: number;
  requests: [number, number];
  referrals: [number, number];
}): Alert[] {
  const out: Alert[] = [];
  if (x.liveAdverts > 0 && x.availableRooms === 0) out.push({ level: "red", text: "No rooms are available on any live advert.", href: "/admin/listings" });
  if (x.pendingAdverts >= 10) out.push({ level: "amber", text: `${x.pendingAdverts} adverts are waiting for review.`, href: "/admin/listings?status=PENDING_REVIEW" });
  if (x.pendingVerification >= 5) out.push({ level: "amber", text: `${x.pendingVerification} verification checks are waiting.`, href: "/admin/verification" });
  if (x.pendingAccreditations >= 5) out.push({ level: "amber", text: `${x.pendingAccreditations} accreditations are waiting.`, href: "/admin/accreditations" });
  if (x.newProEnquiries >= 5) out.push({ level: "amber", text: `${x.newProEnquiries} Pro Services enquiries have had no reply yet.`, href: "/admin/pro-services" });
  for (const [label, [now, before], href] of [["Requests", x.requests, "/admin/requests"], ["Referrals", x.referrals, "/admin/referrals"]] as const) {
    if (before >= 20 && now <= before * 0.7) out.push({ level: "amber", text: `${label} are down ${Math.round(((before - now) / before) * 100)}% (${now} vs ${before} in the previous 30 days).`, href });
  }
  return out;
}

/** "3 days", "5 hours", "just now" — how long something has waited. */
export function waited(since: Date, now = new Date()) {
  const mins = Math.floor((now.getTime() - since.getTime()) / 60_000);
  if (mins < 60) return mins < 2 ? "just now" : `${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours} hour${hours === 1 ? "" : "s"}`;
  return `${Math.floor(hours / 24)} days`;
}
