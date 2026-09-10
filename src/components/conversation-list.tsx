"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { initials, timeAgo } from "@/lib/format";
import { ConversationActions } from "./conversation-actions";
import { clsx } from "@/lib/clsx";

export type ConversationRow = {
  id: string;
  otherFirstName: string;
  otherLastName: string;
  otherName: string;
  subject: string | null;
  lastMessage: string | null;
  lastMessageAt: string;
  unread: boolean;
  archived: boolean;
};

type Tab = "all" | "unread" | "archived";

export function ConversationList({ conversations }: { conversations: ConversationRow[] }) {
  const pathname = usePathname();
  const activeId = pathname.startsWith("/messages/") ? pathname.split("/")[2] : undefined;
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");

  const counts = useMemo(
    () => ({
      all: conversations.filter((c) => !c.archived).length,
      unread: conversations.filter((c) => !c.archived && c.unread).length,
      archived: conversations.filter((c) => c.archived).length,
    }),
    [conversations],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return conversations.filter((c) => {
      if (tab === "all" && c.archived) return false;
      if (tab === "unread" && (c.archived || !c.unread)) return false;
      if (tab === "archived" && !c.archived) return false;
      if (!q) return true;
      return (
        c.otherName.toLowerCase().includes(q) ||
        (c.subject ?? "").toLowerCase().includes(q) ||
        (c.lastMessage ?? "").toLowerCase().includes(q)
      );
    });
  }, [conversations, tab, query]);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-line p-4">
        <h1 className="text-[20px]">Messages</h1>
        <div className="relative mt-3">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search conversations"
            aria-label="Search conversations"
            className="field"
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {(["all", "unread", "archived"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={clsx(
                "rounded-pill px-3 py-1 text-[13px]",
                tab === t ? "bg-ink text-white" : "bg-paper-sunk text-ink-soft hover:text-ink",
              )}
            >
              {t === "all" ? "All" : t === "unread" ? "Unread" : "Archived"}
              {counts[t] > 0 && ` (${counts[t]})`}
            </button>
          ))}
        </div>
      </div>

      <ul className="flex-1 divide-y divide-line overflow-y-auto">
        {filtered.length === 0 ? (
          <li className="px-4 py-10 text-center text-[14px] text-ink-faint">
            {query
              ? "No conversations match your search."
              : tab === "archived"
                ? "No archived conversations."
                : tab === "unread"
                  ? "You're all caught up."
                  : "No conversations yet."}
          </li>
        ) : (
          filtered.map((c) => (
            <li key={c.id} className="group relative">
              <Link
                href={`/messages/${c.id}`}
                className={clsx(
                  "flex gap-3 py-3 pl-4 pr-16 hover:bg-paper-sunk",
                  activeId === c.id && "bg-pine-light/40",
                )}
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-paper-sunk text-[13px] text-ink-soft">
                  {initials(c.otherFirstName, c.otherLastName)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className={clsx("truncate text-[14px]", c.unread ? "font-semibold text-ink" : "text-ink")}>
                      {c.otherName}
                    </span>
                    <span className="shrink-0 text-[12px] text-ink-faint">{timeAgo(c.lastMessageAt)}</span>
                  </span>
                  {c.lastMessage && (
                    <span className={clsx("mt-0.5 block truncate text-[13px]", c.unread ? "text-ink" : "text-ink-soft")}>
                      {c.lastMessage}
                    </span>
                  )}
                </span>
                {c.unread && <span className="mt-2 h-2 w-2 shrink-0 self-start rounded-full bg-pine" aria-hidden="true" />}
              </Link>
              <span className="absolute right-2 top-1/2 hidden -translate-y-1/2 group-hover:flex group-focus-within:flex">
                <ConversationActions conversationId={c.id} archived={c.archived} variant="row" />
              </span>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
