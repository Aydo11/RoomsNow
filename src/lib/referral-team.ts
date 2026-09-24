import "server-only";
import { cache } from "react";
import type { ReferralOrgRole } from "@prisma/client";
import { createHash } from "node:crypto";
import { db } from "./db";

/**
 * A referrer's team. Colleagues in one referral organisation share a caseload
 * (clients and referrals), an agency profile and the owner's plan, while each
 * keeps their own login and personal profile. Someone who isn't in an
 * organisation is simply a team of one.
 */
export type ReferralTeam = {
  organisation: { id: string; name: string; ownerId: string } | null;
  role: ReferralOrgRole | null;
  /** Everyone whose clients and referrals this person can see and work on. */
  memberIds: string[];
  /** Owners and admins can invite, remove and change roles. */
  canManage: boolean;
  /** Whose plan and agency profile applies. */
  ownerId: string;
};

/** Cached per request, so pages and actions can call it freely. */
export const teamFor = cache(async (userId: string): Promise<ReferralTeam> => {
  const membership = await db.referralOrgMember.findUnique({
    where: { userId },
    select: {
      role: true,
      organisation: {
        select: { id: true, name: true, ownerId: true, members: { select: { userId: true } } },
      },
    },
  });
  if (!membership) {
    return { organisation: null, role: null, memberIds: [userId], canManage: true, ownerId: userId };
  }
  const { organisation } = membership;
  return {
    organisation: { id: organisation.id, name: organisation.name, ownerId: organisation.ownerId },
    role: membership.role,
    memberIds: organisation.members.map((m) => m.userId),
    canManage: membership.role === "OWNER" || membership.role === "ADMIN",
    ownerId: organisation.ownerId,
  };
});

export async function teamMemberIds(userId: string) {
  return (await teamFor(userId)).memberIds;
}

/** True when a record owned by `ownerId` belongs to this person's team. */
export async function inTeam(userId: string, ownerId: string | null | undefined) {
  if (!ownerId) return false;
  if (ownerId === userId) return true;
  return (await teamMemberIds(userId)).includes(ownerId);
}

export const ORG_ROLE_LABEL: Record<ReferralOrgRole, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  MEMBER: "Member",
};

/** A still-usable invitation for this link token, or null. */
export async function findInvite(token: string) {
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  const invite = await db.referralOrgInvite.findUnique({
    where: { tokenHash: createHash("sha256").update(token).digest("hex") },
    include: { organisation: { select: { id: true, name: true, ownerId: true } }, invitedBy: { select: { firstName: true, lastName: true } } },
  });
  if (!invite || invite.acceptedAt || invite.revokedAt || invite.expiresAt < new Date()) return null;
  return invite;
}

