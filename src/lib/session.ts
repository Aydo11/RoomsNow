import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { cache } from "react";
import { db } from "./db";
import type { Role } from "@prisma/client";

const COOKIE = "sr_session";
const MAX_AGE = 60 * 60 * 24 * 14; // 14 days for professional accounts

function key() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "AUTH_SECRET is missing or shorter than 32 characters. Generate one with `openssl rand -base64 32`.",
    );
  }
  return new TextEncoder().encode(secret);
}

export type SessionPayload = { sub: string; role: Role; ver: number };

export async function createSession(userId: string, role: Role, tokenVersion = 0) {
  const maxAge = role === "USER" ? 60 * 60 * 24 * 30 : MAX_AGE;
  const token = await new SignJWT({ role, ver: tokenVersion })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${maxAge}s`)
    .sign(key());

  const cookieStore = await cookies();
  cookieStore.set(COOKIE, token, {
    httpOnly: true,
    // Lax rather than strict so a link from an email still lands signed in.
    // Server Actions are additionally protected by Next's Origin check.
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE);
}

/** Just the signed-in user's id from the cookie, with no database lookup. */
export async function sessionUserId(): Promise<string | null> {
  return (await readToken())?.sub ?? null;
}

async function readToken(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key());
    if (!payload.sub) return null;
    return { sub: payload.sub, role: payload.role as Role, ver: Number(payload.ver ?? 0) };
  } catch {
    return null;
  }
}

/** The signed-in user with their company memberships, or null. Cached per request. */
export const getCurrentUser = cache(async () => {
  const session = await readToken();
  if (!session) return null;
  const now = new Date();

  const user = await db.user.findUnique({
    where: { id: session.sub },
    include: {
      profile: true,
      staffOf: {
        include: {
          company: {
            include: {
              subscription: { include: { membership: true } },
              membershipGrants: {
                where: {
                  revokedAt: null,
                  startsAt: { lte: now },
                  membership: { audience: "PROVIDER", tier: { in: ["PROFESSIONAL", "BUSINESS"] } },
                  OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
                },
                include: { membership: true },
                orderBy: { createdAt: "desc" },
              },
            },
          },
        },
      },
      referrerSubscription: { include: { membership: true } },
    },
  });

  if (!user || user.status !== "ACTIVE" || user.deletedAt) return null;

  // A token issued before the last password change or "sign out everywhere" is
  // dead, even though it hasn't expired.
  if ((user.tokenVersion ?? 0) !== session.ver) return null;

  return user;
});

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

// ---------------------------------------------------------------------------
// Two-step login. A user with an authenticator app set up (required for
// admins) gets a short-lived "half signed in" cookie after their password,
// and only a real session once they enter the 6-digit code.

const PENDING_COOKIE = "sr_2fa";
const PENDING_MAX_AGE = 10 * 60;

type SignInUser = { id: string; role: Role; tokenVersion: number | null; totpEnabledAt: Date | null };

/**
 * Signs the user in, or, if they use two-step login, starts the code step.
 * Returns the path to send them to for the code, or null when signed in.
 */
export async function signInOrChallenge(user: SignInUser, next = ""): Promise<string | null> {
  if (!user.totpEnabledAt) {
    await createSession(user.id, user.role, user.tokenVersion ?? 0);
    return null;
  }
  const token = await new SignJWT({ purpose: "two-step", ver: user.tokenVersion ?? 0, next })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${PENDING_MAX_AGE}s`)
    .sign(key());
  const cookieStore = await cookies();
  cookieStore.set(PENDING_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: PENDING_MAX_AGE,
  });
  return "/login/two-step";
}

/** Who is half-way through signing in, from the code-step cookie. */
export async function pendingTwoStep(): Promise<{ userId: string; ver: number; next: string } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(PENDING_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key());
    if (payload.purpose !== "two-step" || !payload.sub) return null;
    return { userId: payload.sub, ver: Number(payload.ver ?? 0), next: typeof payload.next === "string" ? payload.next : "" };
  } catch {
    return null;
  }
}

export async function clearPendingTwoStep() {
  const cookieStore = await cookies();
  cookieStore.delete(PENDING_COOKIE);
}
