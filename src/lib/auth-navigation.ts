/** Only allow destinations on this site, including through emailed auth links. */
export function safeRedirect(target: string | null | undefined, fallback = "") {
  if (!target || !target.startsWith("/") || target.startsWith("//") || /[\\\u0000-\u001f\u007f]/.test(target)) return fallback;
  return target;
}

export function authHref(path: string, target?: string | null) {
  const next = safeRedirect(target);
  return next ? `${path}${path.includes("?") ? "&" : "?"}next=${encodeURIComponent(next)}` : path;
}

/** Identify the public advert behind an accommodation request return path. */
export function requestAdvertPath(target?: string | null) {
  const match = /^\/listings\/([a-zA-Z0-9_-]+)\/request\/?$/.exec(safeRedirect(target));
  return match ? `/listings/${match[1]}` : null;
}

/** Resume the actual room search after joining, without carrying campaign IDs or arbitrary input. */
export function searchReturnPath(params: Record<string, string | string[] | undefined>) {
  const allowed = new Set(["q", "where", "support", "type", "from", "gender", "minAge", "wheelchair", "furnished", "ensuite", "selfContained", "petsAllowed", "resident", "hb", "referral", "verified", "vetted", "maxRent", "minRent", "radius", "bbox", "sort", "page", "view"]);
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (!allowed.has(key) || value == null) continue;
    for (const item of Array.isArray(value) ? value : [value]) {
      if (item) query.append(key, item);
    }
  }
  const suffix = query.toString();
  return `/search${suffix ? `?${suffix}` : ""}#room-alerts`;
}
