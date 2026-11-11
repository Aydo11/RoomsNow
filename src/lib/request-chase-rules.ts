/**
 * When to chase an unanswered accommodation request. Pure, so it can be tested.
 * 48 hours: remind the provider. 5 days: tell the applicant and show them other rooms.
 * Requests older than the lookback are left alone so a backlog doesn't trigger a burst of emails.
 */
const HOUR = 60 * 60 * 1000;
export const PROVIDER_CHASE_AFTER_MS = 48 * HOUR;
export const SEEKER_FOLLOW_UP_AFTER_MS = 5 * 24 * HOUR;
export const CHASE_LOOKBACK_MS = 30 * 24 * HOUR;
/** Statuses that mean the provider hasn't acted on the request yet. */
export const AWAITING_REPLY_STATUSES = ["SUBMITTED", "RECEIVED"] as const;

export function chasesDue(
  request: { createdAt: Date; providerChaseSentAt: Date | null; seekerFollowUpSentAt: Date | null },
  now: Date,
) {
  const age = now.getTime() - request.createdAt.getTime();
  const inWindow = age <= CHASE_LOOKBACK_MS;
  return {
    provider: inWindow && !request.providerChaseSentAt && age >= PROVIDER_CHASE_AFTER_MS,
    seeker: inWindow && !request.seekerFollowUpSentAt && age >= SEEKER_FOLLOW_UP_AFTER_MS,
  };
}
