"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireCompany, requireReferrer } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { referrerPlanLimits } from "@/lib/billing";
import { storage, validateUpload, verifyFileContents } from "@/lib/storage";
import { clientCardFrom } from "@/lib/client-card";
import { messageCompanyAsReferrer, ownedLiveClient, shareClientWithCompany } from "@/lib/client-sharing";
import { headerKey, parseCsv, parseUkDate } from "@/lib/csv-import";
import { SUPPORT_TYPES } from "@/lib/taxonomy";
import { clientSchema, clientShareSchema, fieldErrors, type FormState } from "@/lib/validation";
import { bool, date, list, text } from "../form";
import { Prisma } from "@prisma/client";
import { assessmentFromForm } from "@/lib/assessment";

type ClientStatusValue = "ACTIVE" | "PLACED" | "ARCHIVED";

function revalidateClient(clientId?: string) {
  revalidatePath("/referrals/clients");
  revalidatePath("/referrals/analytics");
  if (clientId) revalidatePath(`/referrals/clients/${clientId}`);
}

/** Stores an uploaded client photo privately, or returns a field error. */
async function storeClientPhoto(file: File, referrerId: string): Promise<{ url: string } | { error: string }> {
  const invalid = validateUpload(file, "image");
  if (invalid) return { error: invalid };
  const mismatch = await verifyFileContents(file, Buffer.from(await file.arrayBuffer()));
  if (mismatch) return { error: mismatch };
  const stored = await storage.put(file, `clients/${referrerId}`, "private");
  return { url: stored.url };
}

async function removeStoredPhoto(url: string | null | undefined) {
  if (!url) return;
  try {
    await storage.remove(url, "private");
  } catch {
    // Best effort: a missing object is already the outcome we want.
  }
}

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

  let existingPhoto: string | null = null;
  if (id) {
    // Editing: ownership check first, no upsert-by-accident.
    const existing = await db.client.findUnique({ where: { id }, select: { referrerId: true, photoUrl: true, deletedAt: true } });
    if (!existing || existing.referrerId !== user.id || existing.deletedAt) {
      return { ok: false, errors: { form: "Client not found." } };
    }
    existingPhoto = existing.photoUrl;
  } else {
    const limits = await referrerPlanLimits(user.id);
    if (!limits.canAddClient && d.status !== "ARCHIVED") {
      return {
        ok: false,
        errors: {
          form: `Your ${limits.membership.name} plan holds up to ${limits.membership.maxClients} active clients. Archive one or upgrade to add another.`,
        },
      };
    }
  }

  let photoUrl: string | null | undefined;
  const photo = formData.get("photo");
  if (photo instanceof File && photo.size > 0) {
    const stored = await storeClientPhoto(photo, user.id);
    if ("error" in stored) return { ok: false, errors: { photo: stored.error, form: stored.error } };
    photoUrl = stored.url;
  } else if (bool(formData, "removePhoto")) {
    photoUrl = null;
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
    ...(photoUrl !== undefined ? { photoUrl } : {}),
  };

  const client = id
    ? await db.client.update({ where: { id }, data: values })
    : await db.client.create({ data: { referrerId: user.id, ...values } });

  if (photoUrl !== undefined && existingPhoto && existingPhoto !== photoUrl) await removeStoredPhoto(existingPhoto);

  await audit({
    actorId: user.id,
    action: id ? "client.updated" : "client.created",
    targetType: "Client",
    targetId: client.id,
  });

  revalidateClient(client.id);
  if (!id) redirect(`/referrals/clients/${client.id}`);
  return { ok: true, message: "Saved." };
}

export async function archiveClientAction(clientId: string, status: ClientStatusValue) {
  const user = await requireReferrer();
  const client = await db.client.findUnique({ where: { id: clientId }, select: { referrerId: true, status: true, deletedAt: true } });
  if (!client || client.referrerId !== user.id || client.deletedAt) return { ok: false, message: "Client not found." };

  // Re-activating an archived client takes a plan slot back up.
  if (client.status === "ARCHIVED" && status !== "ARCHIVED") {
    const limits = await referrerPlanLimits(user.id);
    if (!limits.canAddClient) {
      return { ok: false, message: `Your ${limits.membership.name} plan is full. Archive someone else first, or upgrade.` };
    }
  }

  await db.client.update({ where: { id: clientId }, data: { status } });
  await audit({ actorId: user.id, action: `client.${status.toLowerCase()}`, targetType: "Client", targetId: clientId });
  revalidateClient(clientId);
  return { ok: true, message: "Updated." };
}

/**
 * Moves a client to the Deleted bin. It stops counting towards the plan and
 * every active share is revoked at once, so providers lose access the moment
 * a referrer decides to remove someone — restoring does not re-share.
 * Referrals already sent keep their own copy of the applicant's details.
 */
export async function deleteClientAction(clientId: string) {
  const user = await requireReferrer();
  const client = await db.client.findUnique({ where: { id: clientId }, select: { referrerId: true } });
  if (!client || client.referrerId !== user.id) return;

  const now = new Date();
  await db.$transaction([
    db.client.update({ where: { id: clientId }, data: { deletedAt: now } }),
    db.clientShare.updateMany({ where: { clientId, revokedAt: null }, data: { revokedAt: now } }),
  ]);
  await audit({ actorId: user.id, action: "client.deleted", targetType: "Client", targetId: clientId });
  revalidateClient(clientId);
  redirect("/referrals/clients?status=DELETED");
}

export async function restoreClientAction(clientId: string) {
  const user = await requireReferrer();
  const client = await db.client.findUnique({ where: { id: clientId }, select: { referrerId: true, status: true, deletedAt: true } });
  if (!client || client.referrerId !== user.id || !client.deletedAt) return { ok: false, message: "Client not found." };

  let status = client.status;
  let message = "Restored.";
  if (status !== "ARCHIVED") {
    const limits = await referrerPlanLimits(user.id);
    if (!limits.canAddClient) {
      status = "ARCHIVED";
      message = "Restored to Archived — your plan's active-client limit is full.";
    }
  }
  await db.client.update({ where: { id: clientId }, data: { deletedAt: null, status } });
  await audit({ actorId: user.id, action: "client.restored", targetType: "Client", targetId: clientId });
  revalidateClient(clientId);
  return { ok: true, message };
}

/**
 * Removes a client for good. Only from the Deleted bin, so it always takes two
 * deliberate steps. Referral history survives (its foreign key is SetNull).
 */
export async function purgeClientAction(clientId: string) {
  const user = await requireReferrer();
  const client = await db.client.findUnique({ where: { id: clientId }, select: { referrerId: true, deletedAt: true, photoUrl: true } });
  if (!client || client.referrerId !== user.id || !client.deletedAt) return { ok: false, message: "Client not found." };

  await db.client.delete({ where: { id: clientId } });
  await removeStoredPhoto(client.photoUrl);
  await audit({ actorId: user.id, action: "client.purged", targetType: "Client", targetId: clientId });
  revalidateClient();
  return { ok: true, message: "Deleted permanently." };
}

export type BulkClientOperation = "ACTIVE" | "PLACED" | "ARCHIVED" | "DELETE" | "RESTORE" | "PURGE";

/** One action across several selected clients from the list view. */
export async function bulkClientAction(ids: string[], operation: BulkClientOperation) {
  const user = await requireReferrer();
  const unique = Array.from(new Set(ids)).slice(0, 200);
  if (unique.length === 0) return { ok: false, message: "Select at least one client." };

  const owned = await db.client.findMany({
    where: { id: { in: unique }, referrerId: user.id },
    select: { id: true, status: true, deletedAt: true, photoUrl: true },
  });
  const now = new Date();

  if (operation === "DELETE") {
    const targets = owned.filter((c) => !c.deletedAt).map((c) => c.id);
    await db.$transaction([
      db.client.updateMany({ where: { id: { in: targets } }, data: { deletedAt: now } }),
      db.clientShare.updateMany({ where: { clientId: { in: targets }, revokedAt: null }, data: { revokedAt: now } }),
    ]);
    await audit({ actorId: user.id, action: "client.bulk_deleted", targetType: "Client", metadata: { count: targets.length } });
    revalidateClient();
    return { ok: true, message: `Moved ${targets.length} to Deleted.` };
  }

  if (operation === "PURGE") {
    const targets = owned.filter((c) => c.deletedAt);
    await db.client.deleteMany({ where: { id: { in: targets.map((c) => c.id) } } });
    await Promise.all(targets.map((c) => removeStoredPhoto(c.photoUrl)));
    await audit({ actorId: user.id, action: "client.bulk_purged", targetType: "Client", metadata: { count: targets.length } });
    revalidateClient();
    return { ok: true, message: `Permanently deleted ${targets.length}.` };
  }

  if (operation === "RESTORE") {
    const targets = owned.filter((c) => c.deletedAt);
    const limits = await referrerPlanLimits(user.id);
    let room = limits.membership.maxClients === -1 ? Infinity : Math.max(0, limits.membership.maxClients - limits.used.clients);
    let demoted = 0;
    for (const c of targets) {
      let status = c.status;
      if (status !== "ARCHIVED") {
        if (room > 0) room -= 1;
        else {
          status = "ARCHIVED";
          demoted += 1;
        }
      }
      await db.client.update({ where: { id: c.id }, data: { deletedAt: null, status } });
    }
    await audit({ actorId: user.id, action: "client.bulk_restored", targetType: "Client", metadata: { count: targets.length } });
    revalidateClient();
    return {
      ok: true,
      message: `Restored ${targets.length}${demoted ? ` (${demoted} to Archived — plan limit reached)` : ""}.`,
    };
  }

  // Status change. Re-activating archived clients is bounded by the plan.
  const live = owned.filter((c) => !c.deletedAt);
  let targets = live.map((c) => c.id);
  let skipped = 0;
  if (operation !== "ARCHIVED") {
    const limits = await referrerPlanLimits(user.id);
    if (limits.membership.maxClients !== -1) {
      let room = Math.max(0, limits.membership.maxClients - limits.used.clients);
      targets = live
        .filter((c) => {
          if (c.status !== "ARCHIVED") return true;
          if (room > 0) {
            room -= 1;
            return true;
          }
          skipped += 1;
          return false;
        })
        .map((c) => c.id);
    }
  }
  await db.client.updateMany({ where: { id: { in: targets } }, data: { status: operation } });
  await audit({ actorId: user.id, action: `client.bulk_${operation.toLowerCase()}`, targetType: "Client", metadata: { count: targets.length } });
  revalidateClient();
  return {
    ok: true,
    message: `Updated ${targets.length}${skipped ? ` — ${skipped} left archived because your plan is full` : ""}.`,
  };
}

// ------------------------------------------------------------------ bulk upload

const SUPPORT_LOOKUP = new Map<string, string>(
  SUPPORT_TYPES.flatMap((t) => [
    [headerKey(t.slug), t.slug] as [string, string],
    [headerKey(t.label), t.slug] as [string, string],
  ]),
);
SUPPORT_LOOKUP.set("prisonleavers", "ex-offenders");
SUPPORT_LOOKUP.set("exoffenders", "ex-offenders");
SUPPORT_LOOKUP.set("youngpeople", "young-people");

const COLUMN_ALIASES: Record<string, string[]> = {
  firstName: ["firstname", "forename", "givenname", "first"],
  lastName: ["lastname", "surname", "familyname", "last"],
  fullName: ["name", "fullname", "clientname"],
  dateOfBirth: ["dateofbirth", "dob", "birthdate", "birthday"],
  phone: ["phone", "phonenumber", "mobile", "telephone", "tel"],
  email: ["email", "emailaddress"],
  preferredLocation: ["preferredarea", "preferredlocation", "area", "location", "town", "city"],
  accommodationNeeds: ["accommodationneeds", "housingneeds", "accommodation"],
  supportNeeds: ["supportneeds", "needs", "support"],
  supportTypes: ["supporttypes", "supportcategories", "categories", "supporttype"],
  status: ["status"],
  riskNotes: ["notes", "privatenotes", "risknotes"],
};

export type ImportState = FormState & { created?: number; skipped?: { row: number; reason: string }[] };

/**
 * Bulk-adds a caseload from a spreadsheet. Headers are matched loosely
 * ("First name", "forename", "DOB"…), rows that can't be read are reported
 * back by row number rather than failing the whole file, and the plan's
 * active-client limit still applies — rows over it are added as Archived.
 */
export async function importClientsAction(_prev: ImportState, formData: FormData): Promise<ImportState> {
  const user = await requireReferrer();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, errors: { form: "Choose a CSV file to upload." } };
  if (file.size > 2 * 1024 * 1024) return { ok: false, errors: { form: "That file is over 2MB. Split it into smaller files." } };
  if (!/\.csv$/i.test(file.name) && !file.type.includes("csv") && file.type !== "text/plain") {
    return { ok: false, errors: { form: "Upload a .csv file. In Excel or Google Sheets: File → Save as / Download → CSV." } };
  }

  const rows = parseCsv(await file.text());
  if (rows.length < 2) return { ok: false, errors: { form: "That file has no rows under the header line." } };
  if (rows.length > 501) return { ok: false, errors: { form: "Upload up to 500 clients at a time." } };

  const header = rows[0].map(headerKey);
  const col = (field: string) => header.findIndex((h) => COLUMN_ALIASES[field].includes(h));
  const idx = Object.fromEntries(Object.keys(COLUMN_ALIASES).map((f) => [f, col(f)])) as Record<string, number>;
  if (idx.firstName === -1 && idx.fullName === -1) {
    return { ok: false, errors: { form: "Couldn't find a name column. Add a header row with “First name” and “Last name” (or “Name”)." } };
  }

  const limits = await referrerPlanLimits(user.id);
  let room = limits.membership.maxClients === -1 ? Infinity : Math.max(0, limits.membership.maxClients - limits.used.clients);
  const skipped: { row: number; reason: string }[] = [];
  const data: {
    referrerId: string;
    firstName: string;
    lastName: string;
    dateOfBirth: Date | null;
    phone: string | null;
    email: string | null;
    preferredLocation: string | null;
    accommodationNeeds: string | null;
    supportNeeds: string | null;
    supportTypes: string[];
    riskNotes: string | null;
    status: ClientStatusValue;
  }[] = [];
  let archivedForLimit = 0;

  rows.slice(1).forEach((cells, i) => {
    const rowNumber = i + 2;
    const cell = (field: string) => (idx[field] >= 0 ? (cells[idx[field]] ?? "").trim() : "");

    let firstName = cell("firstName");
    let lastName = cell("lastName");
    if (!firstName && cell("fullName")) {
      const parts = cell("fullName").split(/\s+/);
      firstName = parts.shift() ?? "";
      lastName = lastName || parts.join(" ");
    }
    if (!firstName || !lastName) {
      skipped.push({ row: rowNumber, reason: "Missing first or last name" });
      return;
    }

    const email = cell("email");
    if (email.toLowerCase() === "sam.example@example.com") {
      skipped.push({ row: rowNumber, reason: "The example row from the template" });
      return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      skipped.push({ row: rowNumber, reason: `“${email}” isn't a valid email` });
      return;
    }
    const dobText = cell("dateOfBirth");
    const dateOfBirth = dobText ? parseUkDate(dobText) : null;
    if (dobText && !dateOfBirth) {
      skipped.push({ row: rowNumber, reason: `Couldn't read date of birth “${dobText}” — use DD/MM/YYYY` });
      return;
    }

    const supportTypes = Array.from(
      new Set(
        cell("supportTypes")
          .split(/[;|,/]/)
          .map((v) => SUPPORT_LOOKUP.get(headerKey(v)))
          .filter((v): v is string => Boolean(v)),
      ),
    );

    const statusText = headerKey(cell("status"));
    let status: ClientStatusValue =
      statusText.startsWith("placed") || statusText === "housed" ? "PLACED" : statusText.startsWith("archiv") ? "ARCHIVED" : "ACTIVE";
    if (status !== "ARCHIVED") {
      if (room > 0) room -= 1;
      else {
        status = "ARCHIVED";
        archivedForLimit += 1;
      }
    }

    data.push({
      referrerId: user.id,
      firstName: firstName.slice(0, 80),
      lastName: lastName.slice(0, 80),
      dateOfBirth,
      phone: cell("phone").slice(0, 30) || null,
      email: email || null,
      preferredLocation: cell("preferredLocation").slice(0, 160) || null,
      accommodationNeeds: cell("accommodationNeeds").slice(0, 3000) || null,
      supportNeeds: cell("supportNeeds").slice(0, 3000) || null,
      supportTypes,
      riskNotes: cell("riskNotes").slice(0, 3000) || null,
      status,
    });
  });

  if (data.length > 0) await db.client.createMany({ data });
  await audit({ actorId: user.id, action: "client.imported", targetType: "Client", metadata: { created: data.length, skipped: skipped.length } });
  revalidateClient();

  if (data.length === 0) {
    return { ok: false, created: 0, skipped, errors: { form: "No clients were added — check the rows listed below." } };
  }
  return {
    ok: true,
    created: data.length,
    skipped,
    message: `Added ${data.length} client${data.length === 1 ? "" : "s"}${archivedForLimit ? ` (${archivedForLimit} as Archived because your plan's active limit is full)` : ""}.`,
  };
}

// ------------------------------------------------------------------ sharing

/**
 * "Send profile" — gives one provider organisation standing read access to a
 * client record. Deliberately lighter-weight than a Referral: it's "here is
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

  const shared = await shareClientWithCompany({ user, clientId: d.clientId, companyId: d.companyId, note: d.note || null });
  if (!shared.ok) return { ok: false, errors: { form: shared.error } };

  revalidatePath(`/referrals/clients/${d.clientId}`);
  return { ok: true, message: `Shared with ${shared.value.companyName}.` };
}

export type AllocateState = FormState & { conversationId?: string };

/**
 * Allocate a client to a provider in one step: share the profile and, if the
 * referrer wrote something, message the provider on the client's behalf with
 * the profile card attached — so the provider sees who they're being asked
 * about without opening anything else.
 */
export async function allocateClientAction(_prev: AllocateState, formData: FormData): Promise<AllocateState> {
  const user = await requireReferrer();
  const clientId = text(formData, "clientId");
  const companyId = text(formData, "companyId");
  const body = text(formData, "body").trim().slice(0, 5000);
  const note = text(formData, "note").trim().slice(0, 1000);
  if (!companyId) return { ok: false, errors: { form: "Choose a provider first." } };

  const client = await ownedLiveClient(user.id, clientId);
  if (!client) return { ok: false, errors: { form: "Client not found." } };

  const shared = await shareClientWithCompany({ user, clientId, companyId, note: note || null, quiet: Boolean(body) });
  if (!shared.ok) return { ok: false, errors: { form: shared.error } };

  let conversationId: string | undefined;
  if (body) {
    const sent = await messageCompanyAsReferrer({
      user,
      companyId,
      subject: `${client.firstName} ${client.lastName}`,
      body,
      clientId: client.id,
      clientCard: clientCardFrom(client),
    });
    if (!sent.ok) {
      revalidatePath(`/referrals/clients/${clientId}`);
      return { ok: false, errors: { form: `Profile shared with ${shared.value.companyName}, but the message didn't send: ${sent.error}` } };
    }
    conversationId = sent.conversationId;
  }

  revalidatePath(`/referrals/clients/${clientId}`);
  revalidatePath("/referrals/analytics");
  return {
    ok: true,
    conversationId,
    message: body
      ? `Shared with ${shared.value.companyName} and messaged them on ${client.firstName}'s behalf.`
      : `Shared with ${shared.value.companyName}.`,
  };
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

export async function saveClientShareReviewAction(shareId: string, reviewStatusInput: unknown, reviewNoteInput: unknown) {
  const { user, companyId } = await requireCompany();
  const allowedStatuses = new Set(["POTENTIAL_FIT", "NEEDS_INFORMATION", "CANNOT_MEET_NEEDS"]);
  const reviewStatus = typeof reviewStatusInput === "string" ? reviewStatusInput : "";
  const note = typeof reviewNoteInput === "string" ? reviewNoteInput.trim() : "";
  if (typeof shareId !== "string" || !shareId || shareId.length > 64) return { ok: false as const, message: "This profile could not be found." };
  if (!allowedStatuses.has(reviewStatus)) return { ok: false as const, message: "Choose a review outcome." };
  if (note.length > 1200) return { ok: false as const, message: "Keep the review note under 1,200 characters." };
  if (reviewStatus !== "POTENTIAL_FIT" && note.length < 12) {
    return { ok: false as const, message: "Add a brief, factual reason linked to the stated accommodation or support requirements." };
  }

  const share = await db.clientShare.findFirst({
    where: { id: shareId, companyId, revokedAt: null, client: { deletedAt: null } },
    select: { id: true, clientId: true },
  });
  if (!share) return { ok: false as const, message: "This profile is no longer shared with your organisation." };

  await db.clientShare.update({
    where: { id: share.id },
    data: { reviewStatus, reviewNote: note || null, reviewedAt: new Date() },
  });
  await audit({ actorId: user.id, action: "client.share_reviewed", targetType: "ClientShare", targetId: share.id, metadata: { reviewStatus } });
  revalidatePath(`/provider/clients/${share.clientId}`);
  revalidatePath("/provider/clients");
  return { ok: true as const, message: "Your organisation’s suitability review has been saved." };
}

/** Lightweight provider search for the "share with a provider" picker. */
export async function searchCompaniesAction(query: string) {
  await requireReferrer();
  const q = query.trim();
  if (q.length < 2) return [];
  return db.company.findMany({
    where: {
      status: "ACTIVE",
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { tradingName: { contains: q, mode: "insensitive" } },
        { city: { contains: q, mode: "insensitive" } },
      ],
    },
    select: { id: true, name: true, city: true, verification: true },
    orderBy: { name: "asc" },
    take: 8,
  });
}

/**
 * Saves the optional needs and risk assessment. Everything in it is optional;
 * an empty form simply clears it. It stays private to the referrer.
 */
export async function saveAssessmentAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireReferrer();
  const clientId = String(formData.get("clientId") ?? "");
  const client = await ownedLiveClient(user.id, clientId);
  if (!client) return { ok: false, errors: { form: "Client not found." } };

  const assessment = assessmentFromForm(formData);
  const empty = Object.keys(assessment).length === 0;
  await db.client.update({
    where: { id: clientId },
    data: { assessment: empty ? Prisma.DbNull : (assessment as Prisma.InputJsonValue), assessedAt: empty ? null : new Date() },
  });
  await audit({ actorId: user.id, action: "client.assessment_saved", targetType: "Client", targetId: clientId });
  revalidateClient(clientId);
  revalidatePath(`/referrals/clients/${clientId}/matches`);

  if (formData.get("then") === "matches") redirect(`/referrals/clients/${clientId}/matches`);
  return { ok: true, message: empty ? "Assessment cleared." : "Assessment saved. Matches now use it." };
}
