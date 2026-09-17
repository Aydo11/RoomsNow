import { brand } from "@/brand.config";

/** Money is stored in pence, everywhere, always. */
export function money(pence: number | null | undefined, suffix = "") {
  if (pence === null || pence === undefined) return "—";
  const value = pence / 100;
  const formatted = value % 1 === 0 ? value.toFixed(0) : value.toFixed(2);
  return `${brand.currencySymbol}${formatted}${suffix}`;
}

export function rentRange(from?: number | null, to?: number | null) {
  if (!from && !to) return "Rent on request";
  if (from && to && from !== to) return `${money(from)}–${money(to)} per week`;
  return `${money(from ?? to)} per week`;
}

export function shortDate(date: Date | string | null | undefined) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function monthYear(date: Date | string | null | undefined) {
  if (!date) return "Now";
  return new Date(date).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

export function dateTime(date: Date | string | null | undefined) {
  if (!date) return "—";
  return new Date(date).toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function timeAgo(date: Date | string) {
  const then = new Date(date).getTime();
  const mins = Math.round((Date.now() - then) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  return shortDate(date);
}

export function ageFrom(dob: Date | string | null | undefined) {
  if (!dob) return null;
  const d = new Date(dob);
  const diff = Date.now() - d.getTime();
  return Math.floor(diff / (365.25 * 24 * 3600 * 1000));
}

export function initials(first: string, last: string) {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

/** Public display of a location: never the full address unless opted in. */
export function publicLocation(p: { city: string; area?: string | null; postcode: string; showExactAddress: boolean; addressLine1?: string | null }) {
  if (p.showExactAddress && p.addressLine1) return `${p.addressLine1}, ${p.city}, ${p.postcode}`;
  const outward = p.postcode.trim().split(" ")[0];
  return [p.area, p.city, outward].filter(Boolean).join(", ");
}
