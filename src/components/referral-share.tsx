"use client";

import { useState } from "react";
import { toast } from "./toast";

/**
 * Read-only link field + copy button for a provider's referral invite link.
 * The full absolute URL is built server-side (see /provider/invite) so there
 * is no client/server hydration mismatch from reading window.location here.
 */
export function ReferralShare({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      if (navigator.share) {
        await navigator.share({ title: "Join RoomsNow", text: "Sign up on RoomsNow using my invite link:", url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Invite link copied.");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        toast.error("Could not copy the link — copy it manually instead.");
      }
    }
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <input
        readOnly
        value={url}
        onFocus={(event) => event.target.select()}
        className="field flex-1 font-mono text-[13px]"
        aria-label="Your invite link"
      />
      <button type="button" onClick={copy} className="btn-secondary shrink-0">
        {copied ? "Copied" : "Copy link"}
      </button>
    </div>
  );
}
