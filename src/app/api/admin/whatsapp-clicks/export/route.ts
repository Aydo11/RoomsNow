import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { csvResponse } from "@/lib/csv";
import { whatsappLogRows, whatsappLogWhere } from "@/lib/whatsapp-clicks";

export const dynamic = "force-dynamic";

/** CSV of the WhatsApp enquiry log, using the same filters as /admin/whatsapp-clicks. */
export async function GET(request: Request) {
  const admin = await requireAdmin();
  const params = new URL(request.url).searchParams;
  const filters = {
    provider: params.get("provider") ?? undefined,
    from: params.get("from") ?? undefined,
    to: params.get("to") ?? undefined,
    who: params.get("who") ?? undefined,
  };
  const clicks = await db.whatsappClick.findMany({ where: await whatsappLogWhere(filters), orderBy: { createdAt: "desc" }, take: 20000 });
  const rows = await whatsappLogRows(clicks);
  const london = new Intl.DateTimeFormat("en-GB", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/London" });
  await audit({ actorId: admin.id, action: "admin.whatsapp_log_exported", targetType: "WhatsappClick", targetId: "export", metadata: { ...filters, rows: rows.length } });
  return csvResponse(
    `roomsnow-whatsapp-enquiries-${new Date().toISOString().slice(0, 10)}.csv`,
    ["Date and time (UK)", "Advert", "Advert link", "Provider", "Person", "Email", "Phone", "Signed in"],
    rows.map((row) => [
      london.format(row.createdAt),
      row.advert,
      `https://www.roomsnow.co.uk/listings/${row.listingId}`,
      row.provider,
      row.personName ?? (row.signedIn ? "Deleted account" : "Not signed in"),
      row.personEmail,
      row.personPhone,
      row.signedIn ? "Yes" : "No",
    ]),
  );
}
