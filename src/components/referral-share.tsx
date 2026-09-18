"use client";

import { useState } from "react";
import { toast } from "./toast";

/**
 * A provider's referral invite code plus link, each with its own copy
 * button. The code is the easier thing to share out loud, text, or read off
 * a screenshot; the link is the easier thing to just tap. The full absolute
 * URL is built server-side (see /provider/invite) so there is no
 * client/server hydration mismatch from reading window.location here.
 */
export function ReferralShare({ url, code }: { url: string; code?: string }) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  async function copyCode() {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(true);
      toast.success("Invite code copied.");
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      toast.error("Could not copy the code — copy it manually instead.");
    }
  }

  async function copyUrl() {
    try {
      if (navigator.share) {
        await navigator.share({ title: "Join RoomsNow", text: "Sign up on RoomsNow using my invite link:", url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopiedUrl(true);
      toast.success("Invite link copied.");
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        toast.error("Could not copy the link — copy it manually instead.");
      }
    }
  }

  return (
    <div className="space-y-4">
      {code && (
        <div>
          <p className="mb-1.5 text-[13px] font-medium text-ink-soft">Your invite code</p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="field inline-flex w-fit items-center font-mono text-[20px] font-semibold tracking-[0.25em]">
              {code}
            </span>
            <button type="button" onClick={copyCode} className="btn-secondary shrink-0">
              {copiedCode ? "Copied" : "Copy code"}
            </button>
          </div>
        </div>
      )}
      <div>
        {code && <p className="mb-1.5 text-[13px] font-medium text-ink-soft">Or share the full link</p>}
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            readOnly
            value={url}
            onFocus={(event) => event.target.select()}
            className="field flex-1 font-mono text-[13px]"
            aria-label="Your invite link"
          />
          <button type="button" onClick={copyUrl} className="btn-secondary shrink-0">
            {copiedUrl ? "Copied" : "Copy link"}
          </button>
        </div>
      </div>
    </div>
  );
}
