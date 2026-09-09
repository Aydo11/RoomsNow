/** Small helpers for reading FormData into the shapes zod expects. */
export const bool = (fd: FormData, key: string) => {
  const value = fd.get(key);
  return value === "on" || value === "true" || value === "1";
};
export const list = (fd: FormData, key: string) => fd.getAll(key).map(String).filter(Boolean);
export const text = (fd: FormData, key: string) => (fd.get(key) ?? "").toString();
export const num = (fd: FormData, key: string) => {
  const v = text(fd, key).trim();
  return v === "" ? undefined : Number(v);
};
export const date = (v: string | undefined) => (v ? new Date(v) : null);
/** £ input (e.g. "127.50") → pence. */
export const pence = (v: number | undefined) => (v === undefined ? undefined : Math.round(v * 100));
export const reference = (prefix: string) =>
  `${prefix}-${Date.now().toString(36).toUpperCase().slice(-5)}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
export const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
/**
 * Reads the repeatable "socialPlatform" / "socialUrl" row pairs written by
 * <SocialLinksField> back into an array, dropping rows left blank.
 */
export const socialLinks = (fd: FormData) => {
  const platforms = fd.getAll("socialPlatform").map(String);
  const urls = fd.getAll("socialUrl").map(String);
  const out: { platform: string; url: string }[] = [];
  platforms.forEach((platform, i) => {
    const url = (urls[i] ?? "").trim();
    if (url) out.push({ platform, url });
  });
  return out;
};
