import { responseLabel } from "./response-label";

/**
 * Reply health: how quickly a provider answers the people who message them.
 * Fast repliers rank higher in search; providers who leave people waiting are
 * labelled "may be slow to reply" after 14 days of silence. Adverts are never
 * paused for not replying.
 */
export const SLOW_AFTER_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

export const REPLY_TIER = { FAST: 0, NORMAL: 1, SLOW: 2 } as const;
export const SLOW_REPLY_LABEL = "May be slow to reply";
export const NO_REPLIES_PAUSE = "NO_REPLIES";

type Msg = { senderId: string; createdAt: Date };

/**
 * For one conversation (messages oldest first): the first message from
 * someone outside the team that still has no team reply after it, who sent
 * it, and the team's latest message.
 */
export function conversationWaiting(messages: Msg[], team: Set<string>) {
  let lastTeamAt: Date | null = null;
  let waitingSince: Date | null = null;
  let waitingFrom: string | null = null;
  for (const message of messages) {
    if (team.has(message.senderId)) {
      lastTeamAt = message.createdAt;
      waitingSince = null;
      waitingFrom = null;
    } else if (!waitingSince) {
      waitingSince = message.createdAt;
      waitingFrom = message.senderId;
    }
  }
  return { waitingSince, waitingFrom, lastTeamAt };
}

/**
 * The tier for a provider. Silence only counts against them while someone is
 * actually waiting: a provider with no enquiries is never "slow".
 */
export function replyTier(
  { waitingSince, lastTeamReplyAt, responseMinutes, responseSampleSize }: {
    waitingSince: Date | null;
    lastTeamReplyAt: Date | null;
    responseMinutes: number | null;
    responseSampleSize: number;
  },
  now = Date.now(),
) {
  const silentFor = (days: number) =>
    !!waitingSince &&
    now - waitingSince.getTime() >= days * DAY_MS &&
    (!lastTeamReplyAt || now - lastTeamReplyAt.getTime() >= days * DAY_MS);
  if (silentFor(SLOW_AFTER_DAYS)) return REPLY_TIER.SLOW;
  if (responseLabel(responseMinutes, responseSampleSize)) return REPLY_TIER.FAST;
  return REPLY_TIER.NORMAL;
}

/** Card and advert label, or null. */
export function slowReplyLabel(tier: number | null | undefined) {
  return tier != null && tier >= REPLY_TIER.SLOW ? SLOW_REPLY_LABEL : null;
}
