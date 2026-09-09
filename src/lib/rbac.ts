import "server-only";
import { redirect } from "next/navigation";
import { db } from "./db";
import { getCurrentUser, type CurrentUser } from "./session";
import { hasAdminPermission, type AdminPermission } from "./admin-permissions";

export class AuthorisationError extends Error {
  constructor(message = "You do not have access to this.") {
    super(message);
    this.name = "AuthorisationError";
  }
}

export async function requireUser(next?: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  return user;
}

export async function requireAdmin(permission: AdminPermission = "ALL"): Promise<CurrentUser> {
  const user = await requireUser("/admin");
  if (!hasAdminPermission(user, permission)) throw new AuthorisationError();
  return user;
}

export async function requireReferrer(): Promise<CurrentUser> {
  const user = await requireUser("/referrals");
  if (user.role !== "REFERRER" && !hasAdminPermission(user)) {
    throw new AuthorisationError("Referrals can only be made by professional accounts.");
  }
  return user;
}

/** The company the signed-in user is currently acting for. */
export async function requireCompany(): Promise<{ user: CurrentUser; companyId: string }> {
  const user = await requireUser("/provider");
  const membership = user.staffOf[0];
  if (!membership) {
    if (user.role === "ADMIN") throw new AuthorisationError("Admins must pick a company to act for.");
    redirect("/provider/create");
  }
  return { user, companyId: membership.companyId };
}

/** True when the user is staff at the company (or an admin). */
export function canActForCompany(user: CurrentUser, companyId: string) {
  return hasAdminPermission(user) || user.staffOf.some((s) => s.companyId === companyId);
}

export async function assertCompanyAccess(user: CurrentUser, companyId: string) {
  if (!canActForCompany(user, companyId)) throw new AuthorisationError();
}

/** Listings are only readable by the public once ACTIVE; owners and admins see everything. */
export async function assertListingAccess(user: CurrentUser | null, listingId: string) {
  const listing = await db.listing.findUnique({
    where: { id: listingId },
    select: { id: true, companyId: true, status: true },
  });
  if (!listing) throw new AuthorisationError("Listing not found.");
  if (listing.status === "ACTIVE") return listing;
  if (user && canActForCompany(user, listing.companyId)) return listing;
  throw new AuthorisationError("Listing not found.");
}

/** Conversations are strictly participant-only. Admins do not read message bodies. */
export async function assertConversationAccess(userId: string, conversationId: string) {
  const participant = await db.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });
  if (!participant) throw new AuthorisationError("This conversation is not yours.");
  return participant;
}

/**
 * A referral's applicant details are visible to: the referrer who made it, staff
 * at the company that received it, and admins. Nobody else, ever.
 */
export async function assertReferralAccess(user: CurrentUser, referralId: string) {
  const referral = await db.referral.findUnique({
    where: { id: referralId },
    include: { listing: { select: { companyId: true } } },
  });
  if (!referral) throw new AuthorisationError("Referral not found.");
  const isReferrer = referral.referrerId === user.id;
  const isReceivingCompany = referral.listing ? canActForCompany(user, referral.listing.companyId) : false;
  if (!isReferrer && !isReceivingCompany && !hasAdminPermission(user)) {
    throw new AuthorisationError("Referral not found.");
  }
  return referral;
}

export async function assertRequestAccess(user: CurrentUser, requestId: string) {
  const request = await db.accommodationRequest.findUnique({
    where: { id: requestId },
    include: { listing: { select: { companyId: true } } },
  });
  if (!request) throw new AuthorisationError("Request not found.");
  const isApplicant = request.applicantId === user.id;
  const isProvider = canActForCompany(user, request.listing.companyId);
  if (!isApplicant && !isProvider && !hasAdminPermission(user)) {
    throw new AuthorisationError("Request not found.");
  }
  return request;
}

/**
 * An applicant's full profile is visible to a provider only once that
 * applicant has actually applied to one of their listings — never to browse
 * arbitrary accounts. Admins can always view it.
 */
export async function assertApplicantAccess(user: CurrentUser, applicantId: string) {
  if (hasAdminPermission(user)) return true;
  const applied = await db.accommodationRequest.findFirst({
    where: {
      applicantId,
      listing: { companyId: { in: user.staffOf.map((s) => s.companyId) } },
    },
    select: { id: true },
  });
  if (!applied) throw new AuthorisationError("Applicant not found.");
  return true;
}

/**
 * A client record is visible to: the referrer who owns it, staff at any
 * company it has been actively shared with (a revoked share loses access
 * immediately), and admins.
 */
export async function assertClientAccess(user: CurrentUser, clientId: string) {
  const client = await db.client.findUnique({
    where: { id: clientId },
    include: { shares: { where: { revokedAt: null }, select: { companyId: true } } },
  });
  if (!client) throw new AuthorisationError("Client not found.");
  const isOwner = client.referrerId === user.id;
  const isSharedWith = client.shares.some((share) => canActForCompany(user, share.companyId));
  if (!isOwner && !isSharedWith && !hasAdminPermission(user)) {
    throw new AuthorisationError("Client not found.");
  }
  return client;
}
