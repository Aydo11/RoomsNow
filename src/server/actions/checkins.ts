"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/rbac";
import { inTeam } from "@/lib/referral-team";
import { alertOtherSide, HEALTH_LABELS } from "@/lib/placement-checkins";
import { audit } from "@/lib/audit";

export type CheckInState = { ok: boolean; message?: string };

/** Saves (or updates) this side's 4- or 12-week answer for a placement. */
export async function submitCheckInAction(_prev: CheckInState, formData: FormData): Promise<CheckInState> {
  const user = await requireUser();
  const referralId = String(formData.get("referralId") ?? "");
  const week = Number(formData.get("week"));
  const health = String(formData.get("health") ?? "");
  const note = String(formData.get("note") ?? "").trim().slice(0, 1000) || null;
  if (week !== 4 && week !== 12) return { ok: false, message: "Choose which check-in this is." };
  if (!(health in HEALTH_LABELS)) return { ok: false, message: "Choose how the placement is going." };

  const referral = await db.referral.findUnique({
    where: { id: referralId },
    select: { id: true, reference: true, status: true, referrerId: true, applicantFirstName: true, listing: { select: { companyId: true } } },
  });
  if (!referral) return { ok: false, message: "Referral not found." };
  const isReferrer = await inTeam(user.id, referral.referrerId);
  const isProvider = referral.listing ? user.staffOf.some((staff) => staff.companyId === referral.listing!.companyId) : false;
  if (!isReferrer && !isProvider) return { ok: false, message: "Only the referrer or the provider can answer this check-in." };
  if (referral.status !== "MOVED_IN") return { ok: false, message: "Check-ins are for placements that have moved in." };

  const side = isReferrer ? "REFERRER" : "PROVIDER";
  const previous = await db.placementCheckIn.findUnique({ where: { referralId_week_side: { referralId, week, side } }, select: { health: true } });
  await db.placementCheckIn.upsert({
    where: { referralId_week_side: { referralId, week, side } },
    create: { referralId, week, side, userId: user.id, health: health as keyof typeof HEALTH_LABELS, note },
    update: { userId: user.id, health: health as keyof typeof HEALTH_LABELS, note },
  });
  if (previous?.health !== health) await alertOtherSide(referral, side, health as keyof typeof HEALTH_LABELS);
  await audit({ actorId: user.id, action: "placement.checkin", targetType: "Referral", targetId: referralId, metadata: { week, side, health } });

  revalidatePath(`/checkins/${referralId}`);
  return { ok: true, message: health === "AT_RISK" || health === "ENDED" ? "Saved. We've let the other side know so you can agree next steps." : "Saved. Thank you." };
}
