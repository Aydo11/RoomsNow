"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const MEASUREMENT_ID = "G-V2RLYZNG3S";
const TIKTOK_PIXEL_ID = "DAT2MPBC77U3L597UVV0";
const CONSENT_KEY = "roomsnow-analytics-consent";
type ConsentChoice = "accepted" | "rejected" | null;

declare global {
  interface Window {
    dataLayer?: unknown[][];
    gtag?: (...args: unknown[]) => void;
    TiktokAnalyticsObject?: string;
    ttq?: Array<unknown> & {
      page?: (...args: unknown[]) => void;
      track?: (...args: unknown[]) => void;
      holdConsent?: () => void;
      grantConsent?: () => void;
      revokeConsent?: () => void;
      load?: (id: string, options?: Record<string, unknown>) => void;
      _i?: Record<string, unknown>;
      _t?: Record<string, number>;
      _o?: Record<string, unknown>;
      setAndDefer?: (target: Record<string, unknown>, method: string) => void;
      instance?: (id: string) => unknown;
    };
  }
}

function isPublicPage(pathname: string) {
  // Avoid account, referral, message and applicant-profile pages. Query strings
  // are never sent because they may contain a searcher's free-text location.
  return !/^\/(admin|api|dashboard|messages|people|provider|referrals|login|register|forgot-password|reset-password)(\/|$)/.test(pathname);
}

function eraseOptionalCookies() {
  const names = document.cookie.split(";").map((cookie) => cookie.split("=")[0]?.trim()).filter(Boolean);
  for (const name of names) {
    if (!name.startsWith("_ga") && name !== "_ttp" && name !== "_tt_enable_cookie" && !name.startsWith("ttcsid")) continue;
    document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax`;
    document.cookie = `${name}=; Max-Age=0; path=/; domain=${location.hostname}; SameSite=Lax`;
    if (location.hostname.endsWith(".roomsnow.co.uk")) {
      document.cookie = `${name}=; Max-Age=0; path=/; domain=.roomsnow.co.uk; SameSite=Lax`;
    }
  }
}

function initialiseTikTokPixel() {
  if (window.ttq?.load) {
    window.ttq.grantConsent?.();
    return;
  }
  const methodNames = ["page", "track", "identify", "instances", "debug", "on", "off", "once", "ready", "alias", "group", "enableCookie", "disableCookie", "holdConsent", "revokeConsent", "grantConsent"];
  window.TiktokAnalyticsObject = "ttq";
  const queue = (window.ttq = (window.ttq || []) as NonNullable<Window["ttq"]>);
  const defer = (target: Record<string, unknown>, method: string) => {
    target[method] = (...args: unknown[]) => queue.push([method, ...args]);
  };
  queue.setAndDefer = defer;
  for (const method of methodNames) defer(queue as unknown as Record<string, unknown>, method);
  queue.instance = (id: string) => {
    queue._i = queue._i || {};
    const instance = (queue._i[id] || []) as Record<string, unknown>;
    for (const method of methodNames) defer(instance, method);
    return instance;
  };
  queue.load = (id: string, options: Record<string, unknown> = {}) => {
    const url = "https://analytics.tiktok.com/i18n/pixel/events.js";
    queue._i = queue._i || {};
    queue._i[id] = [];
    queue._t = queue._t || {};
    queue._t[id] = Date.now();
    queue._o = queue._o || {};
    queue._o[id] = options;
    const script = document.createElement("script");
    script.type = "text/javascript";
    script.async = true;
    script.src = `${url}?sdkid=${encodeURIComponent(id)}&lib=ttq`;
    document.head.appendChild(script);
  };
  queue.grantConsent?.();
  queue.load(TIKTOK_PIXEL_ID);
}

export function GoogleAnalyticsConsent() {
  const pathname = usePathname();
  const [choice, setChoice] = useState<ConsentChoice>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [ready, setReady] = useState(false);
  const [tiktokReady, setTikTokReady] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(CONSENT_KEY);
    if (saved === "accepted" || saved === "rejected") setChoice(saved);
    const openSettings = () => setShowSettings(true);
    window.addEventListener("roomsnow:cookie-settings", openSettings);
    return () => window.removeEventListener("roomsnow:cookie-settings", openSettings);
  }, []);

  useEffect(() => {
    if (choice !== "accepted") return;

    initialiseTikTokPixel();
    setTikTokReady(true);

    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || ((...args: unknown[]) => window.dataLayer?.push(args));
    window.gtag("consent", "default", { analytics_storage: "denied", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });

    const existing = document.querySelector<HTMLScriptElement>(`script[src*="${MEASUREMENT_ID}"]`);
    if (existing) {
      window.gtag("consent", "update", { analytics_storage: "granted" });
      window.gtag("config", MEASUREMENT_ID, { send_page_view: false, allow_google_signals: false });
      setReady(true);
      return;
    }

    window.gtag("js", new Date());
    window.gtag("consent", "update", { analytics_storage: "granted" });
    window.gtag("config", MEASUREMENT_ID, { send_page_view: false, allow_google_signals: false });
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
    script.onload = () => setReady(true);
    document.head.appendChild(script);
  }, [choice]);

  useEffect(() => {
    if (choice === "accepted" && ready && isPublicPage(pathname)) {
      window.gtag?.("event", "page_view", { page_path: pathname, page_location: `${window.location.origin}${pathname}`, page_title: document.title });
    }
  }, [choice, pathname, ready]);

  useEffect(() => {
    if (choice === "accepted" && tiktokReady && isPublicPage(pathname)) window.ttq?.page?.();
  }, [choice, pathname, tiktokReady]);

  function choose(next: Exclude<ConsentChoice, null>) {
    window.localStorage.setItem(CONSENT_KEY, next);
    setChoice(next);
    setShowSettings(false);
    if (next === "rejected") {
      window.gtag?.("consent", "update", { analytics_storage: "denied", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
      window.ttq?.revokeConsent?.();
      eraseOptionalCookies();
      setReady(false);
      setTikTokReady(false);
    }
  }

  if (choice !== null && !showSettings) return null;

  return (
    <aside aria-label="Cookie preferences" className="fixed inset-x-3 bottom-[5.25rem] z-[80] mx-auto max-w-3xl rounded-card border border-line bg-white p-4 shadow-float sm:inset-x-6 sm:bottom-3 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-2xl">
          <h2 className="text-[16px]">Your privacy choices</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">
            RoomsNow uses essential cookies for the service. With your permission, Google Analytics and the TikTok Pixel measure visits to public pages, improve RoomsNow and measure campaigns. Search terms and account, message, referral, provider, applicant-profile and dashboard pages are not tracked.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button type="button" className="btn-secondary" onClick={() => choose("rejected")}>Reject optional</button>
          <button type="button" className="btn-primary" onClick={() => choose("accepted")}>Accept optional cookies</button>
        </div>
      </div>
    </aside>
  );
}
