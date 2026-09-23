"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireReferrer } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { storage, validateUpload, verifyFileContents } from "@/lib/storage";
import { SUPPORT_TYPES } from "@/lib/taxonomy";
import { AGENCY_TYPES } from "@/lib/agency";
import { fieldErrors, referrerProfileSchema, socialLinksSchema, type FormState } from "@/lib/validation";
import { list, socialLinks, text } from "../form";

const optional = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));

const agencySchema = z.object({
  agencyType: z.enum(Object.keys(AGENCY_TYPES) as [string, ...string[]]).optional().or(z.literal("")),
  about: optional(2000),
  website: z
    .string()
    .trim()
    .max(300)
    .refine((v) => !v || /^https?:\/\/[^\s.]+\.[^\s]+$/i.test(v), "Enter a full web address, starting https://")
    .optional()
    .or(z.literal("")),
  publicEmail: z.string().trim().email("Enter a valid email.").max(200).optional().or(z.literal("")),
  publicPhone: optional(30),
  areasCovered: z.array(z.string().trim().min(1).max(60)).max(20, "Add up to 20 areas."),
  specialisms: z.array(z.enum(SUPPORT_TYPES.map((t) => t.slug) as [string, ...string[]])).max(SUPPORT_TYPES.length),
});

async function storeImage(file: File, folder: string): Promise<{ error: string; url?: undefined } | { error?: undefined; url: string }> {
  const invalid = validateUpload(file, "image");
  if (invalid) return { error: invalid };
  const mismatch = await verifyFileContents(file, Buffer.from(await file.arrayBuffer()));
  if (mismatch) return { error: mismatch };
  return { url: (await storage.put(file, folder)).url };
}

export async function updateReferrerProfileAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireReferrer();

  const parsed = referrerProfileSchema.safeParse({
    firstName: text(formData, "firstName"),
    lastName: text(formData, "lastName"),
    phone: text(formData, "phone"),
    locationLabel: text(formData, "locationLabel"),
    organisation: text(formData, "organisation"),
    jobTitle: text(formData, "jobTitle"),
  });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const d = parsed.data;

  const agency = agencySchema.safeParse({
    agencyType: text(formData, "agencyType"),
    about: text(formData, "about"),
    website: text(formData, "website"),
    publicEmail: text(formData, "publicEmail"),
    publicPhone: text(formData, "publicPhone"),
    areasCovered: Array.from(
      new Set(
        text(formData, "areasCovered")
          .split(/[,;\n]/)
          .map((area) => area.trim())
          .filter(Boolean),
      ),
    ),
    specialisms: list(formData, "specialisms"),
  });
  if (!agency.success) return { ok: false, errors: fieldErrors(agency.error) };
  const a = agency.data;

  const parsedSocial = socialLinksSchema.safeParse(socialLinks(formData));
  if (!parsedSocial.success) return { ok: false, errors: { socialUrl: "Enter valid links, including https://." } };

  const uploads: Record<"avatar" | "banner" | "logo", string | undefined> = { avatar: undefined, banner: undefined, logo: undefined };
  for (const field of ["avatar", "banner", "logo"] as const) {
    const file = formData.get(field);
    if (file instanceof File && file.size > 0) {
      const stored = await storeImage(file, field === "avatar" ? `profiles/${user.id}` : `agencies/${user.id}`);
      if (stored.error !== undefined) return { ok: false, errors: { [field]: stored.error, form: stored.error } };
      uploads[field] = stored.url;
    }
  }

  const agencyValues = {
    agencyType: a.agencyType || null,
    about: a.about || null,
    website: a.website || null,
    publicEmail: a.publicEmail || null,
    publicPhone: a.publicPhone || null,
    areasCovered: a.areasCovered,
    specialisms: a.specialisms,
    ...(uploads.banner ? { bannerUrl: uploads.banner } : {}),
    ...(uploads.logo ? { logoUrl: uploads.logo } : {}),
  };

  await db.$transaction([
    db.user.update({
      where: { id: user.id },
      data: {
        firstName: d.firstName,
        lastName: d.lastName,
        phone: d.phone || null,
        locationLabel: d.locationLabel || null,
        organisation: d.organisation || null,
        jobTitle: d.jobTitle || null,
        socialLinks: parsedSocial.data,
        ...(uploads.avatar ? { avatarUrl: uploads.avatar } : {}),
      },
    }),
    db.referrerProfile.upsert({
      where: { userId: user.id },
      create: { userId: user.id, ...agencyValues },
      update: agencyValues,
    }),
  ]);

  await audit({ actorId: user.id, action: "profile.updated", targetType: "User", targetId: user.id });
  revalidatePath("/referrals/profile");
  revalidatePath(`/agencies/${user.id}`);
  return { ok: true, message: "Profile saved." };
}
