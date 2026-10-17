import "server-only";
import { db } from "./db";
import { audit } from "./audit";
import { blockedContent, type BlockedMatch } from "./blocked-content-patterns";

export { BLOCKED_ADVERT_TEXT, BLOCKED_MESSAGE_TEXT } from "./blocked-content-patterns";

type PhraseLists = { block: string[]; flag: string[] };
let cache: { at: number; lists: PhraseLists } | null = null;

/** Admin-added words, cached for a minute so every message isn't a DB read. */
export async function adminPhrases(): Promise<PhraseLists> {
  if (cache && Date.now() - cache.at < 60_000) return cache.lists;
  try {
    const rows = await db.blockedPhrase.findMany({ select: { phrase: true, action: true } });
    const lists = {
      block: rows.filter((row) => row.action !== "FLAG").map((row) => row.phrase),
      flag: rows.filter((row) => row.action === "FLAG").map((row) => row.phrase),
    };
    cache = { at: Date.now(), lists };
    return lists;
  } catch (error) {
    console.error("[blocked-content] could not load phrases", error);
    return { block: [], flag: [] };
  }
}

export function clearPhraseCache() {
  cache = null;
}

/**
 * Checks text a user is about to send or publish. Returns what matched (and
 * records the attempt for the Safety flags page), or null if it's fine.
 */
export async function checkBlockedContent(
  text: string,
  context: { actorId: string; where: "message" | "advert"; targetId?: string | null },
): Promise<BlockedMatch | null> {
  if (!text.trim()) return null;
  const { block } = await adminPhrases();
  const match = blockedContent(text, block);
  if (!match) return null;
  await audit({
    actorId: context.actorId,
    action: "safety.content_blocked",
    targetType: context.where === "advert" ? "Listing" : "Conversation",
    targetId: context.targetId ?? undefined,
    metadata: { where: context.where, reason: match.label, excerpt: text.slice(0, 500) },
  }).catch(() => undefined);
  return match;
}
