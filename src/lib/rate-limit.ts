import "server-only";
import { headers } from "next/headers";

/**
 * Rate limiting. The default driver is a fixed-window counter in process memory,
 * which is genuinely useful in development and on a single instance, and useless
 * across several. `RATE_LIMIT_DRIVER=upstash` uses an atomic counter shared by
 * every web instance. Everything else calls `rateLimit()` and doesn't care which.
 *
 * Fail open on driver errors: a broken counter should not take the site down.
 */

export type RateLimitResult = { ok: boolean; remaining: number; retryAfterSeconds: number };
export type RateLimitOptions = { limit: number; windowMs: number };

interface RateLimitDriver {
  hit(key: string, options: RateLimitOptions): Promise<RateLimitResult>;
  reset(key: string): Promise<void>;
}

const buckets = new Map<string, { count: number; expiresAt: number }>();

const memoryDriver: RateLimitDriver = {
  async hit(key, { limit, windowMs }) {
    const now = Date.now();
    const bucket = buckets.get(key);

    // Opportunistic sweep so the map can't grow without bound.
    if (buckets.size > 10_000) {
      for (const [k, v] of buckets) if (v.expiresAt < now) buckets.delete(k);
    }

    if (!bucket || bucket.expiresAt < now) {
      buckets.set(key, { count: 1, expiresAt: now + windowMs });
      return { ok: true, remaining: limit - 1, retryAfterSeconds: 0 };
    }

    bucket.count += 1;
    const ok = bucket.count <= limit;
    return {
      ok,
      remaining: Math.max(0, limit - bucket.count),
      retryAfterSeconds: ok ? 0 : Math.ceil((bucket.expiresAt - now) / 1000),
    };
  },

  async reset(key) {
    buckets.delete(key);
  },
};

const RATE_LIMIT_SCRIPT = `
local current = redis.call("INCR", KEYS[1])
if current == 1 then redis.call("PEXPIRE", KEYS[1], ARGV[1]) end
return {current, redis.call("PTTL", KEYS[1])}
`;

async function upstash(command: Array<string | number>) {
  const url = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, "");
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error("Upstash REST credentials are missing.");
  const response = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Upstash returned ${response.status}.`);
  const payload = (await response.json()) as { result?: unknown; error?: string };
  if (payload.error) throw new Error(payload.error);
  return payload.result;
}

const upstashDriver: RateLimitDriver = {
  async hit(key, { limit, windowMs }) {
    const result = await upstash(["EVAL", RATE_LIMIT_SCRIPT, 1, `supportrooms:rate:${key}`, windowMs]);
    if (!Array.isArray(result)) throw new Error("Unexpected Upstash response.");
    const count = Number(result[0]);
    const ttl = Math.max(0, Number(result[1]));
    const ok = count <= limit;
    return {
      ok,
      remaining: Math.max(0, limit - count),
      retryAfterSeconds: ok ? 0 : Math.ceil(ttl / 1000),
    };
  },
  async reset(key) {
    await upstash(["DEL", `supportrooms:rate:${key}`]);
  },
};

const driver: RateLimitDriver = process.env.RATE_LIMIT_DRIVER === "upstash" ? upstashDriver : memoryDriver;

export async function rateLimit(key: string, options: RateLimitOptions): Promise<RateLimitResult> {
  try {
    return await driver.hit(key, options);
  } catch (error) {
    console.error("Rate limiter unavailable, allowing request:", error);
    return { ok: true, remaining: options.limit, retryAfterSeconds: 0 };
  }
}

export async function resetRateLimit(key: string) {
  try {
    await driver.reset(key);
  } catch {
    // Not worth failing a successful login over.
  }
}

/**
 * Caller IP. Trusting a proxy header is only safe behind a proxy you control —
 * set TRUST_PROXY=false if the app is exposed directly, and this falls back to
 * a shared bucket rather than a spoofable one.
 */
export async function callerIp(): Promise<string> {
  if (process.env.TRUST_PROXY === "false") return "direct";
  const header = await headers();
  const forwarded = header.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return header.get("x-real-ip") ?? "unknown";
}

/** Standard buckets, so limits are consistent and easy to review in one place. */
export const LIMITS = {
  login: { limit: 8, windowMs: 15 * 60_000 },
  loginPerAccount: { limit: 10, windowMs: 15 * 60_000 },
  register: { limit: 5, windowMs: 60 * 60_000 },
  passwordChange: { limit: 5, windowMs: 60 * 60_000 },
  passwordReset: { limit: 4, windowMs: 60 * 60_000 },
  oauth: { limit: 20, windowMs: 15 * 60_000 },
  message: { limit: 30, windowMs: 60_000 },
  emailVerification: { limit: 5, windowMs: 60 * 60_000 },
  request: { limit: 10, windowMs: 60 * 60_000 },
  referral: { limit: 20, windowMs: 60 * 60_000 },
  report: { limit: 10, windowMs: 60 * 60_000 },
  feedback: { limit: 6, windowMs: 60 * 60_000 },
  upload: { limit: 40, windowMs: 60 * 60_000 },
  view: { limit: 1, windowMs: 30 * 60_000 },
} as const;
