/** Conversations needed before a provider gets a response-time badge. */
export const MIN_RESPONSE_SAMPLE = 3;
/** A conversation still unanswered after a week counts as a week. */
const UNANSWERED_CAP_MINUTES = 7 * 24 * 60;

/**
 * The "Usually replies within…" badge text, or null when the provider isn't
 * fast enough or there's too little history. Kept apart from response-time.ts
 * (which talks to the database) so any component can import it.
 */
export function responseLabel(minutes: number | null | undefined, sample: number | null | undefined) {
  if (minutes == null || !sample || sample < MIN_RESPONSE_SAMPLE) return null;
  if (minutes <= 60) return "Usually replies within an hour";
  if (minutes <= 180) return "Usually replies within a few hours";
  if (minutes <= 24 * 60) return "Usually replies within a day";
  return null;
}

export function median(values: number[]) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

/**
 * Minutes from the first outside message to the first team reply, or null if
 * the conversation doesn't count (the provider started it, or it's too new to
 * judge without a reply).
 */
export function firstReplyMinutes(
  messages: { senderId: string; createdAt: Date }[],
  teamIds: Set<string>,
  now = new Date(),
) {
  const first = messages[0];
  if (!first || teamIds.has(first.senderId)) return null;
  const reply = messages.find((message) => teamIds.has(message.senderId));
  if (reply) return Math.max(0, Math.round((reply.createdAt.getTime() - first.createdAt.getTime()) / 60_000));
  const waiting = Math.round((now.getTime() - first.createdAt.getTime()) / 60_000);
  return waiting >= UNANSWERED_CAP_MINUTES ? UNANSWERED_CAP_MINUTES : null;
}
