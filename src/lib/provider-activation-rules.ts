/**
 * Which "finish setting up" reminder a provider is due, if any. Pure, so it can be tested.
 * Two stalls, each reminded twice (2 days, then 7 days):
 * - no_advert: registered but never started an advert.
 * - draft_only: started an advert but never submitted it.
 * Anything older than the lookback is left alone so a backlog doesn't trigger a burst of emails.
 */
const DAY = 24 * 60 * 60 * 1000;
export const ACTIVATION_STEPS_MS = [2 * DAY, 7 * DAY] as const;
export const ACTIVATION_LOOKBACK_MS = 60 * DAY;

export type ActivationStage = "no_advert" | "draft_only";

/** Audit action used to record (and dedupe) each reminder. */
export const activationAction = (stage: ActivationStage, step: number) => `nudge.provider_activation.${stage}.${step}`;

export function activationDue(
  company: {
    createdAt: Date;
    /** Statuses of the company's adverts. */
    listingStatuses: string[];
    /** Most recent update to any of its drafts, if it has drafts. */
    latestDraftUpdate: Date | null;
    /** Audit actions already recorded for this company. */
    sent: string[];
  },
  now: Date,
): { stage: ActivationStage; step: number } | null {
  const live = company.listingStatuses.some((s) => s !== "DRAFT" && s !== "ARCHIVED");
  if (live) return null;
  const hasDraft = company.listingStatuses.includes("DRAFT") && company.latestDraftUpdate;
  const stage: ActivationStage = hasDraft ? "draft_only" : "no_advert";
  const since = hasDraft ? company.latestDraftUpdate! : company.createdAt;
  const age = now.getTime() - since.getTime();
  if (age > ACTIVATION_LOOKBACK_MS) return null;
  // Send only the latest step that is due and not yet sent; never two at once.
  for (let step = ACTIVATION_STEPS_MS.length; step >= 1; step--) {
    if (age >= ACTIVATION_STEPS_MS[step - 1]) {
      return company.sent.includes(activationAction(stage, step)) ? null : { stage, step };
    }
  }
  return null;
}
