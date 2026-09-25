/** The Monday summary goes out from this hour, UK time. */
const SEND_FROM_HOUR = 8;

/** True from 8am UK time on a Monday (Render runs in UTC, so ask for London time). */
export function isSummaryTime(now: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    weekday: "short",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const weekday = parts.find((part) => part.type === "weekday")?.value;
  const hour = Number(parts.find((part) => part.type === "hour")?.value);
  return weekday === "Mon" && hour >= SEND_FROM_HOUR;
}
