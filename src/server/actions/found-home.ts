"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { notifyCompany } from "@/lib/notify";
import { checkFirstMoveIn } from "@/lib/milestones";
import type { RequestStatus } from "@prisma/client";

/** Requests still in play: anything not already moved in, declined or withdrawn. */
const OPEN: RequestStatus[] = ["SUBMITTED", "RECEIVED", "UNDER_REVIEW", "ASSESSMENT", "OFFERED", "ACCEPTED"];

/** Withdraws the applicant's other open requests and lets each provider know, once per company. */
async function withdrawOthers(applicantId: string, exceptId: string | null) {
  const others = await db.accommodationRequest.findMany({
    where: { applicantId, status: { in: OPEN }, ...(exceptId ? { id: { not: exceptId } } : {}) },
    select: { id: true, listing: { select: { companyId: true } } },
  });
  if (!others.length) return 0;
  await db.accommodationRequest.updateMany({
    where: { id: { in: others.map((r) => r.id) } },
    data: { status: "WITHDRAWN", statusNote: "The applicant has found somewhere to live." },
  });
  for (const companyId of new Set(others.map((r) => r.listing.companyId))) {
    await notifyCompany(companyId, {
      type: "REQUEST",
      title: "An applicant has found somewhere to live",
      body: "They've withdrawn their request with you, so you don't need to reply to it.",
      href: "/provider/requests?view=closed",
    }).catch((error) => console.error("[found-home] notify failed", error));
  }
  return others.length;
}

function refresh() {
  revalidatePath("/dashboard/requests");
  revalidatePath("/provider/requests");
  revalidatePath("/admin");
}

/** The applicant confirms they moved into the advert they requested. */
export async function confirmMoveInAction(requestId: string) {
  const user = await requireUser();
  const request = await db.accommodationRequest.findFirst({
    where: { id: requestId, applicantId: user.id, status: { in: OPEN } },
    select: { id: true, listing: { select: { companyId: true, title: true } } },
  });
  if (!request) return;
  const now = new Date();
  await db.accommodationRequest.update({
    where: { id: request.id },
    data: { status: "MOVED_IN", tenantConfirmedAt: now, statusNote: "Move-in confirmed by the tenant." },
  });
  const withdrawn = await withdrawOthers(user.id, request.id);
  await db.user.update({ where: { id: user.id }, data: { foundHomeAt: now, foundHomeElsewhere: false } });
  await notifyCompany(request.listing.companyId, {
    type: "REQUEST",
    title: `${user.firstName} says they've moved in`,
    body: `${user.firstName} confirmed they moved into "${request.listing.title}". If that's not right, update the request status.`,
    href: `/provider/requests?request=${encodeURIComponent(request.id)}`,
    email: true,
  });
  await checkFirstMoveIn(request.listing.companyId, `/provider/requests?request=${encodeURIComponent(request.id)}`);
  await audit({ actorId: user.id, action: "request.tenant_confirmed_move_in", targetType: "AccommodationRequest", targetId: request.id, metadata: { withdrawn } });
  refresh();
}

/** The applicant found somewhere that wasn't through RoomsNow. */
export async function foundElsewhereAction() {
  const user = await requireUser();
  const withdrawn = await withdrawOthers(user.id, null);
  await db.user.update({ where: { id: user.id }, data: { foundHomeAt: new Date(), foundHomeElsewhere: true } });
  await audit({ actorId: user.id, action: "user.found_home_elsewhere", targetType: "User", targetId: user.id, metadata: { withdrawn } });
  refresh();
}

/** Undo: the applicant is looking again. Withdrawn requests stay withdrawn. */
export async function lookingAgainAction() {
  const user = await requireUser();
  await db.user.update({ where: { id: user.id }, data: { foundHomeAt: null, foundHomeElsewhere: false } });
  await audit({ actorId: user.id, action: "user.looking_again", targetType: "User", targetId: user.id });
  refresh();
}
