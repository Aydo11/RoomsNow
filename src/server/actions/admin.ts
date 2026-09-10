"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { notify, notifyCompany } from "@/lib/notify";
import type { ReportStatus } from "@prisma/client";
import { z } from "zod";
import type { VerificationChecks } from "@/lib/verification";

export async function approveListingAction(listingId: string) {
  const admin = await requireAdmin("MODERATION");
  const listing = await db.listing.update({
    where: { id: listingId },
    data: { status: "ACTIVE", publishedAt: new Date(), rejectionNote: null },
  });
  await notifyCompany(listing.companyId, {
    type: "LISTING",
    title: "Advert approved",
    body: `“${listing.title}” is now live and searchable.`,
    href: `/listings/${listing.id}`,
    email: true,
  });
  await audit({ actorId: admin.id, action: "admin.listing_approved", targetType: "Listing", targetId: listingId });
  revalidatePath("/admin/listings");
}

export async function rejectListingAction(listingId: string, note: string) {
  const admin = await requireAdmin("MODERATION");
  const listing = await db.listing.update({
    where: { id: listingId },
    data: { status: "REJECTED", rejectionNote: note },
  });
  await notifyCompany(listing.companyId, {
    type: "LISTING",
    title: "Advert needs changes",
    body: note,
    href: `/provider/adverts/${listing.id}`,
    email: true,
  });
  await audit({
    actorId: admin.id,
    action: "admin.listing_rejected",
    targetType: "Listing",
    targetId: listingId,
    metadata: { note },
  });
  revalidatePath("/admin/listings");
}

export async function reviewVerificationAction(requestId: string, approve: boolean, note?: string, checks?: VerificationChecks) {
  const admin = await requireAdmin();
  const completeChecks = checks && Object.values(checks).every(Boolean);
  if (approve && !completeChecks) throw new Error("Complete every due-diligence check before approval.");
  const request = await db.verificationRequest.update({
    where: { id: requestId },
    data: {
      status: approve ? "APPROVED" : "REJECTED",
      reviewedBy: admin.id,
      reviewedAt: new Date(),
      reviewNote: note ?? null,
      registrationChecked: Boolean(checks?.register),
      insuranceChecked: Boolean(checks?.insurance),
      governanceChecked: Boolean(checks?.governance),
      safeguardingChecked: Boolean(checks?.safeguarding),
      identityChecked: Boolean(checks?.identity),
    },
  });

  if (request.type === "COMPANY") {
    await db.company.update({
      where: { id: request.companyId },
      data: {
        verification: approve ? "APPROVED" : "REJECTED",
        verifiedAt: approve ? new Date() : null,
      },
    });
  } else if (request.propertyId) {
    await db.property.update({
      where: { id: request.propertyId },
      data: { verification: approve ? "APPROVED" : "REJECTED" },
    });
  }

  await notifyCompany(request.companyId, {
    type: "VERIFICATION",
    title: approve ? "Verification approved" : "Verification not approved",
    body: note ?? (approve ? "Your verified badge is now showing on your profile." : "See the note from our team."),
    href: "/provider/settings",
    email: true,
  });
  await audit({
    actorId: admin.id,
    action: approve ? "admin.verification_approved" : "admin.verification_rejected",
    targetType: "VerificationRequest",
    targetId: requestId,
    metadata: { note, checks },
  });
  revalidatePath("/admin/verification");
}

export async function setUserStatusAction(userId: string, status: "ACTIVE" | "SUSPENDED") {
  const admin = await requireAdmin();
  const target = await db.user.findUnique({ where: { id: userId }, select: { role: true } });
  // Admin access is managed on the team page, with reauthentication and self-lockout protection.
  if (!target || target.role === "ADMIN") return;
  await db.user.update({
    where: { id: userId },
    // Suspending also invalidates every existing session, so a suspended user is
    // signed out immediately rather than when their token happens to expire.
    data: { status, ...(status === "SUSPENDED" ? { tokenVersion: { increment: 1 } } : {}) },
  });
  if (status === "ACTIVE") {
    await notify({ userId, type: "SYSTEM", title: "Your account has been reinstated" });
  }
  await audit({
    actorId: admin.id,
    action: status === "SUSPENDED" ? "admin.user_suspended" : "admin.user_reinstated",
    targetType: "User",
    targetId: userId,
  });
  revalidatePath("/admin/users");
}

export async function setCompanyStatusAction(companyId: string, status: "ACTIVE" | "SUSPENDED") {
  const admin = await requireAdmin();
  await db.$transaction([
    db.company.update({ where: { id: companyId }, data: { status } }),
    // Suspending a company takes its adverts out of search immediately.
    db.listing.updateMany({
      where: { companyId, status: "ACTIVE" },
      data: { status: status === "SUSPENDED" ? "PAUSED" : "ACTIVE" },
    }),
  ]);
  await audit({ actorId: admin.id, action: `admin.company_${status.toLowerCase()}`, targetType: "Company", targetId: companyId });
  revalidatePath("/admin/companies");
}

export async function resolveReportAction(reportId: string, status: ReportStatus, resolution?: string) {
  const admin = await requireAdmin("MODERATION");
  const id = z.string().cuid().parse(reportId);
  const nextStatus = z.enum(["OPEN", "REVIEWING", "ACTIONED", "DISMISSED"]).parse(status);
  const note = resolution?.trim().slice(0, 4000) || null;
  await db.$transaction([
    db.report.update({ where: { id }, data: { status: nextStatus, resolution: note } }),
    db.reportEvent.create({ data: { reportId: id, actorId: admin.id, status: nextStatus, note } }),
  ]);
  await audit({ actorId: admin.id, action: "admin.report_updated", targetType: "Report", targetId: id, metadata: { status: nextStatus } });
  revalidatePath("/admin/reports");
  revalidatePath(`/admin/reports/${id}`);
}

export async function archiveReportAction(reportId: string, archived: boolean) {
  const admin = await requireAdmin("MODERATION");
  const id = z.string().cuid().parse(reportId);
  const report = await db.report.findUnique({ where: { id }, select: { status: true } });
  if (!report) return;
  await db.$transaction([
    db.report.update({ where: { id }, data: { archivedAt: archived ? new Date() : null } }),
    db.reportEvent.create({ data: { reportId: id, actorId: admin.id, status: report.status, note: archived ? "Archived case" : "Restored case to active reports" } }),
  ]);
  await audit({ actorId: admin.id, action: archived ? "admin.report_archived" : "admin.report_restored", targetType: "Report", targetId: id });
  revalidatePath("/admin/reports");
  revalidatePath(`/admin/reports/${id}`);
}

export async function toggleFeaturedAction(listingId: string, featured: boolean) {
  const admin = await requireAdmin();
  await db.listing.update({
    where: { id: listingId },
    data: { featured, featuredUntil: featured ? new Date(Date.now() + 30 * 24 * 3600 * 1000) : null },
  });
  await audit({ actorId: admin.id, action: "admin.listing_featured", targetType: "Listing", targetId: listingId, metadata: { featured } });
  revalidatePath("/admin/listings");
}

export async function upsertSupportTypeAction(slug: string, label: string) {
  const admin = await requireAdmin();
  await db.supportType.upsert({ where: { slug }, create: { slug, label }, update: { label } });
  await audit({ actorId: admin.id, action: "admin.support_type_saved", targetType: "SupportType", targetId: slug });
  revalidatePath("/admin/categories");
}

export type AdminMembershipGrantState = {
  ok: boolean;
  message?: string;
  errors?: Record<string, string>;
};

/** Quick expiry presets shown in the admin grant form, in months from today. "NONE" means no expiry; "CUSTOM" means the admin picked their own date. */
const GRANT_DURATION_MONTHS: Record<string, number | null> = {
  "1": 1,
  "2": 2,
  "3": 3,
  "6": 6,
  "12": 12,
  NONE: null,
};

const membershipGrantSchema = z.object({
  companyId: z.string().cuid(),
  intent: z.enum(["GRANT", "REVOKE"]),
  tier: z.enum(["PROFESSIONAL", "BUSINESS"]).optional(),
  duration: z.enum(["1", "2", "3", "6", "12", "NONE", "CUSTOM"]).optional(),
  expiresOn: z.string().optional(),
  boostCredits: z.coerce.number().int().min(0).max(50).optional(),
  reason: z.string().trim().min(5, "Add a short reason for the audit record.").max(500),
});

/**
 * Grant or revoke complimentary provider membership, and/or add promotional boost credits,
 * without altering Stripe billing. A grant can be membership-only, boost-only, or both in one
 * submission — whichever the admin fills in.
 */
export async function manageProviderMembershipGrantAction(
  _state: AdminMembershipGrantState,
  formData: FormData,
): Promise<AdminMembershipGrantState> {
  const admin = await requireAdmin();
  const parsed = membershipGrantSchema.safeParse({
    companyId: formData.get("companyId"),
    intent: formData.get("intent"),
    tier: formData.get("tier") || undefined,
    duration: formData.get("duration") || undefined,
    expiresOn: formData.get("expiresOn") || undefined,
    boostCredits: formData.get("boostCredits") || undefined,
    reason: formData.get("reason"),
  });
  if (!parsed.success) {
    const fields = parsed.error.flatten().fieldErrors;
    return {
      ok: false,
      errors: Object.fromEntries(
        Object.entries(fields).flatMap(([key, messages]) => messages?.[0] ? [[key, messages[0]]] : []),
      ),
    };
  }

  const { companyId, intent, tier, duration, expiresOn, boostCredits, reason } = parsed.data;
  const company = await db.company.findUnique({ where: { id: companyId }, select: { name: true } });
  if (!company) return { ok: false, errors: { form: "Provider not found." } };

  if (intent === "REVOKE") {
    const result = await db.membershipGrant.updateMany({
      where: { companyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (!result.count) return { ok: false, errors: { form: "This provider has no active admin grant." } };
    await notifyCompany(companyId, {
      type: "MEMBERSHIP",
      title: "Complimentary membership ended",
      body: "Your account now uses your paid membership, or the Free plan if you do not have an active subscription.",
      href: "/provider/membership",
      email: true,
    });
    await audit({
      actorId: admin.id,
      action: "admin.membership_grant_revoked",
      targetType: "Company",
      targetId: companyId,
      metadata: { reason },
    });
    revalidateMembershipPaths();
    return { ok: true, message: `Complimentary membership removed from ${company.name}.` };
  }

  if (!tier && !boostCredits) {
    return { ok: false, errors: { tier: "Choose a plan and/or add boost credits to grant." } };
  }

  let membership: { id: string; name: string } | null = null;
  let expiresAt: Date | null = null;
  if (tier) {
    membership = await db.membership.findFirst({
      where: { tier, audience: "PROVIDER", active: true },
      select: { id: true, name: true },
    });
    if (!membership) return { ok: false, errors: { tier: "That provider plan is unavailable." } };

    if (duration === "CUSTOM") {
      if (expiresOn) {
        expiresAt = new Date(`${expiresOn}T23:59:59.999Z`);
        if (Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date()) {
          return { ok: false, errors: { expiresOn: "Choose a future expiry date." } };
        }
      }
    } else if (duration && duration in GRANT_DURATION_MONTHS) {
      const months = GRANT_DURATION_MONTHS[duration];
      if (months) {
        const d = new Date();
        d.setUTCMonth(d.getUTCMonth() + months);
        expiresAt = d;
      }
    }
  }

  const now = new Date();
  const grant = membership
    ? await db.$transaction(async (tx) => {
        await tx.membershipGrant.updateMany({
          where: { companyId, revokedAt: null },
          data: { revokedAt: now },
        });
        const created = await tx.membershipGrant.create({
          data: {
            companyId,
            membershipId: membership!.id,
            grantedById: admin.id,
            reason,
            expiresAt,
          },
        });
        if (boostCredits) {
          await tx.company.update({ where: { id: companyId }, data: { boostCredits: { increment: boostCredits } } });
        }
        return created;
      })
    : null;

  if (!membership && boostCredits) {
    await db.company.update({ where: { id: companyId }, data: { boostCredits: { increment: boostCredits } } });
  }

  const parts: string[] = [];
  if (membership) parts.push(`${membership.name} access`);
  if (boostCredits) parts.push(`${boostCredits} promotional boost credit${boostCredits === 1 ? "" : "s"}`);

  await notifyCompany(companyId, {
    type: "MEMBERSHIP",
    title: membership ? `${membership.name} membership granted` : "Promotional boost credits added",
    body: [
      membership
        ? expiresAt
          ? `Complimentary access is active until ${expiresAt.toLocaleDateString("en-GB")}.`
          : "Complimentary access is active until an administrator ends it."
        : null,
      boostCredits ? `${boostCredits} promotional boost credit${boostCredits === 1 ? "" : "s"} added to your account.` : null,
    ].filter(Boolean).join(" "),
    href: "/provider/membership",
    email: true,
  });
  await audit({
    actorId: admin.id,
    action: "admin.membership_grant_created",
    targetType: "Company",
    targetId: companyId,
    metadata: {
      grantId: grant?.id ?? null,
      tier: tier ?? null,
      expiresAt: expiresAt?.toISOString() ?? null,
      boostCredits: boostCredits ?? 0,
      reason,
    },
  });
  revalidateMembershipPaths();
  return { ok: true, message: `${parts.join(" and ")} granted to ${company.name}.` };
}

const userMembershipGrantSchema = z.object({
  userId: z.string().cuid(),
  intent: z.enum(["GRANT", "REVOKE"]),
  tier: z.literal("REFERRER_PRO").optional(),
  expiresOn: z.string().optional(),
  reason: z.string().trim().min(5, "Add a short reason for the audit record.").max(500),
});

/** Grant complimentary Pro access to one professional referrer without altering Stripe billing. */
export async function manageUserMembershipGrantAction(
  _state: AdminMembershipGrantState,
  formData: FormData,
): Promise<AdminMembershipGrantState> {
  const admin = await requireAdmin();
  const parsed = userMembershipGrantSchema.safeParse({
    userId: formData.get("userId"),
    intent: formData.get("intent"),
    tier: formData.get("tier") || undefined,
    expiresOn: formData.get("expiresOn") || undefined,
    reason: formData.get("reason"),
  });
  if (!parsed.success) {
    const fields = parsed.error.flatten().fieldErrors;
    return {
      ok: false,
      errors: Object.fromEntries(
        Object.entries(fields).flatMap(([key, messages]) => messages?.[0] ? [[key, messages[0]]] : []),
      ),
    };
  }

  const { userId, intent, tier, expiresOn, reason } = parsed.data;
  const target = await db.user.findFirst({
    where: { id: userId, role: "REFERRER", status: "ACTIVE", deletedAt: null },
    select: { firstName: true, lastName: true },
  });
  if (!target) return { ok: false, errors: { form: "Active professional-referrer account not found." } };
  const targetName = `${target.firstName} ${target.lastName}`.trim();

  if (intent === "REVOKE") {
    const result = await db.userMembershipGrant.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (!result.count) return { ok: false, errors: { form: "This user has no active admin grant." } };
    await notify({
      userId,
      type: "MEMBERSHIP",
      title: "Complimentary membership ended",
      body: "Your account now uses your paid membership, or the Free plan if you do not have an active subscription.",
      href: "/referrals/membership",
      email: true,
    });
    await audit({
      actorId: admin.id,
      action: "admin.user_membership_grant_revoked",
      targetType: "User",
      targetId: userId,
      metadata: { reason },
    });
    revalidateUserMembershipPaths();
    return { ok: true, message: `Complimentary membership removed from ${targetName}.` };
  }

  if (!tier) return { ok: false, errors: { tier: "Choose a plan to grant." } };
  const membership = await db.membership.findFirst({
    where: { tier, audience: "REFERRER", active: true },
    select: { id: true, name: true },
  });
  if (!membership) return { ok: false, errors: { tier: "That referrer plan is unavailable." } };

  let expiresAt: Date | null = null;
  if (expiresOn) {
    expiresAt = new Date(`${expiresOn}T23:59:59.999Z`);
    if (Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date()) {
      return { ok: false, errors: { expiresOn: "Choose a future expiry date." } };
    }
  }

  const now = new Date();
  const grant = await db.$transaction(async (tx) => {
    await tx.userMembershipGrant.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: now },
    });
    return tx.userMembershipGrant.create({
      data: { userId, membershipId: membership.id, grantedById: admin.id, reason, expiresAt },
    });
  });

  await notify({
    userId,
    type: "MEMBERSHIP",
    title: `${membership.name} membership granted`,
    body: expiresAt
      ? `Complimentary access is active until ${expiresAt.toLocaleDateString("en-GB")}.`
      : "Complimentary access is active until an administrator ends it.",
    href: "/referrals/membership",
    email: true,
  });
  await audit({
    actorId: admin.id,
    action: "admin.user_membership_grant_created",
    targetType: "User",
    targetId: userId,
    metadata: { grantId: grant.id, tier, expiresAt: expiresAt?.toISOString() ?? null, reason },
  });
  revalidateUserMembershipPaths();
  return { ok: true, message: `${membership.name} access granted to ${targetName}.` };
}

function revalidateMembershipPaths() {
  revalidatePath("/admin/memberships");
  revalidatePath("/admin/companies");
  revalidatePath("/provider");
  revalidatePath("/provider/membership");
}

function revalidateUserMembershipPaths() {
  revalidatePath("/admin/memberships");
  revalidatePath("/referrals");
  revalidatePath("/referrals/clients");
  revalidatePath("/referrals/membership");
}
