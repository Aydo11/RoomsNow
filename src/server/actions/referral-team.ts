"use server";

import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ReferralOrgRole } from "@prisma/client";
import { db } from "@/lib/db";
import { requireReferrer, requireUser } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { notify, sendEmail } from "@/lib/notify";
import { escapeHtml, renderEmail } from "@/lib/email-template";
import { callerIp, LIMITS, rateLimit } from "@/lib/rate-limit";
import { createSession } from "@/lib/session";
import { findInvite, teamFor } from "@/lib/referral-team";
import { email as emailSchema, password as passwordSchema, fieldErrors, type FormState } from "@/lib/validation";

const INVITE_DAYS = 14;
const APP_URL = () => (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
const hash = (token: string) => createHash("sha256").update(token).digest("hex");

function refresh() {
  revalidatePath("/referrals/team");
  revalidatePath("/referrals");
  revalidatePath("/referrals/clients");
  revalidatePath("/referrals/profile");
}

/** Start an organisation with the signed-in referrer as its owner. */
export async function createOrganisationAction(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireReferrer();
  if (user.role !== "REFERRER") return { ok: false, errors: { form: "Only referral accounts can create an organisation." } };
  const name = String(form.get("name") ?? "").trim().slice(0, 120);
  if (name.length < 2) return { ok: false, errors: { name: "Enter your organisation's name." } };
  if (await db.referralOrgMember.findUnique({ where: { userId: user.id } })) {
    return { ok: false, errors: { form: "You're already part of an organisation." } };
  }
  const org = await db.$transaction(async (tx) => {
    const created = await tx.referralOrganisation.create({
      data: { name, ownerId: user.id, members: { create: { userId: user.id, role: "OWNER" } } },
    });
    await tx.user.update({ where: { id: user.id }, data: { organisation: name } });
    return created;
  });
  await audit({ actorId: user.id, action: "referral_org.created", targetType: "ReferralOrganisation", targetId: org.id });
  refresh();
  return { ok: true, message: `${name} is set up. Invite your colleagues below.` };
}

export async function renameOrganisationAction(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireReferrer();
  const team = await teamFor(user.id);
  if (!team.organisation || !team.canManage) return { ok: false, errors: { form: "Only owners and admins can rename the organisation." } };
  const name = String(form.get("name") ?? "").trim().slice(0, 120);
  if (name.length < 2) return { ok: false, errors: { name: "Enter your organisation's name." } };
  await db.$transaction([
    db.referralOrganisation.update({ where: { id: team.organisation.id }, data: { name } }),
    db.user.updateMany({ where: { id: { in: team.memberIds } }, data: { organisation: name } }),
  ]);
  refresh();
  return { ok: true, message: "Organisation name updated for everyone." };
}

const inviteInput = z.object({
  email: emailSchema,
  role: z.enum(["ADMIN", "MEMBER"]),
});

export async function inviteColleagueAction(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireReferrer();
  const team = await teamFor(user.id);
  if (!team.organisation || !team.canManage) return { ok: false, errors: { form: "Only owners and admins can invite colleagues." } };
  const limit = await rateLimit(`referral-invite:${user.id}`, { limit: 30, windowMs: 60 * 60_000 });
  if (!limit.ok) return { ok: false, errors: { form: "You've sent a lot of invitations. Try again in an hour." } };

  const parsed = inviteInput.safeParse({ email: form.get("email"), role: form.get("role") || "MEMBER" });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const { email, role } = parsed.data;

  const existing = await db.user.findUnique({
    where: { email },
    select: { id: true, role: true, firstName: true, referralOrgMembership: { select: { organisationId: true } } },
  });
  if (existing?.referralOrgMembership?.organisationId === team.organisation.id) {
    return { ok: false, errors: { email: "They're already in your organisation." } };
  }
  if (existing && existing.role !== "REFERRER") {
    return { ok: false, errors: { email: "That email is used by a provider or tenant account. Ask them for their work email instead." } };
  }

  const token = randomBytes(32).toString("hex");
  await db.$transaction([
    // A fresh invitation replaces any earlier one to the same address.
    db.referralOrgInvite.updateMany({
      where: { organisationId: team.organisation.id, email, acceptedAt: null, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
    db.referralOrgInvite.create({
      data: {
        organisationId: team.organisation.id,
        email,
        role: role as ReferralOrgRole,
        tokenHash: hash(token),
        invitedById: user.id,
        expiresAt: new Date(Date.now() + INVITE_DAYS * 24 * 60 * 60_000),
      },
    }),
  ]);

  const link = `${APP_URL()}/join/${token}`;
  const orgName = team.organisation.name;
  const inviter = `${user.firstName} ${user.lastName}`;
  try {
    await sendEmail({
      to: email,
      subject: `${inviter} invited you to ${orgName} on RoomsNow`,
      text: `${inviter} has invited you to join ${orgName} on RoomsNow, so you can manage referrals and clients together with your own login. Accept here (valid for ${INVITE_DAYS} days): ${link}`,
      html: renderEmail({
        preheader: `Join ${orgName} on RoomsNow.`,
        heading: `Join ${escapeHtml(orgName)} on RoomsNow`,
        bodyHtml: `${escapeHtml(inviter)} has invited you to join <strong>${escapeHtml(orgName)}</strong>. You'll have your own login and profile, and share your team's clients and referrals.`,
        ctaLabel: "Accept invitation",
        ctaUrl: link,
        note: `This invitation expires in ${INVITE_DAYS} days. If you weren't expecting it, you can ignore this email.`,
      }),
    });
  } catch (error) {
    console.error("Referral team invitation email failed:", error);
  }
  if (existing) {
    await notify({ userId: existing.id, type: "SYSTEM", title: `You've been invited to join ${orgName}`, body: `${inviter} invited you to their organisation.`, href: `/join/${token}` });
  }
  await audit({ actorId: user.id, action: "referral_org.invited", targetType: "ReferralOrganisation", targetId: team.organisation.id, metadata: { role } });
  refresh();
  return { ok: true, message: `Invitation sent to ${email}. You can also copy the link below and send it yourself.`, link };
}

export async function revokeInviteAction(inviteId: string) {
  const user = await requireReferrer();
  const team = await teamFor(user.id);
  if (!team.organisation || !team.canManage) return;
  await db.referralOrgInvite.updateMany({
    where: { id: inviteId, organisationId: team.organisation.id, acceptedAt: null },
    data: { revokedAt: new Date() },
  });
  refresh();
}

export async function changeMemberRoleAction(memberUserId: string, role: "ADMIN" | "MEMBER") {
  const user = await requireReferrer();
  const team = await teamFor(user.id);
  if (!team.organisation || !team.canManage) return { ok: false, message: "Only owners and admins can change roles." };
  if (memberUserId === team.ownerId) return { ok: false, message: "The owner's role can't be changed." };
  if (role !== "ADMIN" && role !== "MEMBER") return { ok: false, message: "Choose a role." };
  await db.referralOrgMember.updateMany({ where: { userId: memberUserId, organisationId: team.organisation.id }, data: { role } });
  await audit({ actorId: user.id, action: "referral_org.role_changed", targetType: "User", targetId: memberUserId, metadata: { role } });
  refresh();
  return { ok: true, message: "Role updated." };
}

/**
 * Takes someone out of the organisation. Their clients and referrals stay
 * with the team — they move to the owner — because the caseload belongs to
 * the organisation, not the individual.
 */
async function detach(orgId: string, ownerId: string, memberUserId: string, actorId: string) {
  await db.$transaction([
    db.client.updateMany({ where: { referrerId: memberUserId }, data: { referrerId: ownerId } }),
    db.referral.updateMany({ where: { referrerId: memberUserId }, data: { referrerId: ownerId } }),
    db.referralOrgMember.deleteMany({ where: { userId: memberUserId, organisationId: orgId } }),
  ]);
  await audit({ actorId, action: "referral_org.member_removed", targetType: "User", targetId: memberUserId, metadata: { organisationId: orgId } });
}

export async function removeMemberAction(memberUserId: string) {
  const user = await requireReferrer();
  const team = await teamFor(user.id);
  if (!team.organisation || !team.canManage) return { ok: false, message: "Only owners and admins can remove colleagues." };
  if (memberUserId === team.ownerId) return { ok: false, message: "The owner can't be removed." };
  if (!team.memberIds.includes(memberUserId)) return { ok: false, message: "They're not in your organisation." };
  await detach(team.organisation.id, team.ownerId, memberUserId, user.id);
  await notify({ userId: memberUserId, type: "SYSTEM", title: `You've been removed from ${team.organisation.name}`, body: "Your own account still works. The organisation's clients and referrals stay with the organisation." });
  refresh();
  return { ok: true, message: "Removed. Their clients and referrals have moved to the organisation owner." };
}

export async function leaveOrganisationAction() {
  const user = await requireReferrer();
  const team = await teamFor(user.id);
  if (!team.organisation) return { ok: false, message: "You're not in an organisation." };
  if (user.id === team.ownerId) return { ok: false, message: "Owners can't leave their own organisation." };
  await detach(team.organisation.id, team.ownerId, user.id, user.id);
  refresh();
  return { ok: true, message: "You've left the organisation." };
}

/** Hand a client to another colleague (the case owner). */
export async function reassignClientAction(clientId: string, newOwnerId: string) {
  const user = await requireReferrer();
  const team = await teamFor(user.id);
  const client = await db.client.findUnique({ where: { id: clientId }, select: { referrerId: true } });
  if (!client || !team.memberIds.includes(client.referrerId) || !team.memberIds.includes(newOwnerId)) {
    return { ok: false, message: "Client or colleague not found." };
  }
  if (!team.canManage && client.referrerId !== user.id) return { ok: false, message: "Only the case owner or an admin can reassign this client." };
  await db.client.update({ where: { id: clientId }, data: { referrerId: newOwnerId } });
  await audit({ actorId: user.id, action: "client.reassigned", targetType: "Client", targetId: clientId, metadata: { to: newOwnerId } });
  if (newOwnerId !== user.id) {
    await notify({ userId: newOwnerId, type: "SYSTEM", title: "A client has been assigned to you", body: `${user.firstName} ${user.lastName} made you the case owner.`, href: `/referrals/clients/${clientId}` });
  }
  revalidatePath(`/referrals/clients/${clientId}`);
  revalidatePath("/referrals/clients");
  return { ok: true, message: "Case owner updated." };
}

// ---------------------------------------------------------------- joining

async function addToOrganisation(inviteId: string, organisationId: string, orgName: string, userId: string, role: ReferralOrgRole) {
  await db.$transaction([
    db.referralOrgMember.create({ data: { organisationId, userId, role } }),
    db.referralOrgInvite.update({ where: { id: inviteId }, data: { acceptedAt: new Date() } }),
    db.user.update({ where: { id: userId }, data: { organisation: orgName } }),
  ]);
}

/** A signed-in referrer accepts an invitation sent to their email. */
export async function acceptInviteAction(token: string) {
  const user = await requireUser(`/join/${token}`);
  const invite = await findInvite(token);
  if (!invite) return { ok: false, message: "This invitation has expired or has already been used." };
  if (user.email.toLowerCase() !== invite.email.toLowerCase()) {
    return { ok: false, message: `This invitation was sent to ${invite.email}. Sign in with that account to accept it.` };
  }
  if (user.role !== "REFERRER") return { ok: false, message: "Only referral accounts can join an organisation." };
  const existing = await db.referralOrgMember.findUnique({ where: { userId: user.id }, include: { organisation: { select: { name: true, ownerId: true } } } });
  if (existing) {
    return { ok: false, message: `You're already part of ${existing.organisation.name}. Leave it first from the Team page${existing.organisation.ownerId === user.id ? " (or ask a colleague to take ownership)" : ""}.` };
  }
  await addToOrganisation(invite.id, invite.organisationId, invite.organisation.name, user.id, invite.role);
  await audit({ actorId: user.id, action: "referral_org.joined", targetType: "ReferralOrganisation", targetId: invite.organisationId });
  await notify({ userId: invite.invitedById, type: "SYSTEM", title: `${user.firstName} ${user.lastName} joined ${invite.organisation.name}`, href: "/referrals/team" });
  refresh();
  redirect("/referrals/team?joined=1");
}

const joinInput = z.object({
  firstName: z.string().trim().min(1, "Enter your first name.").max(80),
  lastName: z.string().trim().min(1, "Enter your last name.").max(80),
  jobTitle: z.string().trim().max(120).optional().or(z.literal("")),
  password: passwordSchema,
  terms: z.literal("on", { errorMap: () => ({ message: "Please accept the terms to continue." }) }),
});

/** Someone new creates their own account straight from the invitation. */
export async function joinWithNewAccountAction(_prev: FormState, form: FormData): Promise<FormState> {
  const throttle = await rateLimit(`register:${await callerIp()}`, LIMITS.register);
  if (!throttle.ok) return { ok: false, errors: { form: "Too many accounts created from here. Try again later." } };
  const token = String(form.get("token") ?? "");
  const invite = await findInvite(token);
  if (!invite) return { ok: false, errors: { form: "This invitation has expired or has already been used." } };

  const parsed = joinInput.safeParse({
    firstName: form.get("firstName"),
    lastName: form.get("lastName"),
    jobTitle: form.get("jobTitle") ?? "",
    password: form.get("password"),
    terms: form.get("terms") ?? "",
  });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  if (await db.user.findUnique({ where: { email: invite.email } })) {
    return { ok: false, errors: { form: "An account already uses this email — sign in to accept the invitation." } };
  }
  const d = parsed.data;
  // The invitation link went to this inbox, so the email is already verified.
  const created = await db.user.create({
    data: {
      email: invite.email,
      passwordHash: await bcrypt.hash(d.password, 12),
      role: "REFERRER",
      firstName: d.firstName,
      lastName: d.lastName,
      jobTitle: d.jobTitle || null,
      emailVerified: new Date(),
      emailVerificationRequired: false,
    },
  });
  await addToOrganisation(invite.id, invite.organisationId, invite.organisation.name, created.id, invite.role);
  await audit({ actorId: created.id, action: "user.registered", targetType: "User", targetId: created.id, metadata: { via: "referral_org_invite" } });
  await notify({ userId: invite.invitedById, type: "SYSTEM", title: `${d.firstName} ${d.lastName} joined ${invite.organisation.name}`, href: "/referrals/team" });
  await createSession(created.id, created.role, created.tokenVersion);
  redirect("/referrals/team?joined=1");
}
