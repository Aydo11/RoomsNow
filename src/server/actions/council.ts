"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { parseAreas } from "@/lib/council-areas";
import { notify } from "@/lib/notify";

export type CouncilAccessState = { ok: boolean; message?: string };

/** Gives one user the read-only council view for a set of areas. */
export async function grantCouncilAccessAction(_prev: CouncilAccessState, formData: FormData): Promise<CouncilAccessState> {
  const admin = await requireAdmin();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const councilName = String(formData.get("councilName") ?? "").trim().slice(0, 120);
  const areas = parseAreas(String(formData.get("areas") ?? ""));
  if (!email || !councilName || !areas.length) return { ok: false, message: "Enter the person's email, the council name and at least one area." };

  const user = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) return { ok: false, message: "No RoomsNow account uses that email. Ask them to sign up first (a referrer account works best)." };

  await db.councilAccess.upsert({
    where: { userId: user.id },
    create: { userId: user.id, councilName, areas, grantedById: admin.id },
    update: { councilName, areas, grantedById: admin.id },
  });
  await notify({
    userId: user.id,
    type: "SYSTEM",
    title: `You now have the ${councilName} council view`,
    body: "See live vacancies, placement times and how placements are going across your areas.",
    href: "/council",
    email: true,
  });
  await audit({ actorId: admin.id, action: "council_access.granted", targetType: "User", targetId: user.id, metadata: { councilName, areas } });
  revalidatePath("/admin/council-access");
  return { ok: true, message: `Council view granted to ${email}.` };
}

export async function revokeCouncilAccessAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const access = await db.councilAccess.findUnique({ where: { id } });
  if (!access) return;
  await db.councilAccess.delete({ where: { id } });
  await audit({ actorId: admin.id, action: "council_access.revoked", targetType: "User", targetId: access.userId });
  revalidatePath("/admin/council-access");
}
