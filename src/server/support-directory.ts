import "server-only";
import { db } from "@/lib/db";
import { geocode } from "@/lib/geo";
import { requireUser } from "@/lib/rbac";
import { hasAdminPermission } from "@/lib/admin-permissions";
import { SUPPORT_SEED, postIsCurrent, slugify, type SupportCategory } from "@/lib/support-directory";
import type { Prisma } from "@prisma/client";

let seeded: Promise<void> | null = null;

/**
 * Adds any starting services that aren't in the database yet. Existing
 * records are never overwritten, so admin edits stick. Runs once per server
 * process, the first time the directory is opened.
 */
export function ensureSupportSeed() {
  seeded ??= (async () => {
    const existing = new Set(
      (await db.supportOrganisation.findMany({ where: { seedKey: { not: null } }, select: { seedKey: true } })).map((row) => row.seedKey),
    );
    for (const seed of SUPPORT_SEED) {
      if (existing.has(seed.seedKey)) continue;
      const { locations, seedKey, ...data } = seed;
      await db.supportOrganisation.create({
        data: {
          ...data,
          seedKey,
          slug: await uniqueSupportSlug(seed.name),
          status: "APPROVED",
          verifiedAt: new Date(),
          locations: locations?.length ? { create: locations } : undefined,
        },
      });
    }
  })().catch((error) => {
    seeded = null;
    console.error("[support-directory] seeding failed", error instanceof Error ? error.message : error);
  });
  // Coordinates are filled in the background so the page never waits on it.
  void seeded.then(() => geocodeMissingLocations()).catch(() => undefined);
  return seeded;
}

let geocoding = false;
export async function geocodeMissingLocations(limit = 15) {
  if (geocoding) return;
  geocoding = true;
  try {
    const missing = await db.supportLocation.findMany({ where: { latitude: null }, take: limit, select: { id: true, postcode: true, city: true } });
    for (const location of missing) {
      const point = await geocode({ postcode: location.postcode, city: location.city });
      if (point) await db.supportLocation.update({ where: { id: location.id }, data: { latitude: point.latitude, longitude: point.longitude } });
    }
  } finally {
    geocoding = false;
  }
}

export async function uniqueSupportSlug(name: string, ignoreId?: string) {
  const base = slugify(name) || "support-service";
  let slug = base;
  for (let n = 2; n < 50; n++) {
    const clash = await db.supportOrganisation.findUnique({ where: { slug }, select: { id: true } });
    if (!clash || clash.id === ignoreId) return slug;
    slug = `${base}-${n}`;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export type DirectoryFilters = { q?: string; category?: SupportCategory; area?: string };

const orgInclude = {
  locations: { orderBy: { createdAt: "asc" } },
  posts: { where: { removedAt: null }, orderBy: [{ startsAt: "asc" }, { createdAt: "desc" }] },
} satisfies Prisma.SupportOrganisationInclude;

export type DirectoryOrganisation = Prisma.SupportOrganisationGetPayload<{ include: typeof orgInclude }>;

/** Approved organisations matching the filters: crisis lines first, then local, then national. */
export async function loadDirectory(filters: DirectoryFilters) {
  await ensureSupportSeed();
  const where: Prisma.SupportOrganisationWhereInput = { status: "APPROVED" };
  const and: Prisma.SupportOrganisationWhereInput[] = [];
  if (filters.category) and.push({ categories: { has: filters.category } });
  if (filters.q) {
    const q = filters.q.trim();
    and.push({ OR: [
      { name: { contains: q, mode: "insensitive" } },
      { summary: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ] });
  }
  if (filters.area) {
    const area = filters.area.trim();
    // National services help everywhere, so they always stay in.
    and.push({ OR: [
      { scope: "NATIONAL" },
      { areas: { has: area } },
      { areas: { hasSome: [area, titleCase(area)] } },
      { locations: { some: { OR: [{ city: { contains: area, mode: "insensitive" } }, { postcode: { startsWith: area.toUpperCase() } }] } } },
    ] });
  }
  if (and.length) where.AND = and;
  const organisations = await db.supportOrganisation.findMany({ where, include: orgInclude, orderBy: { name: "asc" } });
  const now = new Date();
  for (const org of organisations) org.posts = org.posts.filter((post) => postIsCurrent(post, now));
  organisations.sort((a, b) => Number(b.crisis) - Number(a.crisis) || (a.scope === b.scope ? 0 : a.scope === "LOCAL" ? -1 : 1) || a.name.localeCompare(b.name));
  return organisations;
}

/** Upcoming events, training and news from approved organisations. */
export async function loadSupportPosts(options: { audience?: string; take?: number } = {}) {
  await ensureSupportSeed();
  const posts = await db.supportPost.findMany({
    where: {
      removedAt: null,
      organisation: { status: "APPROVED" },
      ...(options.audience && options.audience !== "everyone" ? { audience: { in: [options.audience, "everyone"] } } : {}),
    },
    include: { organisation: { select: { name: true, slug: true } } },
    orderBy: [{ startsAt: "asc" }, { createdAt: "desc" }],
    take: 200,
  });
  const now = new Date();
  return posts.filter((post) => postIsCurrent(post, now)).slice(0, options.take ?? 50);
}

function titleCase(text: string) {
  return text.toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

/**
 * The organisation the signed-in person runs. Admins can open any
 * organisation's management page with ?org=<id>.
 */
export async function requireSupportOrganisation(orgId?: string) {
  const user = await requireUser("/support-services/manage");
  const isAdmin = hasAdminPermission(user, "MODERATION");
  const organisation = orgId && isAdmin
    ? await db.supportOrganisation.findUnique({ where: { id: orgId }, include: orgInclude })
    : await db.supportOrganisation.findUnique({ where: { ownerId: user.id }, include: orgInclude });
  return { user, isAdmin, organisation };
}
