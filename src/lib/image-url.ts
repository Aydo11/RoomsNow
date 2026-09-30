/**
 * Uploaded photos are stored exactly as people took them, often 12 to 24
 * megapixels. A phone has to decode every one of those at full size (around
 * 50 to 100MB of memory each), so a page with a handful of them can crash
 * mobile Safari outright. This routes a stored image through Next's image
 * optimiser so the browser only ever gets a small, re-encoded copy.
 *
 * Only our own storage hosts are rewritten. Anything else (blob: previews,
 * data: URIs, private access-checked routes, static files) passes through.
 */

// Must stay within Next's allowed widths (deviceSizes + imageSizes).
const WIDTHS = [32, 48, 64, 96, 128, 256, 384, 640, 750, 828, 1080, 1200, 1920] as const;

const OPTIMISABLE = /^https:\/\/([a-z0-9-]+\.)*(r2\.dev|amazonaws\.com)\//i;

export function isOptimisableImage(url: string | null | undefined): url is string {
  if (!url) return false;
  // SVGs are already tiny and the optimiser refuses them.
  if (/\.svg(\?|$)/i.test(url)) return false;
  return OPTIMISABLE.test(url) || url.startsWith("/uploads/");
}

/** A copy of `url` about `width` CSS pixels wide (doubled for sharp screens, capped). */
export function optimisedImage(url: string, width: number): string;
export function optimisedImage(url: string | null | undefined, width: number): string | undefined;
export function optimisedImage(url: string | null | undefined, width: number): string | undefined {
  if (!url) return undefined;
  if (!isOptimisableImage(url)) return url;
  const target = Math.min(width * 2, 1920);
  const w = WIDTHS.find((candidate) => candidate >= target) ?? 1920;
  return `/_next/image?url=${encodeURIComponent(url)}&w=${w}&q=75`;
}
