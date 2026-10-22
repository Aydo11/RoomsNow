import "server-only";
import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { ANALYTICS_CHOICE_COOKIE, OUTCOME_COOKIE, OUTCOME_TTL, readOutcomes, sealOutcomes, type ConversionOutcome } from "@/lib/conversion-outcomes";

/** Called only after a successful write. Optional measurement must never block the service. */
export async function recordConversionOutcome(event: ConversionOutcome["event"]) {
  try {
    const jar = await cookies();
    if (jar.get(ANALYTICS_CHOICE_COOKIE)?.value !== "accepted") return;
    const secret = process.env.AUTH_SECRET;
    if (!secret || secret.length < 32) return;
    const pending = await readOutcomes(jar.get(OUTCOME_COOKIE)?.value, secret);
    pending.push({ id: randomUUID(), event });
    jar.set(OUTCOME_COOKIE, await sealOutcomes(pending, secret), {
      httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: OUTCOME_TTL,
    });
  } catch { /* Analytics failure must not prevent a registration or enquiry. */ }
}
