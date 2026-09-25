"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireCompany } from "@/lib/rbac";
import { audit } from "@/lib/audit";

/** Turns the Monday summary email on or off for the whole company. */
export async function setWeeklySummaryAction(on: boolean) {
  const { user, companyId } = await requireCompany();
  await db.company.update({ where: { id: companyId }, data: { weeklySummary: Boolean(on) } });
  await audit({ actorId: user.id, action: "company.weekly_summary", targetType: "Company", targetId: companyId, metadata: { on: Boolean(on) } });
  revalidatePath("/provider/settings");
  return { ok: true };
}
