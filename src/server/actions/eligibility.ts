"use server";

import { countListings, parseArrayParam, type SearchParams } from "@/server/search";
import { callerIp, rateLimit } from "@/lib/rate-limit";
import { ELIGIBILITY_KEYS } from "@/lib/eligibility";

/**
 * Running total for the eligibility check: how many live rooms fit the answers
 * so far. Public, so it's rate-limited per IP; returns null when throttled and
 * the check just stops showing the number.
 */
export async function countEligibleAction(query: string): Promise<number | null> {
  const limit = await rateLimit(`eligibility:${await callerIp()}`, { limit: 240, windowMs: 60 * 60_000 });
  if (!limit.ok) return null;

  const raw = new URLSearchParams(query.slice(0, 1000));
  const params: SearchParams = {};
  for (const key of ELIGIBILITY_KEYS) {
    const value = raw.get(key);
    if (!value) continue;
    if (key === "support" || key === "referral") params[key] = parseArrayParam(value);
    else params[key] = value.slice(0, 80);
  }
  try {
    return await countListings(params);
  } catch (error) {
    console.error("[eligibility] count failed", error);
    return null;
  }
}
