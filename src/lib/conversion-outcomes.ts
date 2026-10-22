import { SignJWT, jwtVerify } from "jose";

export const OUTCOME_COOKIE = "rn_completed_actions";
export const ANALYTICS_CHOICE_COOKIE = "rn_analytics_choice";
export const OUTCOME_TTL = 300;
export type ConversionOutcome = { id: string; event: "sign_up" | "generate_lead" };

function validOutcome(value: unknown): value is ConversionOutcome {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return Object.keys(item).every((key) => key === "id" || key === "event")
    && typeof item.id === "string" && /^[a-f0-9-]{36}$/.test(item.id)
    && (item.event === "sign_up" || item.event === "generate_lead");
}

export async function sealOutcomes(events: ConversionOutcome[], secret: string, now = new Date()) {
  return new SignJWT({ events: events.slice(-4) })
    .setProtectedHeader({ alg: "HS256" })
    .setAudience("roomsnow-completed-actions")
    .setIssuedAt(Math.floor(now.getTime() / 1000))
    .setExpirationTime(Math.floor(now.getTime() / 1000) + OUTCOME_TTL)
    .sign(new TextEncoder().encode(secret));
}

export async function readOutcomes(token: string | undefined, secret: string, now = new Date()): Promise<ConversionOutcome[]> {
  if (!token) return [];
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
      algorithms: ["HS256"], audience: "roomsnow-completed-actions", currentDate: now,
    });
    return Array.isArray(payload.events) && payload.events.length <= 4 && payload.events.every(validOutcome)
      ? payload.events : [];
  } catch { return []; }
}

/** Replies, provider outreach and repeat requests are not new accommodation leads. */
export function isNewHousingEnquiry(role: string, toProvider: boolean, alreadyContacted: boolean) {
  return (role === "USER" || role === "REFERRER") && toProvider && !alreadyContacted;
}

/** Runs in an empty same-origin frame: private-page DOM and URLs never reach Google. */
export function outcomeDocument(events: ConversionOutcome[], origin: string) {
  const safe = JSON.stringify({ events: events.filter(validOutcome), location: `${new URL(origin).origin}/` }).replace(/</g, "\\u003c");
  return `<!doctype html><html><head><meta name="referrer" content="no-referrer"><title>RoomsNow</title></head><body>
<script type="application/json" id="completed-outcomes">${safe}</script>
<script src="/conversion-outcome.js" defer></script></body></html>`;
}
