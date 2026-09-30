import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { sendSeekerWelcome } from "@/lib/welcome-email";
import { createSession } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") ?? "";
  if (!token || token.length > 256) return redirectResult(request, "invalid");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const record = await db.emailVerificationToken.findUnique({
    where: { tokenHash },
    select: { id: true, userId: true, expiresAt: true, usedAt: true },
  });
  if (!record) return redirectResult(request, "expired");
  if (record.usedAt || record.expiresAt <= new Date()) {
    // A second click (or an email app that opened the link first) shouldn't
    // look like an error when the address is in fact already confirmed.
    const owner = await db.user.findUnique({ where: { id: record.userId }, select: { emailVerified: true } });
    return redirectResult(request, owner?.emailVerified ? "already" : "expired");
  }

  const verifiedAt = new Date();
  const claimed = await db.$transaction(async (transaction) => {
    const consumed = await transaction.emailVerificationToken.updateMany({
      where: { id: record.id, usedAt: null, expiresAt: { gt: verifiedAt } },
      data: { usedAt: verifiedAt },
    });
    if (!consumed.count) return false;
    await transaction.user.update({ where: { id: record.userId }, data: { emailVerified: verifiedAt } });
    await transaction.emailVerificationToken.deleteMany({ where: { userId: record.userId, usedAt: null } });
    return true;
  });
  if (!claimed) return redirectResult(request, "expired");
  await audit({ actorId: record.userId, action: "auth.email_verified", targetType: "User", targetId: record.userId });
  // People looking for a room get the "welcome to RoomsNow" email now that
  // we know the address is theirs. Only sent once, and never blocks sign-in.
  await sendSeekerWelcome(record.userId);

  // Sign them straight in, so confirming their email takes them into
  // RoomsNow instead of back to a login form they may not expect.
  // Admin accounts still sign in with their password.
  const user = await db.user.findUnique({
    where: { id: record.userId },
    select: { id: true, role: true, status: true, deletedAt: true, tokenVersion: true },
  });
  if (user && user.status === "ACTIVE" && !user.deletedAt && user.role !== "ADMIN") {
    await createSession(user.id, user.role, user.tokenVersion);
    await db.user.update({ where: { id: user.id }, data: { lastLoginAt: verifiedAt } });
    await audit({ actorId: user.id, action: "auth.login", targetType: "User", targetId: user.id, metadata: { via: "email_verification" } });
    return redirectResult(request, "success", "&signedIn=1");
  }
  return redirectResult(request, "success");
}

function redirectResult(request: NextRequest, result: string, extra = "") {
  // Render sits behind a proxy, so request.url reflects the internal
  // container address (localhost) rather than the public domain. Build the
  // redirect from APP_URL, falling back to request.url only when APP_URL
  // genuinely isn't configured.
  const base = process.env.APP_URL || request.url;
  return NextResponse.redirect(new URL(`/verify-email?result=${result}${extra}`, base));
}
