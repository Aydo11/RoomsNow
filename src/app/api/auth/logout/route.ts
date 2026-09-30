import { destroySession, sessionUserId } from "@/lib/session";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/**
 * Sign out. A plain form POST that clears the cookie and sends the browser
 * home with a normal page load. Doing it as a Server Action made the action
 * wait for the whole homepage to render in the same response, which could
 * leave people staring at a spinner.
 */
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (origin && host && new URL(origin).host !== host) {
    return new Response("Bad origin", { status: 403 });
  }

  const userId = await sessionUserId();
  await destroySession();
  // Logging must never hold up signing out.
  if (userId) void audit({ actorId: userId, action: "auth.logout" }).catch(() => {});

  return new Response(null, { status: 303, headers: { Location: "/", "Cache-Control": "no-store" } });
}
