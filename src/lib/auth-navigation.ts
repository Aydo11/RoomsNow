/** Only allow destinations on this site, including through emailed auth links. */
export function safeRedirect(target: string | null | undefined, fallback = "") {
  if (!target || !target.startsWith("/") || target.startsWith("//") || /[\\\u0000-\u001f\u007f]/.test(target)) return fallback;
  return target;
}

export function authHref(path: string, target?: string | null) {
  const next = safeRedirect(target);
  return next ? `${path}${path.includes("?") ? "&" : "?"}next=${encodeURIComponent(next)}` : path;
}
