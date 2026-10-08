import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { notify } from "./notify";

/**
 * The WhatsApp enquiry log: filters shared by the admin page and its CSV
 * download, the lookup that turns ids into names, and the alert sent to
 * RoomsNow admins each time someone uses the button.
 */

export type WhatsappLogFilters = { provider?: string; from?: string; to?: string; who?: string };

function dateBoundary(value: string | undefined, end = false) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(`${value}T${end ? "23:59:59.999" : "00:00:00.000"}Z`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export async function whatsappLogWhere(filters: WhatsappLogFilters): Promise<Prisma.WhatsappClickWhereInput> {
  const provider = filters.provider?.trim().slice(0, 100);
  const from = dateBoundary(filters.from);
  const to = dateBoundary(filters.to, true);
  const companyIds = provider
    ? (await db.company.findMany({ where: { name: { contains: provider, mode: "insensitive" } }, select: { id: true } })).map((c) => c.id)
    : undefined;
  return {
    ...(companyIds ? { companyId: { in: companyIds } } : {}),
    ...(from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
    ...(filters.who === "signed-in" ? { signedIn: true } : filters.who === "signed-out" ? { signedIn: false } : {}),
  };
}

export type WhatsappLogRow = {
  id: string;
  createdAt: Date;
  listingId: string;
  advert: string;
  provider: string;
  personName: string | null;
  personEmail: string | null;
  personPhone: string | null;
  signedIn: boolean;
};

/** Adds advert titles, provider names and the person's contact details to raw clicks. */
export async function whatsappLogRows(clicks: Array<{ id: string; createdAt: Date; listingId: string; companyId: string; userId: string | null; signedIn: boolean }>): Promise<WhatsappLogRow[]> {
  const [listings, companies, users] = await Promise.all([
    db.listing.findMany({ where: { id: { in: [...new Set(clicks.map((c) => c.listingId))] } }, select: { id: true, title: true } }),
    db.company.findMany({ where: { id: { in: [...new Set(clicks.map((c) => c.companyId))] } }, select: { id: true, name: true } }),
    db.user.findMany({
      where: { id: { in: [...new Set(clicks.flatMap((c) => (c.userId ? [c.userId] : [])))] } },
      select: { id: true, firstName: true, lastName: true, email: true, phone: true },
    }),
  ]);
  const title = new Map(listings.map((l) => [l.id, l.title]));
  const company = new Map(companies.map((c) => [c.id, c.name]));
  const person = new Map(users.map((u) => [u.id, u]));
  return clicks.map((click) => {
    const who = click.userId ? person.get(click.userId) : undefined;
    return {
      id: click.id,
      createdAt: click.createdAt,
      listingId: click.listingId,
      advert: title.get(click.listingId) ?? "Removed advert",
      provider: company.get(click.companyId) ?? "Removed provider",
      personName: who ? `${who.firstName} ${who.lastName}`.trim() : null,
      personEmail: who?.email ?? null,
      personPhone: who?.phone ?? null,
      signedIn: click.signedIn,
    };
  });
}

/**
 * Tells every full RoomsNow admin, in their notifications and as a phone
 * alert if they have those switched on. Not emailed, so a busy day does not
 * flood the inbox. Never throws.
 */
export async function alertAdminsOfWhatsappClick(input: { listingTitle: string; providerName: string; userId: string | null }) {
  try {
    const [admins, who] = await Promise.all([
      db.user.findMany({ where: { role: "ADMIN", status: "ACTIVE", deletedAt: null, adminPermissions: { has: "ALL" } }, select: { id: true } }),
      input.userId ? db.user.findUnique({ where: { id: input.userId }, select: { firstName: true, lastName: true } }) : null,
    ]);
    const name = who ? `${who.firstName} ${who.lastName}`.trim() : "Someone not signed in (sent to sign up)";
    await Promise.all(
      admins.map((admin) =>
        notify({
          userId: admin.id,
          type: "SYSTEM",
          title: `WhatsApp enquiry · ${input.providerName}`,
          body: `${name} pressed WhatsApp on "${input.listingTitle}".`,
          href: "/admin/whatsapp-clicks",
        }),
      ),
    );
  } catch (error) {
    console.error("[whatsapp-click] admin alert failed", error);
  }
}
