/**
 * Security headers are applied to every response. The CSP is the part most
 * likely to need adjusting: `'unsafe-inline'` for styles is there because
 * Tailwind and Next inject style attributes, and script-src allows Next's
 * inline bootstrap. Tighten it with a nonce when you add a CSP reporting
 * endpoint — the shape is here to be tightened, not to be assumed sufficient.
 */
import { withSentryConfig } from "@sentry/nextjs/config";
import { fileURLToPath } from "node:url";
const isDev = process.env.NODE_ENV !== "production";
let sentryOrigin = "";
try { sentryOrigin = new URL(process.env.NEXT_PUBLIC_SENTRY_DSN || "").origin; } catch {}

const csp = [
  "default-src 'self'",
  // Next injects an inline bootstrap script; dev additionally needs eval for HMR.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  // Map tiles and uploaded images.
  "img-src 'self' data: blob: https: https://tile.openstreetmap.org https://*.tile.openstreetmap.org",
  `connect-src 'self' https://api.postcodes.io https://tile.openstreetmap.org https://*.tile.openstreetmap.org ${sentryOrigin}`,
  // Only the video embeds the gallery actually builds.
  "frame-src https://www.youtube.com https://player.vimeo.com",
  "media-src 'self' blob: https:",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=(self), payment=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  { key: "Origin-Agent-Cluster", value: "?1" },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  ...(isDev
    ? []
    : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]),
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: { root: fileURLToPath(new URL(".", import.meta.url)) },
  poweredByHeader: false,
  images: {
    // Deliberately narrow. Widen it to the hosts you actually serve images from.
    remotePatterns: [
      { protocol: "https", hostname: "**.amazonaws.com" },
      // Cloudflare R2 public bucket URLs (pub-<hash>.r2.dev) serve listing/company photos.
      { protocol: "https", hostname: "**.r2.dev" },
      // YouTube thumbnails stand in as the cover for adverts with only a video link.
      { protocol: "https", hostname: "i.ytimg.com", pathname: "/vi/**" },
    ],
  },
  experimental: {
  serverActions: {
    // The advert-photo uploader accepts up to 12 files per batch (images up
    // to 8MB, video up to 20MB each — see src/lib/storage.ts LIMITS), so a
    // realistic batch of a handful of full-size phone photos can comfortably
    // clear the old 25mb ceiling. When a request body exceeds this limit,
    // Next aborts the multipart body mid-stream ("Unexpected end of form")
    // *before* our own per-file validation ever runs, which surfaced to
    // providers as a raw page-level crash instead of a friendly "too large"
    // message. Raised to give real-world batches room; the client-side
    // pre-submit size check in media-manager.tsx is the actual backstop that
    // keeps requests comfortably under this ceiling, so this limit and that
    // client-side cap should be changed together.
    bodySizeLimit: "45mb",
    // Server Actions are rejected unless the Origin matches. In production set
    // APP_URL so this is the real host rather than whatever the proxy claims.
    allowedOrigins: process.env.APP_URL ? [new URL(process.env.APP_URL).host] : undefined,
  },
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Private documents are never cached by a shared cache.
      {
        source: "/api/documents/:path*",
        headers: [{ key: "Cache-Control", value: "private, no-store, max-age=0" }],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
});
