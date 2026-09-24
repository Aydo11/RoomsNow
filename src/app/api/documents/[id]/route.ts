import { NextResponse } from "next/server";
import { hasAdminPermission } from "@/lib/admin-permissions";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { audit } from "@/lib/audit";
import { storage } from "@/lib/storage";
import { rateLimit } from "@/lib/rate-limit";
import { inTeam } from "@/lib/referral-team";

/**
 * Private documents (referral attachments, verification evidence) are never linked
 * directly from storage. Every read goes through this authorisation check and is
 * written to the audit log.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Not found", { status: 404 });

  // Stops anyone with one valid session enumerating document ids.
  const limit = await rateLimit(`documents:${user.id}`, { limit: 60, windowMs: 60_000 });
  if (!limit.ok) return new NextResponse("Too many requests", { status: 429 });

  const document = await db.document.findUnique({
    where: { id },
    include: {
      referral: { select: { referrerId: true, listing: { select: { companyId: true } } } },
      request: { select: { applicantId: true, listing: { select: { companyId: true } } } },
      verificationRequest: { select: { companyId: true } },
      accreditation: { select: { companyId: true } },
    },
  });
  if (!document) return new NextResponse("Not found", { status: 404 });

  const companyIds = new Set(user.staffOf.map((s) => s.companyId));
  const allowed =
    hasAdminPermission(user) ||
    document.ownerId === user.id ||
    (document.companyId && companyIds.has(document.companyId)) ||
    (await inTeam(user.id, document.referral?.referrerId)) ||
    (document.referral?.listing && companyIds.has(document.referral.listing.companyId)) ||
    document.request?.applicantId === user.id ||
    (document.request?.listing && companyIds.has(document.request.listing.companyId)) ||
    (document.verificationRequest && companyIds.has(document.verificationRequest.companyId)) ||
    (document.accreditation && companyIds.has(document.accreditation.companyId));

  if (!allowed) return new NextResponse("Not found", { status: 404 });

  await audit({
    actorId: user.id,
    action: "document.viewed",
    targetType: "Document",
    targetId: document.id,
  });

  // Private files live outside the web root, so the only way to read one is
  // through this handler, after the checks above.
  try {
    const file = await storage.read(document.url);
    return new NextResponse(new Uint8Array(file), {
      headers: {
        "Content-Type": document.mimeType || "application/octet-stream",
        // Never let a stored file be interpreted as something else, and never
        // let it run in our origin.
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
        "Content-Disposition": `${
          document.mimeType?.startsWith("image/") || document.mimeType === "application/pdf"
            ? "inline"
            : "attachment"
        }; filename="${document.name.replace(/[^\w.\- ]/g, "_")}"`,
        "Cache-Control": "private, no-store",
        "Referrer-Policy": "no-referrer",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
