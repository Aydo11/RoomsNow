"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireReferrer } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { notifyCompany } from "@/lib/notify";
import { referrerPlanLimits } from "@/lib/billing";
import { clientSchema, clientShareSchema, fieldErrors, type FormState } from "@/lib/validation";
import { date, list, text } from "../form";

/**
 * Clients are a referrer's own caseload — people they're supporting, most of
 * whom never create a platform account. Nothing here is visible to a provider
 * until the referrer explicitly shares it (see shareClientAction below).
 */
export async function saveClientAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireReferrer();
  const id = text(formData, "id") || null;

  const parsed = clientSchema.safeParse({
    firstName: text(formData, "firstName"),
    lastName: text(formData, "lastName"),
    dateOfBirth: text(formData, "dateOfBirth"),
    phone: text(formData, "phone"),
    email: text(formData, "email"),
    preferredLocation: text(formData, "preferredLocation"),
    accommodationNeeds: text(formData, "accommodationNeeds"),
    supportNeeds: text(formData, "supportNeeds"),
    supportTypes: list(formData, "supportTypes"),
    riskNotes: text(formData, "riskNotes"),
    status: text(formData, "status") || "ACTIVE",
  });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const d = parsed.data;

  if (id) {
    // Editing: ownership check first, no upsert-by-accident.
    const existing = await db.client.findUnique({ where: { id }, select: { referrerId: true } });
    if (!existing || existing.referrerId !== user.id) {
      return { ok: false, errors: { form: "Client not found." } };
    }
  } else {
    const limits = await referrerPlanLimits(user.id);
    if (!limits.canAddClient) {
      return {
        ok: false,
        errors: {
          form: `Your ${limits.membership.name} plan holds up to ${limits.membership.maxClients} active clients. Archive one or upgrade to add another.`,
        },
      };
    }
  }

  const values = {
    firstName: d.firstName,
    lastName: d.lastName,
    dateOfBirth: date(d.dateOfBirth),
    phone: d.phone || null,
    email: d.email || null,
    preferredLocation: d.preferredLocation || null,
    accommodationNeeds: d.accommodationNeeds || null,
    supportNeeds: d.supportNeeds || null,
    supportTypes: d.supportTypes,
    riskNotes: d.riskNotes || null,
    status: d.status,
  };

  const client = id
    ? await db.client.update({ where: { id }, data: values })
    : await db.client.create({ data: { referrerId: user.id, ...values } });

  await audit({
    actorId: user.id,
    action: id ? "client.updated" : "client.created",
    targetType: "Client",
    targetId: client.id,
  });

  revalidatePath("/referrals/clients");
  revalidatePath(`/referrals/clients/${client.id}`);
  if (!id) redirect(`/referrals/clients/${client.id}`);
  return { ok: true, message: "Saved." };
}

export async function archiveClientAction(clientId: string, status: "ACTIVE" | "PLACED" | "ARCHIVED") {
  const user = await requireReferrer();
  const client = await db.client.findUnique({ where: { id: clientId }, select: { referrerId: true } });
  if (!client || client.referrerId !== user.id) return;

  await db.client.update({ where: { id: clientId }, data: { status } });
  await audit({ actorId: user.id, action: `client.${status.toLowerCase()}`, targetType: "Client", targetId: clientId });
  revalidatePath("/referrals/clients");
  revalidatePath(`/referrals/clients/${clientId}`);
}

/**
 * Hard delete. Referrals already made from this client keep their own copy of
 * the applicant's details (Referral has its own applicant fields), so deleting
 * the client record doesn't touch referral history — the foreign key is
 * SetNull, not Cascade.
 */
export async function deleteClientAction(clientId: string) {
  const user = await requireReferrer();
  const client = await db.client.findUnique({ where: { id: clientId }, select: { referrerId: true } });
  if (!client || client.referrerId !== user.id) return;

  await db.client.delete({ where: { id: clientId } });
  await audit({ actorId: user.id, action: "client.deleted", targetType: "Client", targetId: clientId });
  revalidatePath("/referrals/clients");
  redirect("/referrals/clients");
}

/**
 * "Send profile" — gives one provider organisation standing read access to a
 * client record, and drops a message into their inbox so it isn't a silent
 * grant. This is deliberately lighter-weight than a Referral: it's "here is
 * who I'm looking to place", not an application against a specific advert.
 */
export async function shareClientAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireReferrer();

  const parsed = clientShareSchema.safeParse({
    clientId: text(formData, "clientId"),
    companyId: text(formData, "companyId"),
    note: text(formData, "note"),
  });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const d = parsed.data;

  const client = await db.client.findUnique({ where: { id: d.clientId }, select: { referrerId: true, firstName: true, lastName: true } });
  if (!client || client.referrerId !== user.id) return { ok: false, errors: { form: "Client not found." } };

  const company = await db.company.findUnique({ where: { id: d.companyId }, select: { id: true, name: true, status: true } });
  if (!company || company.status !== "ACTIVE") return { ok: false, errors: { form: "That provider could not be found." } };

  const limits = await referrerPlanLimits(user.id);
  if (limits.membership.maxSharesPerClient !== -1) {
    const activeShares = await db.clientShare.count({ where: { clientId: d.clientId, revokedAt: null } });
    const alreadyShared = await db.clientShare.findUnique({
      where: { clientId_companyId: { clientId: d.clientId, companyId: d.companyId } },
    });
    if (!alreadyShared && activeShares >= limits.membership.maxSharesPerClient) {
      return {
        ok: false,
        errors: {
          form: `Your ${limits.membership.name} plan shares a profile with up to ${limits.membership.maxSharesPerClient} provider${limits.membership.maxSharesPerClient === 1 ? "" : "s"} at once. Revoke one first, or upgrade.`,
        },
      };
    }
  }

  const share = await db.clientShare.upsert({
    where: { clientId_companyId: { clientId: d.clientId, companyId: d.companyId } },
    create: { clientId: d.clientId, companyId: d.companyId, sharedById: user.id, note: d.note || null },
    update: { revokedAt: null, note: d.note || null, sharedById: user.id },
  });

  await notifyCompany(d.companyId, {
    type: "REFERRAL",
    title: "A referrer shared a client profile with you",
    body: `${user.firstName} ${user.lastName} shared ${client.firstName} ${client.lastName}'s profile.`,
    href: `/provider/clients/${d.clientId}`,
    email: true,
  });

  await audit({
    actorId: user.id,
    action: "client.shared",
    targetType: "Client",
    targetId: d.clientId,
    metadata: { companyId: d.companyId },
  });

  revalidatePath(`/referrals/clients/${d.clientId}`);
  return { ok: true, message: `Shared with ${company.name}.` };
}

export async function revokeClientShareAction(shareId: string) {
  const user = await requireReferrer();
  const share = await db.clientShare.findUnique({
    where: { id: shareId },
    include: { client: { select: { referrerId: true, id: true } } },
  });
  if (!share || share.client.referrerId !== user.id) return;

  await db.clientShare.update({ where: { id: shareId }, data: { revokedAt: new Date() } });
  await audit({ actorId: user.id, action: "client.share_revoked", targetType: "ClientShare", targetId: shareId });
  revalidatePath(`/referrals/clients/${share.client.id}`);
}

/**
 * Permanent removal of a share record — distinct from revoke, which cuts the
 * provider's access but keeps a timestamped row for the client's history.
 * Delete is for a mistaken share or tidying old history away entirely; the
 * provider is not notified either way since access was already revoked (or
 * never confirmed) by the time this runs.
 */
export async function deleteClientShareAction(shareId: string) {
  const user = await requireReferrer();
  const share = await db.clientShare.findUnique({
    where: { id: shareId },
    include: { client: { select: { referrerId: true, id: true } } },
  });
  if (!share || share.client.referrerId !== user.id) return;

  await db.clientShare.delete({ where: { id: shareId } });
  await audit({ actorId: user.id, action: "client.share_deleted", targetType: "ClientShare", targetId: shareId });
  revalidatePath(`/referrals/clients/${share.client.id}`);
}


/** Lightweight provider search for the "share with a provider" picker. */
export async function searchCompaniesAction(query: string) {
  await requireReferrer();
  const q = query.trim();
  if (q.length < 2) return [];
  return db.company.findMany({
    where: { status: "ACTIVE", name: { contains: q, mode: "insensitive" } },
    select: { id: true, name: true, city: true, verification: true },
    orderBy: { name: "asc" },
    take: 8,
  });
}
