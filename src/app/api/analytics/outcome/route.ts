import { NextRequest, NextResponse } from "next/server";
import { ANALYTICS_CHOICE_COOKIE, OUTCOME_COOKIE, outcomeDocument, readOutcomes } from "@/lib/conversion-outcomes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const headers = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer", "X-Frame-Options": "SAMEORIGIN", "X-Robots-Tag": "noindex, nofollow" };
  const secret = process.env.AUTH_SECRET;
  const consent = request.cookies.get(ANALYTICS_CHOICE_COOKIE)?.value === "accepted";
  const sameOriginFrame = request.headers.get("sec-fetch-site") === "same-origin" && request.headers.get("sec-fetch-dest") === "iframe";
  const events = consent && sameOriginFrame && secret && secret.length >= 32
    ? await readOutcomes(request.cookies.get(OUTCOME_COOKIE)?.value, secret) : [];
  // No page content, user/account identifiers, enquiry text or destinations in this document.
  const origin = new URL(process.env.APP_URL || request.url).origin;
  const response = events.length
    ? new NextResponse(outcomeDocument(events, origin), { headers: { ...headers,
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy": "default-src 'none'; script-src 'self' https://www.googletagmanager.com; connect-src https://*.google-analytics.com https://*.analytics.google.com; img-src https://*.google-analytics.com; frame-ancestors 'self'; base-uri 'none'",
    } })
    : new NextResponse(null, { status: 204, headers });
  if (sameOriginFrame) response.cookies.set(OUTCOME_COOKIE, "", { path: "/", maxAge: 0, httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" });
  return response;
}
