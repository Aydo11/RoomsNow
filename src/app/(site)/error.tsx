"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import Link from "next/link";

export default function SiteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  // AuthorisationError (thrown by assertCompanyAccess and friends in
  // src/lib/rbac.ts) always carries a safe, user-facing message (e.g. "You
  // do not have access to this.", "Listing not found."). We only check the
  // error's name here rather than importing the class itself — rbac.ts pulls
  // in server-only code (next/headers, the db client) that a client
  // component like this one can't depend on.
  const message =
    error.name === "AuthorisationError"
      ? error.message
      : "Something went wrong loading this page. Please try again.";

  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <h1 className="text-[22px] font-semibold text-ink">Something didn&apos;t load</h1>
      <p className="mt-2 text-[15px] text-ink-soft">{message}</p>
      <p className="mt-1 text-[13px] text-ink-faint">Nothing you&apos;ve already saved has been lost.</p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button type="button" className="btn-primary" onClick={reset}>
          Try again
        </button>
        <Link href="/" className="btn-secondary">
          Return to RoomsNow
        </Link>
      </div>
    </div>
  );
}
