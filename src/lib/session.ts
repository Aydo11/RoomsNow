import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { cache } from "react";
import { db } from "./db";
import type { Role } from "@prisma/client";

const COOKIE = "sr_session";
const MAX_AGE = 60 * 60 * 24 * 14; // 14 days

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
  const token = await new SignJWT({ role, ver: tokenVersion })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(key());

  const cookieStore = await cookies();
  cookieStore.set(COOKIE, token, {
    httpOnly: true,
    // Lax rather than strict so a link from an email still lands signed in.
    // Server Actions are additionally protected by Next's Origin check.
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE);
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
