"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { clsx } from "@/lib/clsx";

/**
 * Desktop shows the conversation list and the open thread side by side.
 * Mobile shows one at a time: the list on /messages, the thread once a
 * conversation is opened — matching how a phone inbox behaves.
 */
export function MessagesShell({
  list,
  children,
}: {
  list: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const onIndex = pathname === "/messages";

  // With a conversation open on a phone, hide the bottom tab bar so the
  // messages get the whole screen (the header's back arrow returns to the list).
  useEffect(() => {
    if (onIndex) return;
    document.documentElement.dataset.chatOpen = "1";
    return () => {
      delete document.documentElement.dataset.chatOpen;
    };
  }, [onIndex]);

  return (
    <div className="shell py-0 max-sm:px-0 sm:py-6 lg:py-8">
      <div className="grid grid-cols-1 overflow-hidden rounded-none border-line bg-white sm:rounded-card sm:border lg:grid-cols-[340px_minmax(0,1fr)]">
        <aside
          className={clsx(
            "min-h-[70vh] border-line lg:block lg:min-h-[75vh] lg:border-r",
            onIndex ? "block" : "hidden lg:block",
          )}
        >
          {list}
        </aside>
        <main className={clsx("flex h-[calc(100dvh-4rem)] min-h-[26rem] flex-col sm:h-[calc(100dvh-9rem)] sm:min-h-[34rem] lg:h-[75vh] lg:min-h-[540px]", onIndex ? "hidden lg:flex" : "flex")}>
          {children}
        </main>
      </div>
    </div>
  );
}
