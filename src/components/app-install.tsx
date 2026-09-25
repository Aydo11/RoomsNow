"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { toast } from "./toast";
import { removePushSubscriptionAction, savePushSubscriptionAction, sendTestPushAction } from "@/server/actions/push";

/**
 * Home-screen app support: registers the service worker, keeps hold of the
 * browser's "install" prompt, and provides the settings card for installing
 * RoomsNow and turning phone notifications on or off.
 */

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

let deferredPrompt: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

function useInstallPrompt() {
  return useSyncExternalStore(subscribe, () => deferredPrompt, () => null);
}

export function isStandalone() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function isIos() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

/** Mounted once in the root layout. */
export function PwaRegister() {
  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      deferredPrompt = event as InstallPromptEvent;
      emit();
    };
    const onInstalled = () => {
      deferredPrompt = null;
      emit();
      toast.success("RoomsNow is on your home screen.");
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      const register = () => navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => undefined);
      if (document.readyState === "complete") register();
      else window.addEventListener("load", register, { once: true });
    }
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);
  return null;
}

function urlBase64ToUint8Array(base64: string) {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(padded);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

type PushState = "loading" | "unsupported" | "needs-install" | "blocked" | "off" | "on";

/** Settings card: install the app, and turn notifications on for this device. */
export function AppSettings({ vapidKey }: { vapidKey: string | null }) {
  const prompt = useInstallPrompt();
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);
  const [push, setPush] = useState<PushState>("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setInstalled(isStandalone());
    setIos(isIos());
    void (async () => {
      const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window && Boolean(vapidKey);
      if (!supported) {
        // iPhones only allow notifications once RoomsNow is on the home screen.
        setPush(isIos() && !isStandalone() ? "needs-install" : "unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        setPush("blocked");
        return;
      }
      const registration = await navigator.serviceWorker.getRegistration("/");
      const existing = await registration?.pushManager.getSubscription();
      setPush(existing ? "on" : "off");
    })();
  }, [vapidKey]);

  async function install() {
    if (!prompt) return;
    await prompt.prompt();
    const choice = await prompt.userChoice.catch(() => null);
    deferredPrompt = null;
    emit();
    if (choice?.outcome === "accepted") setInstalled(true);
  }

  async function turnOn() {
    if (!vapidKey) return;
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setPush(permission === "denied" ? "blocked" : "off");
        return;
      }
      const registration = (await navigator.serviceWorker.getRegistration("/")) ?? (await navigator.serviceWorker.register("/sw.js", { scope: "/" }));
      await navigator.serviceWorker.ready;
      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapidKey) }));
      const json = subscription.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
      const result = await savePushSubscriptionAction({
        endpoint: json.endpoint ?? "",
        keys: { p256dh: json.keys?.p256dh ?? "", auth: json.keys?.auth ?? "" },
        userAgent: navigator.userAgent,
      });
      if (!result.ok) {
        await subscription.unsubscribe().catch(() => undefined);
        toast.error(result.message ?? "Couldn't turn notifications on.");
        setPush("off");
        return;
      }
      setPush("on");
      toast.success("Notifications are on for this device.");
    } catch {
      toast.error("Couldn't turn notifications on. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  async function turnOff() {
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration("/");
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await removePushSubscriptionAction(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setPush("off");
      toast.info("Notifications are off for this device.");
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    setBusy(true);
    const result = await sendTestPushAction().catch(() => ({ ok: false, message: "Couldn't send a test." }));
    setBusy(false);
    if (result.ok) toast.success(result.message);
    else toast.error(result.message);
  }

  return (
    <section className="card mt-6 p-6">
      <h2 className="text-[20px]">RoomsNow on your phone</h2>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-[46ch]">
          <p className="text-[15px] font-medium text-ink">Add RoomsNow to your home screen</p>
          <p className="mt-0.5 text-[13px] leading-relaxed text-ink-faint">
            Open it with one tap, like an app. It doesn&apos;t take up space the way an app store app does.
          </p>
        </div>
        {installed ? (
          <span className="chip chip-active self-start">Added to this device</span>
        ) : prompt ? (
          <button type="button" onClick={() => void install()} className="btn-primary self-start">
            <PhoneIcon />
            Add to home screen
          </button>
        ) : ios ? (
          <p className="max-w-[30ch] self-start rounded-[10px] bg-paper-sunk px-3 py-2 text-[13px] leading-relaxed text-ink-soft">
            In Safari, tap <ShareGlyph /> <strong>Share</strong>, then <strong>Add to Home Screen</strong>.
          </p>
        ) : (
          <p className="max-w-[30ch] self-start rounded-[10px] bg-paper-sunk px-3 py-2 text-[13px] leading-relaxed text-ink-soft">
            Open your browser&apos;s menu and choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.
          </p>
        )}
      </div>

      <div className="mt-5 flex flex-col gap-4 border-t border-line pt-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-[46ch]">
          <p className="text-[15px] font-medium text-ink">Phone notifications</p>
          <p className="mt-0.5 text-[13px] leading-relaxed text-ink-faint">
            Get a notification when new rooms match your alerts, when someone messages you, or when a referral moves on. Only on this device.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start">
          {push === "loading" && <span className="skeleton h-10 w-40" />}
          {push === "off" && (
            <button type="button" onClick={() => void turnOn()} disabled={busy} className="btn-primary">
              <BellIcon />
              Turn on notifications
            </button>
          )}
          {push === "on" && (
            <>
              <span className="chip chip-active">On for this device</span>
              <button type="button" onClick={() => void test()} disabled={busy} className="btn-secondary py-2">
                Send a test
              </button>
              <button type="button" onClick={() => void turnOff()} disabled={busy} className="btn-ghost py-2">
                Turn off
              </button>
            </>
          )}
          {push === "needs-install" && (
            <p className="max-w-[30ch] text-[13px] leading-relaxed text-ink-soft">
              On iPhone, add RoomsNow to your home screen first, then open it from there and turn notifications on.
            </p>
          )}
          {push === "blocked" && (
            <p className="max-w-[30ch] text-[13px] leading-relaxed text-ink-soft">
              Notifications are blocked for RoomsNow. Allow them in your browser or phone settings, then come back here.
            </p>
          )}
          {push === "unsupported" && <p className="max-w-[30ch] text-[13px] text-ink-soft">This browser can&apos;t show notifications.</p>}
        </div>
      </div>
    </section>
  );
}

/** A small "get the app" line for the home page; hidden once installed or when there's nothing to offer. */
export function InstallHint() {
  const prompt = useInstallPrompt();
  const [show, setShow] = useState<"prompt" | "ios" | null>(null);

  useEffect(() => {
    if (isStandalone()) return setShow(null);
    if (prompt) return setShow("prompt");
    if (isIos()) return setShow("ios");
    setShow(null);
  }, [prompt]);

  if (!show) return null;
  return (
    <p className="mt-2 text-center text-[13px] text-ink-faint">
      {show === "prompt" ? (
        <button type="button" onClick={() => void prompt?.prompt()} className="font-semibold text-pine-dark underline-offset-4 hover:underline">
          Add RoomsNow to your home screen
        </button>
      ) : (
        <>
          On iPhone: tap <ShareGlyph /> Share, then <strong>Add to Home Screen</strong> to keep RoomsNow one tap away.
        </>
      )}
    </p>
  );
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="5.5" y="2.5" width="9" height="15" rx="2" />
      <path d="M9 14.5h2" strokeLinecap="round" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M5.5 13.5V9a4.5 4.5 0 0 1 9 0v4.5l1.5 1.5H4l1.5-1.5ZM8.5 17a1.6 1.6 0 0 0 3 0" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ShareGlyph() {
  return (
    <svg viewBox="0 0 20 20" className="inline h-4 w-4 align-[-3px]" fill="none" stroke="currentColor" strokeWidth="1.8" aria-label="Share">
      <path d="M10 3v9M7 6l3-3 3 3M5.5 9.5v6a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1v-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
