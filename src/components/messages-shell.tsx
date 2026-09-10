"use client";

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

  return (
    <div className="shell py-0 sm:py-6 lg:py-8">
      <div className="grid overflow-hidden rounded-none border-line bg-white sm:rounded-card sm:border lg:grid-cols-[340px_1fr]">
        <aside
          className={clsx(
            "min-h-[70vh] border-line lg:block lg:min-h-[75vh] lg:border-r",
            onIndex ? "block" : "hidden lg:block",
          )}
        >
          {list}
        </aside>
        <main className={clsx("min-h-[70vh] lg:min-h-[75vh]", onIndex ? "hidden lg:block" : "block")}>
          {children}
        </main>
      </div>
    </div>
  );
}
