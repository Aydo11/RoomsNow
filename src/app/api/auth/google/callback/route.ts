import { createRemoteJWKSet, jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createSession } from "@/lib/session";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";
const GOOGLE_KEYS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

export async function GET(request: NextRequest) {
  const appUrl = process.env.APP_URL?.replace(/\/$/, "");
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const state = request.nextUrl.searchParams.get("state");
  const code = request.nextUrl.searchParams.get("code");
  const expectedState = request.cookies.get("sr_oauth_state")?.value;
  const verifier = request.cookies.get("sr_oauth_verifier")?.value;
  const next = safeRedirect(request.cookies.get("sr_oauth_next")?.value ?? "", "");
  // Render sits behind a proxy, so request.url reflects the internal
  // container address (localhost) rather than the public domain. Build
  // failure redirects from APP_URL, falling back to request.url only when
  // APP_URL genuinely isn't configured.
  const base = process.env.APP_URL || request.url;
  const fail = () => clearOAuthCookies(NextResponse.redirect(new URL("/login?oauth=failed", base)));

  if (!appUrl || !clientId || !clientSecret || !state || !code || !expectedState || state !== expectedState || !verifier) return fail();

  try {
    const redirectUri = `${appUrl}/api/auth/google/callback`;
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: "authorization_code", code_verifier: verifier }),
      cache: "no-store",
    });
    if (!tokenResponse.ok) return fail();
    const tokens = await tokenResponse.json() as { id_token?: string };
    if (!tokens.id_token) return fail();

    const { payload } = await jwtVerify(tokens.id_token, GOOGLE_KEYS, {
      audience: clientId,
      issuer: ["https://accounts.google.com", "accounts.google.com"],
    });
    const email = typeof payload.email === "string" ? payload.email.toLowerCase() : "";
    if (!email || payload.email_verified !== true) return fail();

    const user = await db.user.findUnique({ where: { email } });
    if (!user) return clearOAuthCookies(NextResponse.redirect(new URL("/login?oauth=no-account", base)));
    if (user.deletedAt || user.status !== "ACTIVE") return fail();

    await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date(), emailVerified: user.emailVerified ?? new Date() } });
    await createSession(user.id, user.role, user.tokenVersion);
    await audit({ actorId: user.id, action: "auth.google_login", targetType: "User", targetId: user.id });
    const home = user.role === "ADMIN" ? "/admin" : user.role === "PROVIDER" ? "/provider" : user.role === "REFERRER" ? "/referrals" : user.role === "SERVICE_PROVIDER" ? "/service-provider" : "/dashboard";
    return clearOAuthCookies(NextResponse.redirect(new URL(next || home, appUrl)));
  } catch (error) {
    console.error("Google sign-in failed:", error);
    return fail();
  }
}

function clearOAuthCookies(response: NextResponse) {
  for (const name of ["sr_oauth_state", "sr_oauth_verifier", "sr_oauth_next"]) response.cookies.delete(name);
  return response;
}

function safeRedirect(target: string, fallback: string) {
  if (!target.startsWith("/") || target.startsWith("//") || target.startsWith("/\\")) return fallback;
  return target;
}
