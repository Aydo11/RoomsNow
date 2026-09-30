"use client";

import { useState } from "react";

/** Signs out with a normal form post, so it works even before the page has finished loading. */
export function SignOutButton({ className }: { className?: string }) {
  const [pending, setPending] = useState(false);
  return (
    <form action="/api/auth/logout" method="post" onSubmit={() => setPending(true)}>
      <button type="submit" disabled={pending} aria-busy={pending} className={className}>
        {pending ? "Signing out…" : "Sign out"}
      </button>
    </form>
  );
}
