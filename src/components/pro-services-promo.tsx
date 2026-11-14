"use client";

import Link from "next/link";
import { useState } from "react";

// The provider dashboard reads the same cookie name to skip rendering the card.
const PRO_PROMO_COOKIE = "rn-pro-promo-hidden";

/** Dashboard card advertising Pro Services. Providers can hide it; the choice is kept in a cookie. */
export function ProServicesPromo() {
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;
  const hide = () => {
    document.cookie = `${PRO_PROMO_COOKIE}=1; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
    setHidden(true);
  };
  return (
    <section className="card mb-5 flex flex-col gap-4 border-pine/30 bg-pine-light/40 p-5 sm:flex-row sm:items-center" aria-labelledby="pro-promo-heading">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-pine text-white" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16v12H4zM9 7V5h6v2M4 12h16" />
        </svg>
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-semibold uppercase tracking-wide text-pine-dark">New · Pro Services</p>
        <h2 id="pro-promo-heading" className="mt-1 text-[20px]">A staff CRM, a website, or 1:1 help from housing managers</h2>
        <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">
          Run staff and properties in one CRM from £59/month, get a website for your service, or book expert hours and monthly mentoring. Pay online or ask for a free call first.
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        <Link href="/provider/pro-services" className="btn-primary text-center">See Pro Services</Link>
        <button type="button" onClick={hide} className="btn-ghost">Not now</button>
      </div>
    </section>
  );
}
