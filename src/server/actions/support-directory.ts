"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notify";
import { geocode } from "@/lib/geo";
import { requireAdmin, requireUser } from "@/lib/rbac";
import { hasAdminPermission } from "@/lib/admin-permissions";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { fieldErrors, type FormState } from "@/lib/validation";
import { bool, list, text } from "../form";
import { isSupportAudience, isSupportCategory, SUPPORT_POST_KINDS } from "@/lib/support-directory";
import { uniqueSupportSlug } from "../support-directory";

const optional = (max: number) => z.string().trim().max(max).optional().transform((value) => value || null);
const url = z
  .string()
  .trim()
  .max(300)
  .optional()
  .transform((value) => (value ? (/^https?:\/\//i.test(value) ? value : `https://${value}`) : null))
  .refine((value) => !value || /^https?:\/\/[^\s.]+\.[^\s]+$/i.test(value), "Enter a valid web address.");

const organisationSchema = z.object({
  name: z.string().trim().min(3, "Enter your organisation's name.").max(120),
  summary: z.string().trim().min(10, "Add a one-line summary of how you help.").max(200),
  description: optional(4000),
  categories: z.array(z.string()).min(1, "Choose at least one type of support.").max(6),
  scope: z.enum(["NATIONAL", "LOCAL"]),
  areas: z.array(z.string().trim().min(2).max(60)).max(20),
  phone: optional(40),
  phoneNote: optional(120),
  otherPhones: z.array(z.string().trim().max(120)).max(6),
  textNumber: optional(80),
  email: z.string().trim().max(160).optional().transform((value) => value || null).refine((value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), "Enter a valid email address."),
  website: url,
  hours: optional(300),
  howToAccess: optional(600),
});

async function canManage(orgId: string) {
  const user = await requireUser("/support-services/manage");
  const organisation = await db.supportOrganisation.findUnique({ where: { id: orgId }, select: { id: true, ownerId: true, status: true, name: true, slug: true } });
  if (!organisation) throw new Error("Organisation not found.");
  const isAdmin = hasAdminPermission(user, "MODERATION");
  if (organisation.ownerId !== user.id && !isAdmin) throw new Error("You can only manage your own organisation.");
  return { user, organisation, isAdmin };
}

function manageHref(orgId: string, isAdmin: boolean, ownerIsViewer: boolean) {
  return isAdmin && !ownerIsViewer ? `/support-services/manage?org=${orgId}` : "/support-services/manage";
}

/** Creates the signed-in person's organisation, or updates one they (or an admin) manage. */
export async function saveSupportOrganisationAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser("/support-services/join");
  const orgId = text(formData, "orgId") || null;
  const parsed = organisationSchema.safeParse({
    name: text(formData, "name"),
    summary: text(formData, "summary"),
    description: text(formData, "description"),
    categories: list(formData, "categories").filter(isSupportCategory),
    scope: text(formData, "scope") === "NATIONAL" ? "NATIONAL" : "LOCAL",
    areas: text(formData, "areas").split(/[,\n]/).map((area) => area.trim()).filter(Boolean),
    phone: text(formData, "phone"),
    phoneNote: text(formData, "phoneNote"),
    otherPhones: text(formData, "otherPhones").split("\n").map((line) => line.trim()).filter(Boolean),
    textNumber: text(formData, "textNumber"),
    email: text(formData, "email"),
    website: text(formData, "website"),
    hours: text(formData, "hours"),
    howToAccess: text(formData, "howToAccess"),
  });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const data = parsed.data;
  const isAdmin = hasAdminPermission(user, "MODERATION");

  if (orgId) {
    const { organisation } = await canManage(orgId);
    await db.supportOrganisation.update({
      where: { id: orgId },
      data: {
        ...data,
        ...(isAdmin ? { crisis: bool(formData, "crisis") } : {}),
        slug: data.name !== organisation.name ? await uniqueSupportSlug(data.name, orgId) : undefined,
      },
    });
    await audit({ actorId: user.id, action: "support_org.updated", targetType: "SupportOrganisation", targetId: orgId });
    revalidatePath("/support-services");
    return { ok: true, message: "Saved." };
  }

  const limit = await rateLimit(`support-org:${user.id}`, LIMITS.feedback);
  if (!limit.ok) return { ok: false, errors: { form: "Too many attempts. Try again later." } };
  // Admins can add organisations for others (they go live straight away);
  // everyone else can run one listing, checked by our team first.
  if (!isAdmin && (await db.supportOrganisation.findUnique({ where: { ownerId: user.id }, select: { id: true } }))) {
    redirect("/support-services/manage");
  }
  const created = await db.supportOrganisation.create({
    data: {
      ...data,
      slug: await uniqueSupportSlug(data.name),
      ownerId: isAdmin ? null : user.id,
      status: isAdmin ? "APPROVED" : "PENDING",
      verifiedAt: isAdmin ? new Date() : null,
    },
  });
  await audit({ actorId: user.id, action: "support_org.created", targetType: "SupportOrganisation", targetId: created.id });
  redirect(isAdmin ? `/support-services/manage?org=${created.id}` : "/support-services/manage?created=1");
}

const locationSchema = z.object({
  name: z.string().trim().min(2, "Give this location a name, e.g. City Centre hub.").max(100),
  address: z.string().trim().min(3, "Enter the street address.").max(200),
  city: z.string().trim().min(2, "Enter the town or city.").max(80),
  postcode: z.string().trim().toUpperCase().regex(/^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/, "Enter a full UK postcode."),
  hours: optional(200),
  phone: optional(40),
});

export async function addSupportLocationAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const orgId = text(formData, "orgId");
  const { user, organisation, isAdmin } = await canManage(orgId);
  const parsed = locationSchema.safeParse({
    name: text(formData, "name"),
    address: text(formData, "address"),
    city: text(formData, "city"),
    postcode: text(formData, "postcode"),
    hours: text(formData, "hours"),
    phone: text(formData, "phone"),
  });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const count = await db.supportLocation.count({ where: { organisationId: orgId } });
  if (count >= 25) return { ok: false, errors: { form: "You can add up to 25 locations." } };
  const point = await geocode({ postcode: parsed.data.postcode, city: parsed.data.city });
  await db.supportLocation.create({ data: { ...parsed.data, organisationId: orgId, latitude: point?.latitude ?? null, longitude: point?.longitude ?? null } });
  await audit({ actorId: user.id, action: "support_org.location_added", targetType: "SupportOrganisation", targetId: orgId });
  revalidatePath(`/support-services/${organisation.slug}`);
  revalidatePath("/support-services/manage");
  return { ok: true, message: "Location added.", redirect: manageHref(orgId, isAdmin, organisation.ownerId === user.id) };
}

export async function removeSupportLocationAction(formData: FormData) {
  const location = await db.supportLocation.findUnique({ where: { id: text(formData, "locationId") }, select: { id: true, organisationId: true } });
  if (!location) return;
  const { organisation } = await canManage(location.organisationId);
  await db.supportLocation.delete({ where: { id: location.id } });
  revalidatePath(`/support-services/${organisation.slug}`);
  revalidatePath("/support-services/manage");
}

const postSchema = z.object({
  kind: z.enum(Object.keys(SUPPORT_POST_KINDS) as [keyof typeof SUPPORT_POST_KINDS, ...Array<keyof typeof SUPPORT_POST_KINDS>]),
  title: z.string().trim().min(5, "Give it a clear title, e.g. Free drug awareness training.").max(140),
  body: z.string().trim().min(20, "Add a few lines about what it is and who it's for.").max(4000),
  audience: z.string().refine(isSupportAudience),
  startsAt: z.string().optional().transform((value) => (value ? new Date(value) : null)),
  endsAt: z.string().optional().transform((value) => (value ? new Date(value) : null)),
  venue: optional(200),
  bookingUrl: url,
});

export async function createSupportPostAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const orgId = text(formData, "orgId");
  const { user, organisation, isAdmin } = await canManage(orgId);
  const parsed = postSchema.safeParse({
    kind: text(formData, "kind"),
    title: text(formData, "title"),
    body: text(formData, "body"),
    audience: text(formData, "audience") || "everyone",
    startsAt: text(formData, "startsAt"),
    endsAt: text(formData, "endsAt"),
    venue: text(formData, "venue"),
    bookingUrl: text(formData, "bookingUrl"),
  });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const data = parsed.data;
  if (data.startsAt && Number.isNaN(data.startsAt.getTime())) return { ok: false, errors: { startsAt: "Enter a valid date and time." } };
  if (data.endsAt && data.startsAt && data.endsAt < data.startsAt) return { ok: false, errors: { endsAt: "The end must be after the start." } };
  const limit = await rateLimit(`support-post:${user.id}`, LIMITS.request);
  if (!limit.ok) return { ok: false, errors: { form: "You've posted a lot recently. Try again later." } };
  await db.supportPost.create({ data: { ...data, free: bool(formData, "free"), organisationId: orgId, createdById: user.id } });
  await audit({ actorId: user.id, action: "support_org.post_created", targetType: "SupportOrganisation", targetId: orgId, metadata: { kind: data.kind } });
  revalidatePath("/support-services");
  revalidatePath(`/support-services/${organisation.slug}`);
  return {
    ok: true,
    message: organisation.status === "APPROVED" ? "Posted. It's now showing in the directory." : "Saved. It will show once your organisation is approved.",
    redirect: manageHref(orgId, isAdmin, organisation.ownerId === user.id),
  };
}

export async function removeSupportPostAction(formData: FormData) {
  const post = await db.supportPost.findUnique({ where: { id: text(formData, "postId") }, select: { id: true, organisationId: true } });
  if (!post) return;
  const { user, organisation } = await canManage(post.organisationId);
  await db.supportPost.update({ where: { id: post.id }, data: { removedAt: new Date() } });
  await audit({ actorId: user.id, action: "support_org.post_removed", targetType: "SupportPost", targetId: post.id });
  revalidatePath("/support-services");
  revalidatePath(`/support-services/${organisation.slug}`);
  revalidatePath("/support-services/manage");
}

/** Admin: approve, reject or suspend an organisation. */
export async function setSupportOrganisationStatusAction(formData: FormData) {
  const admin = await requireAdmin("MODERATION");
  const orgId = text(formData, "orgId");
  const status = text(formData, "status");
  if (!["APPROVED", "REJECTED", "SUSPENDED", "PENDING"].includes(status)) return;
  const reason = text(formData, "reason").trim().slice(0, 500) || null;
  const organisation = await db.supportOrganisation.update({
    where: { id: orgId },
    data: {
      status: status as "APPROVED" | "REJECTED" | "SUSPENDED" | "PENDING",
      statusReason: status === "APPROVED" ? null : reason,
      verifiedAt: status === "APPROVED" ? new Date() : undefined,
    },
    select: { id: true, name: true, slug: true, ownerId: true },
  });
  await audit({ actorId: admin.id, action: `support_org.${status.toLowerCase()}`, targetType: "SupportOrganisation", targetId: orgId, metadata: { reason } });
  if (organisation.ownerId && status !== "PENDING") {
    await notify({
      userId: organisation.ownerId,
      type: "SYSTEM",
      title: status === "APPROVED" ? `${organisation.name} is now live in Support services` : `Update on your Support services listing`,
      body: status === "APPROVED" ? "People and providers can now find you, and your posts are showing." : reason ?? "Our team has reviewed your listing.",
      href: "/support-services/manage",
      email: true,
    });
  }
  revalidatePath("/admin/support-services");
  revalidatePath("/support-services");
}
