"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "./toast";
import { timeAgo } from "@/lib/format";
import { clsx } from "@/lib/clsx";

type Item = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  href: string | null;
  readAt: string | null;
  createdAt: string;
};

type Feed = { unread: number; unreadMessages: number; items: Item[] };

const POLL_MS = 30_000;

/**
 * The bell in the header. Shows what's new without leaving the page, keeps the
 * count fresh while the tab is open, and pops a toast when something arrives.
 */
export function NotificationBell({ initialUnread, settingsHref }: { initialUnread: number; settingsHref: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [feed, setFeed] = useState<Feed>({ unread: initialUnread, unreadMessages: 0, items: [] });
  const [loaded, setLoaded] = useState(false);
  const [ringing, setRinging] = useState(false);
  const seen = useRef<Set<string> | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications", { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as Feed;
      // Anything unread we haven't seen before (after the first load) is news.
      if (seen.current) {
        const fresh = data.items.filter((item) => !item.readAt && !seen.current!.has(item.id));
        if (fresh.length) {
          toast.info(fresh.length === 1 ? fresh[0].title : `${fresh.length} new notifications`);
          setRinging(true);
          window.setTimeout(() => setRinging(false), 1200);
        }
      }
      seen.current = new Set([...(seen.current ?? []), ...data.items.map((item) => item.id)]);
      setFeed(data);
      setLoaded(true);
    } catch {
      /* offline: try again on the next tick */
    }
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, POLL_MS);
    const onVisible = () => document.visibilityState === "visible" && void load();
    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  // Refresh after every navigation too (reading a thread clears its messages).
  useEffect(() => {
    setOpen(false);
    void load();
  }, [pathname, load]);

  // "(3) RoomsNow" in the tab title while there's something unread. Next sets
  // the title itself after navigating, so re-apply whenever it changes.
  useEffect(() => {
    const total = feed.unread;
    const apply = () => {
      const base = document.title.replace(/^\(\d+\+?\)\s*/, "");
      const next = total > 0 ? `(${total > 99 ? "99+" : total}) ${base}` : base;
      if (document.title !== next) document.title = next;
    };
    apply();
    const watcher = new MutationObserver(apply);
    watcher.observe(document.head, { childList: true, subtree: true, characterData: true });
    return () => watcher.disconnect();
  }, [feed.unread]);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: PointerEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function mark(body: { id: string } | { all: true }) {
    setFeed((current) => ({
      ...current,
      unread: "all" in body ? 0 : Math.max(0, current.unread - (current.items.some((i) => i.id === body.id && !i.readAt) ? 1 : 0)),
      items: current.items.map((item) => ("all" in body || item.id === body.id ? { ...item, readAt: item.readAt ?? new Date().toISOString() } : item)),
    }));
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        keepalive: true,
      });
    } catch {
      /* the next poll puts the count right */
    }
  }

  const count = feed.unread;
  const label = count > 0 ? `Notifications, ${count} unread` : "Notifications";

  return (
    <div ref={wrapRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          setOpen((value) => !value);
          if (!open) void load();
        }}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={label}
        title="Notifications"
        className={clsx(
          "relative grid h-10 w-10 place-items-center rounded-full text-ink-soft transition-colors hover:bg-paper-sunk hover:text-ink",
          open && "bg-paper-sunk text-ink",
        )}
      >
        <svg viewBox="0 0 24 24" className={clsx("h-[21px] w-[21px]", ringing && "bell-ring")} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 16.5V11a6 6 0 1 1 12 0v5.5l1.5 2h-15l1.5-2Z" />
          <path d="M10 20.5a2.2 2.2 0 0 0 4 0" />
        </svg>
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-pill bg-clay px-1 text-[10.5px] font-semibold leading-none text-white ring-2 ring-paper">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="fixed inset-x-3 top-[68px] z-50 animate-fade-in-up overflow-hidden rounded-card border border-line bg-paper-card shadow-float sm:absolute sm:inset-x-auto sm:right-0 sm:top-[calc(100%+8px)] sm:w-[380px]"
        >
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
            <p className="text-[15px] font-semibold text-ink">Notifications</p>
            {count > 0 && (
              <button type="button" onClick={() => void mark({ all: true })} className="text-[13px] font-medium text-brand hover:underline">
                Mark all as read
              </button>
            )}
          </div>

          {feed.unreadMessages > 0 && (
            <Link
              href="/messages"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 border-b border-line bg-brand/5 px-4 py-2.5 text-[13.5px] text-ink hover:bg-brand/10"
            >
              <TypeIcon type="MESSAGE" />
              <span className="flex-1">
                {feed.unreadMessages} conversation{feed.unreadMessages === 1 ? "" : "s"} waiting for a reply
              </span>
              <span aria-hidden="true" className="text-brand">→</span>
            </Link>
          )}

          <div className="max-h-[min(420px,calc(100vh-190px))] overflow-y-auto overscroll-contain">
            {!loaded ? (
              <ul aria-hidden="true" className="divide-y divide-line">
                {[0, 1, 2].map((n) => (
                  <li key={n} className="flex gap-3 px-4 py-3.5">
                    <span className="h-8 w-8 shrink-0 rounded-full bg-paper-sunk" />
                    <span className="flex-1 space-y-2 pt-1">
                      <span className="block h-3 w-3/4 rounded-full bg-paper-sunk" />
                      <span className="block h-3 w-1/2 rounded-full bg-paper-sunk" />
                    </span>
                  </li>
                ))}
              </ul>
            ) : feed.items.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="text-[15px] font-medium text-ink">You&apos;re all caught up</p>
                <p className="mt-1 text-[13.5px] text-ink-soft">Replies, request updates and new rooms will show up here.</p>
              </div>
            ) : (
              <ul className="divide-y divide-line">
                {feed.items.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={item.href ?? "/dashboard/notifications"}
                      onClick={() => {
                        if (!item.readAt) void mark({ id: item.id });
                        setOpen(false);
                      }}
                      className={clsx("flex gap-3 px-4 py-3 transition-colors hover:bg-paper-sunk/70", !item.readAt && "bg-pine-light/25")}
                    >
                      <TypeIcon type={item.type} />
                      <span className="min-w-0 flex-1">
                        <span className={clsx("block text-[14px] leading-snug text-ink", !item.readAt && "font-semibold")}>{item.title}</span>
                        {item.body && <span className="mt-0.5 line-clamp-2 block text-[13px] leading-snug text-ink-soft">{item.body}</span>}
                        <span className="mt-1 block text-[11.5px] text-ink-faint">{timeAgo(item.createdAt)}</span>
                      </span>
                      {!item.readAt && <span aria-label="Unread" className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand" />}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-2.5 text-[13px]">
            <Link href="/dashboard/notifications" onClick={() => setOpen(false)} className="font-medium text-brand hover:underline">
              See all notifications
            </Link>
            <Link href={settingsHref} onClick={() => setOpen(false)} className="text-ink-soft hover:text-ink hover:underline">
              Phone alerts
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

const TYPE_STYLE: Record<string, { tone: string; path: React.ReactNode }> = {
  MESSAGE: { tone: "bg-brand/10 text-brand", path: <path d="M4 5h16v11H8l-4 4V5Z" /> },
  REQUEST: { tone: "bg-pine-light text-pine-dark", path: <path d="M6 3h9l5 5v13H6V3Zm8 0v6h6M9 13h7M9 17h5" /> },
  REFERRAL: { tone: "bg-pine-light text-pine-dark", path: <path d="M16 11a4 4 0 1 0-8 0M4 20a8 8 0 0 1 16 0M18 4l2 2-2 2" /> },
  LISTING: { tone: "bg-brand/10 text-brand", path: <path d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3V10.5Z" /> },
  SAVED_LISTING: { tone: "bg-clay-light text-clay", path: <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" /> },
  MEMBERSHIP: { tone: "bg-clay-light text-clay", path: <path d="m12 3 2.6 5.6 6 .7-4.5 4.1 1.2 6-5.3-3-5.3 3 1.2-6L3.4 9.3l6-.7L12 3Z" /> },
  VERIFICATION: { tone: "bg-pine-light text-pine-dark", path: <path d="M12 3 5 6v5c0 4.5 3 8.2 7 10 4-1.8 7-5.5 7-10V6l-7-3Zm-3 9 2 2 4-4" /> },
  REVIEW: { tone: "bg-clay-light text-clay", path: <path d="m12 3 2.6 5.6 6 .7-4.5 4.1 1.2 6-5.3-3-5.3 3 1.2-6L3.4 9.3l6-.7L12 3Z" /> },
  SYSTEM: { tone: "bg-paper-sunk text-ink-soft", path: <path d="M12 8v5M12 16.5v.5M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18Z" /> },
};

export function TypeIcon({ type }: { type: string }) {
  const style = TYPE_STYLE[type] ?? TYPE_STYLE.SYSTEM;
  return (
    <span aria-hidden="true" className={clsx("grid h-8 w-8 shrink-0 place-items-center rounded-full", style.tone)}>
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {style.path}
      </svg>
    </span>
  );
}
