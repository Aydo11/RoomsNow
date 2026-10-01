/** Keep account details and free-text searches out of marketing pixels. */
export function isPublicAnalyticsPage(pathname: string) {
  return !/^\/(admin|api|dashboard|messages|people|provider|service-provider|services\/(quotes|saved)|referrals|login|register|verify-email|forgot-password|reset-password)(\/|$)/.test(pathname);
}

export function canLoadMarketingTags(pathname: string, search: string) {
  // Permit campaign attribution, but never free-text searches or account data.
  return isPublicAnalyticsPage(pathname) && [...new URLSearchParams(search)].every(([key, value]) => isSafeCampaignParameter(key, value));
}

function isSafeCampaignParameter(key: string, value: string) {
  return /^(utm_(source|medium|campaign|content|term|id)|gclid|gbraid|wbraid|fbclid|ttclid)$/.test(key)
    && /^[a-zA-Z0-9_.-]{1,250}$/.test(value);
}

export function publicAnalyticsUrl(origin: string, pathname: string, search: string) {
  const safe = new URLSearchParams();
  for (const [key, value] of new URLSearchParams(search)) {
    if (isSafeCampaignParameter(key, value)) safe.append(key, value);
  }
  const query = safe.toString();
  return `${origin}${pathname}${query ? `?${query}` : ""}`;
}

export function createGoogleCommandQueue(dataLayer: unknown[]) {
  // Google consumes Arguments objects, as in its documented installation shim.
  return function (..._args: unknown[]) {
    dataLayer.push(arguments);
  };
}
