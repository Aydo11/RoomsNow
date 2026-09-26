import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { hasAdminPermission } from "@/lib/admin-permissions";
import { audit } from "@/lib/audit";
import { storage } from "@/lib/storage";
import { rateLimit } from "@/lib/rate-limit";

type Attachment = { url: string; name: string; type: string };

/** Photos and documents attached to a quote request: the two businesses involved, and full admins. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string; index: string }> }) {
  const { id, index } = await params;
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Not found", { status: 404 });
  const limit = await rateLimit(`service-quote-files:${user.id}`, { limit: 60, windowMs: 60_000 });
  if (!limit.ok) return new NextResponse("Too many requests", { status: 429 });

  const quote = await db.serviceQuoteRequest.findUnique({ where: { id }, select: { id: true, companyId: true, attachments: true, business: { select: { ownerId: true } } } });
  if (!quote) return new NextResponse("Not found", { status: 404 });
  const allowed = quote.business.ownerId === user.id || user.staffOf.some((staff) => staff.companyId === quote.companyId) || hasAdminPermission(user, "ALL");
  if (!allowed) return new NextResponse("Not found", { status: 404 });

  const files = (Array.isArray(quote.attachments) ? quote.attachments : []) as Attachment[];
  const file = files[Number(index)];
  if (!file || !file.url?.startsWith("private:")) return new NextResponse("Not found", { status: 404 });

  await audit({ actorId: user.id, action: "service_quote.file_viewed", targetType: "ServiceQuoteRequest", targetId: quote.id, metadata: { index: Number(index) } });
  try {
    const content = await storage.read(file.url);
    return new NextResponse(new Uint8Array(content), {
      headers: {
        "Content-Type": file.type || "application/octet-stream",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
        "Content-Disposition": `${file.type.startsWith("image/") || file.type === "application/pdf" ? "inline" : "attachment"}; filename="${file.name.replace(/[^\w.\- ]/g, "_")}"`,
        "Cache-Control": "private, no-store",
        "Referrer-Policy": "no-referrer",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
