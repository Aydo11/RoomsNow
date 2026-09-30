import type { Prisma } from "@prisma/client";

export type SeekerAudience = "ALL" | "RECENT" | "NO_ADVERT";

/** Everyone registered as looking for a room, with a confirmed email address, narrowed by audience. */
export function seekerAudienceWhere(audience: SeekerAudience, now = new Date()): Prisma.UserWhereInput {
  const base: Prisma.UserWhereInput = { role: "USER", status: "ACTIVE", deletedAt: null, emailVerified: { not: null } };
  if (audience === "RECENT") return { ...base, createdAt: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) } };
  if (audience === "NO_ADVERT") return { ...base, lookingForAds: { none: {} } };
  return base;
}
