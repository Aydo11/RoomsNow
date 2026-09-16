import * as Sentry from "@sentry/nextjs";
import { privateErrorOptions } from "./lib/sentry-options";

export async function register() {
  Sentry.init({
    ...privateErrorOptions,
    dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
    enabled: Boolean(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN),
  });

  // Only the Node.js server runtime should run these timers — this function
  // also fires in the Edge runtime, which has no setInterval-based
  // background work and no database access.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { scheduleSavedSearchDigest } = await import("./lib/saved-search-alerts");
    scheduleSavedSearchDigest();
    const { scheduleListingFreshnessCheck } = await import("./lib/listing-availability");
    scheduleListingFreshnessCheck();
  }
}

export const onRequestError = Sentry.captureRequestError;
