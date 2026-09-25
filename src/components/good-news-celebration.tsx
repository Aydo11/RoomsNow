"use client";

import { useEffect, useState } from "react";
import { SuccessCelebration, type CelebrationKind } from "./success-celebration";

type Item = { id: string; kind: CelebrationKind; message?: string };

const STORAGE_KEY = "roomsnow:celebrated";

function celebratedIds(): string[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

/**
 * Shows each piece of good news once per browser: the newest approval that
 * hasn't been celebrated yet gets the celebration and the chime, and every
 * item on the list is then marked as seen, so a batch of approvals makes one
 * ding rather than several. The notifications themselves stay unread.
 */
export function GoodNewsCelebration({ items }: { items: Item[] }) {
  const [current, setCurrent] = useState<Item | null>(null);

  useEffect(() => {
    const seen = celebratedIds();
    const fresh = items.find((item) => !seen.includes(item.id));
    if (!fresh) return;
    try {
      const next = [...items.map((item) => item.id), ...seen.filter((id) => !items.some((item) => item.id === id))].slice(0, 50);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // If storage is blocked, the celebration may show again on the next page. That's fine.
    }
    setCurrent(fresh);
  }, [items]);

  if (!current) return null;
  return <SuccessCelebration kind={current.kind} message={current.message} onDone={() => setCurrent(null)} />;
}
