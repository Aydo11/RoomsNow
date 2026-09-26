/**
 * Ready-made message suggestions shown as tappable chips above the message
 * box, so people who aren't sure what to say have somewhere to start. Tapping
 * one only fills in the box; nothing is sent until they press Send.
 */

export type ReplyViewer = "provider" | "referrer" | "seeker";

const STARTERS: Record<ReplyViewer, string[]> = {
  seeker: [
    "Is the room still available?",
    "Can I come and view it?",
    "Do you accept Housing Benefit?",
    "Are bills included?",
    "What support do you offer?",
    "When could I move in?",
  ],
  referrer: [
    "Is the room still available for a referral?",
    "What's your referral process?",
    "Could my client view the room?",
    "Do you accept Housing Benefit?",
    "How many support hours are included?",
    "Thanks, I'll send the referral now.",
  ],
  provider: [
    "The room is still available.",
    "When would suit you for a viewing?",
    "Will Housing Benefit cover the rent?",
    "Can you tell me about the support you need?",
    "Sorry, this room has now been let.",
    "Thanks, speak soon.",
  ],
};

/** Up to `limit` suggestions, starting with a direct answer to the other person's last message where one fits. */
export function suggestedReplies(viewer: ReplyViewer, lastFromOther: string | null, limit = 7): string[] {
  const last = (lastFromOther ?? "").trim();
  const answers: string[] = [];
  if (/\bthank(s| you)\b/i.test(last)) answers.push("You're welcome!");
  if (last.endsWith("?")) answers.push("Yes, that works for me.", "Sorry, not at the moment.");
  if (/\bview(ing)?\b/i.test(last)) answers.push("What days and times suit you?");
  return [...new Set([...answers, ...STARTERS[viewer]])].slice(0, limit);
}
