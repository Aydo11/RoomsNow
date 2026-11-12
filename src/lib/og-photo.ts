/** Shared bits for the PNG share cards drawn with next/og. */

const MARK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path d="M24 6 L44 22 V40 H4 V22 Z" fill="white"/><rect x="12" y="28" width="8" height="12" rx="1" fill="#1666AA"/><circle cx="35" cy="30" r="7" stroke="#549DE5" stroke-width="3" fill="#171F2E"/><line x1="40.2" y1="35.2" x2="44.5" y2="39.5" stroke="#549DE5" stroke-width="3" stroke-linecap="round"/></svg>`;
export const MARK_URI = `data:image/svg+xml;base64,${Buffer.from(MARK).toString("base64")}`;

function absolute(url: string) {
  if (/^https?:\/\//.test(url)) return url;
  const base = (process.env.APP_URL ?? "https://www.roomsnow.co.uk").replace(/\/$/, "");
  return `${base}${url.startsWith("/") ? "" : "/"}${url}`;
}

/** Photos are fetched here so a broken or slow image never breaks the card. */
export async function photoData(url: string): Promise<string | null> {
  try {
    const response = await fetch(absolute(url), { signal: AbortSignal.timeout(6000) });
    const type = response.headers.get("content-type") ?? "";
    if (!response.ok || !/^image\/(jpeg|png|webp|gif)/.test(type)) return null;
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > 6 * 1024 * 1024) return null;
    return `data:${type.split(";")[0]};base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  }
}
