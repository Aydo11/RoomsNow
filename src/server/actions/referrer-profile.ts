"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireReferrer } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { storage, validateUpload, verifyFileContents } from "@/lib/storage";
import { fieldErrors, referrerProfileSchema, socialLinksSchema, type FormState } from "@/lib/validation";
import { socialLinks, text } from "../form";

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

  const parsedSocial = socialLinksSchema.safeParse(socialLinks(formData));
  if (!parsedSocial.success) return { ok: false, errors: { socialUrl: "Enter valid links, including https://." } };

  let avatarUrl: string | undefined;
  const avatar = formData.get("avatar");
  if (avatar instanceof File && avatar.size > 0) {
    const invalid = validateUpload(avatar, "image");
    if (invalid) return { ok: false, errors: { avatar: invalid } };
    const mismatch = await verifyFileContents(avatar, Buffer.from(await avatar.arrayBuffer()));
    if (mismatch) return { ok: false, errors: { avatar: mismatch } };
    avatarUrl = (await storage.put(avatar, `profiles/${user.id}`)).url;
  }

  await db.user.update({
    where: { id: user.id },
    data: {
      firstName: d.firstName,
      lastName: d.lastName,
      phone: d.phone || null,
      locationLabel: d.locationLabel || null,
      organisation: d.organisation || null,
      jobTitle: d.jobTitle || null,
      socialLinks: parsedSocial.data,
      ...(avatarUrl ? { avatarUrl } : {}),
    },
  });

  await audit({ actorId: user.id, action: "profile.updated", targetType: "User", targetId: user.id });
  revalidatePath("/referrals/profile");
  return { ok: true, message: "Profile saved." };
}
