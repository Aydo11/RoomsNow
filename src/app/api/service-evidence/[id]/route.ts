import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { hasAdminPermission } from "@/lib/admin-permissions";
import { audit } from "@/lib/audit";
import { storage } from "@/lib/storage";
import { rateLimit } from "@/lib/rate-limit";

/**
 * Service business due-diligence documents (insurance, incorporation,
 * qualifications). Only admins with full permission can open an original —
 * not moderators, not the providers browsing the marketplace, and not other
 * businesses. Every successful read is written to the audit log.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user || !hasAdminPermission(user, "ALL")) return new NextResponse("Not found", { status: 404 });

  const limit = await rateLimit(`service-evidence:${user.id}`, { limit: 60, windowMs: 60_000 });
  if (!limit.ok) return new NextResponse("Too many requests", { status: 429 });

  const evidence = await db.serviceEvidence.findUnique({ where: { id } });
  if (!evidence) return new NextResponse("Not found", { status: 404 });

  await audit({ actorId: user.id, action: "service_evidence.viewed", targetType: "ServiceEvidence", targetId: evidence.id, metadata: { businessId: evidence.businessId } });

  try {
    const file = await storage.read(evidence.fileUrl);
    return new NextResponse(new Uint8Array(file), {
      headers: {
        "Content-Type": evidence.mimeType || "application/octet-stream",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
        "Content-Disposition": `${evidence.mimeType.startsWith("image/") || evidence.mimeType === "application/pdf" ? "inline" : "attachment"}; filename="${evidence.fileName.replace(/[^\w.\- ]/g, "_")}"`,
        "Cache-Control": "private, no-store",
        "Referrer-Policy": "no-referrer",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
