import { authHref, safeRedirect } from "@/lib/auth-navigation";
import { createHash, randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { callerIp, LIMITS, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  // Render sits behind a proxy, so request.url reflects the internal
  // container address (localhost) rather than the public domain. Every
  // redirect here must be built from APP_URL, falling back to request.url
  // only when APP_URL genuinely isn't configured.
  const base = process.env.APP_URL || request.url;

  const limited = await rateLimit(`oauth:${await callerIp()}`, LIMITS.oauth);
  if (!limited.ok) return NextResponse.redirect(new URL(authHref("/login?oauth=failed", request.nextUrl.searchParams.get("next")), base));

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const appUrl = process.env.APP_URL;
  if (!clientId || !process.env.GOOGLE_CLIENT_SECRET || !appUrl) {
    return NextResponse.redirect(new URL(authHref("/login?oauth=failed", request.nextUrl.searchParams.get("next")), base));
  }

  const state = randomBytes(24).toString("base64url");
  const verifier = randomBytes(48).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const next = safeRedirect(request.nextUrl.searchParams.get("next") ?? "", "");
  const redirectUri = `${appUrl.replace(/\/$/, "")}/api/auth/google/callback`;
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
    prompt: "select_account",
  }).toString();

  const response = NextResponse.redirect(url);
  const options = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, maxAge: 600, path: "/api/auth/google" };
  response.cookies.set("sr_oauth_state", state, options);
  response.cookies.set("sr_oauth_verifier", verifier, options);
  response.cookies.set("sr_oauth_next", next, options);
  return response;
}
