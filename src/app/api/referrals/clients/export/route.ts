import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { audit } from "@/lib/audit";
import { csvResponse } from "@/lib/csv";
import { supportLabel } from "@/lib/taxonomy";
import { teamMemberIds } from "@/lib/referral-team";

export const dynamic = "force-dynamic";

/**
 * A referrer's own caseload as a spreadsheet — the same columns the upload
 * accepts, so an export can be edited and uploaded again. Private notes are
 * included because this is the referrer's own data; deleted clients are not.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "REFERRER") return new NextResponse("Not found", { status: 404 });
  const teamIds = await teamMemberIds(user.id);

  const clients = await db.client.findMany({
    where: { referrerId: { in: teamIds }, deletedAt: null },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    include: {
      _count: { select: { referrals: true } },
      shares: { where: { revokedAt: null }, select: { company: { select: { name: true } } } },
    },
  });

  await audit({ actorId: user.id, action: "client.exported", targetType: "Client", metadata: { count: clients.length } });

  const day = new Date().toISOString().slice(0, 10);
  return csvResponse(
    `roomsnow-clients-${day}.csv`,
    [
      "First name",
      "Last name",
      "Date of birth",
      "Phone",
      "Email",
      "Preferred area",
      "Support types",
      "Accommodation needs",
      "Support needs",
      "Status",
      "Private notes",
      "Referrals made",
      "Shared with",
      "Date added",
      "Last updated",
    ],
    clients.map((c) => [
      c.firstName,
      c.lastName,
      c.dateOfBirth ? c.dateOfBirth.toISOString().slice(0, 10).split("-").reverse().join("/") : "",
      c.phone,
      c.email,
      c.preferredLocation,
      c.supportTypes.map(supportLabel).join("; "),
      c.accommodationNeeds,
      c.supportNeeds,
      c.status.charAt(0) + c.status.slice(1).toLowerCase(),
      c.riskNotes,
      c._count.referrals,
      c.shares.map((s) => s.company.name).join("; "),
      c.createdAt.toISOString().slice(0, 10),
      c.updatedAt.toISOString().slice(0, 10),
    ]),
  );
}
