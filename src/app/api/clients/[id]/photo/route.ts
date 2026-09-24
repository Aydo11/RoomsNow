import { NextResponse } from "next/server";
import { hasAdminPermission } from "@/lib/admin-permissions";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { storage } from "@/lib/storage";
import { rateLimit } from "@/lib/rate-limit";
import { inTeam } from "@/lib/referral-team";

/**
 * Client profile pictures are private files. The same rule as the record
 * itself decides who may see one: the referrer who owns it, staff at a
 * provider it is actively shared with, and admins. Anyone else gets a 404,
 * so the route can't be used to confirm a client exists.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Not found", { status: 404 });

  const limit = await rateLimit(`client-photo:${user.id}`, { limit: 240, windowMs: 60_000 });
  if (!limit.ok) return new NextResponse("Too many requests", { status: 429 });

  const client = await db.client.findUnique({
    where: { id },
    select: {
      referrerId: true,
      photoUrl: true,
      deletedAt: true,
      shares: { where: { revokedAt: null }, select: { companyId: true } },
    },
  });
  if (!client?.photoUrl) return new NextResponse("Not found", { status: 404 });

  const companyIds = new Set(user.staffOf.map((s) => s.companyId));
  const isOwner = await inTeam(user.id, client.referrerId);
  const isSharedWith = !client.deletedAt && client.shares.some((share) => companyIds.has(share.companyId));
  if (!isOwner && !isSharedWith && !hasAdminPermission(user)) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const file = await storage.read(client.photoUrl);
    // Uploads are signature-checked on the way in, so sniffing the same magic
    // bytes here is reliable — and doesn't depend on the original filename.
    const type =
      file[0] === 0x89 && file[1] === 0x50
        ? "image/png"
        : file.subarray(8, 12).toString("ascii") === "WEBP"
          ? "image/webp"
          : file.subarray(4, 8).toString("ascii") === "ftyp"
            ? "image/avif"
            : "image/jpeg";
    return new NextResponse(new Uint8Array(file), {
      headers: {
        "Content-Type": type,
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
        "Cache-Control": "private, max-age=300",
        "Referrer-Policy": "no-referrer",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
