"use client";
import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { reloadForStaleBuild } from "@/lib/stale-build";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // A newer version of the site went live while this page was open.
    if (reloadForStaleBuild(error)) return;
    Sentry.captureException(error);
  }, [error]);
  return <html lang="en"><body style={{ fontFamily: "system-ui", padding: "3rem", background: "#f6f8fb", color: "#171f2e" }}>
    <main style={{ maxWidth: "32rem", margin: "10vh auto" }}>
      <h1>Something didn’t load</h1><p>Please try again. Your saved information has not been removed.</p>
      <button onClick={reset} style={{ padding: "12px 20px", cursor: "pointer" }}>Try again</button>
      <p><a href="/">Return to RoomsNow</a></p>
    </main>
  </body></html>;
}
