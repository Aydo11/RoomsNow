"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { storage, validateUpload, verifyFileContents } from "@/lib/storage";
import { fieldErrors, profileSchema, socialLinksSchema, type FormState } from "@/lib/validation";
import { bool, date, list, socialLinks, text } from "../form";
import type { AccommodationType } from "@prisma/client";

export async function updateProfileAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();

  const parsedSocial = socialLinksSchema.safeParse(socialLinks(formData));
  if (!parsedSocial.success) return { ok: false, errors: { socialUrl: "Enter valid links, including https://." } };

  const parsed = profileSchema.safeParse({
    about: text(formData, "about"),
    accommodationNeeds: text(formData, "accommodationNeeds"),
    supportNeeds: text(formData, "supportNeeds"),
    accessibilityNeeds: text(formData, "accessibilityNeeds"),
    otherRequirements: text(formData, "otherRequirements"),
    preferredLocations: text(formData, "preferredLocations")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    preferredTypes: list(formData, "preferredTypes"),
    supportTypes: list(formData, "supportTypes"),
    genderArrangement: text(formData, "genderArrangement") || "ANY",
    dateOfBirth: text(formData, "dateOfBirth"),
    availableFrom: text(formData, "availableFrom"),
    publicProfile: bool(formData, "publicProfile"),
    showPhoto: bool(formData, "showPhoto"),
    showAge: bool(formData, "showAge"),
    showLocation: bool(formData, "showLocation"),
    discoverable: bool(formData, "discoverable"),
  });

  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const d = parsed.data;

  let photoUrl: string | undefined;
  const photo = formData.get("photo");
  if (photo instanceof File && photo.size > 0) {
    const invalid = validateUpload(photo, "image");
    if (invalid) return { ok: false, errors: { photo: invalid } };
    const mismatch = await verifyFileContents(photo, Buffer.from(await photo.arrayBuffer()));
    if (mismatch) return { ok: false, errors: { photo: mismatch } };
    photoUrl = (await storage.put(photo, `profiles/${user.id}`)).url;
  }

  const values = {
    about: d.about || null,
    accommodationNeeds: d.accommodationNeeds || null,
    supportNeeds: d.supportNeeds || null,
    accessibilityNeeds: d.accessibilityNeeds || null,
    otherRequirements: d.otherRequirements || null,
    preferredLocations: d.preferredLocations,
    preferredTypes: d.preferredTypes as AccommodationType[],
    supportTypes: d.supportTypes,
    genderArrangement: d.genderArrangement,
    dateOfBirth: date(d.dateOfBirth),
    availableFrom: date(d.availableFrom),
    publicProfile: d.publicProfile,
    showPhoto: d.showPhoto,
    showAge: d.showAge,
    showLocation: d.showLocation,
    discoverable: d.discoverable,
    socialLinks: parsedSocial.data,
    ...(photoUrl ? { photoUrl } : {}),
  };

  await db.userProfile.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...values },
    update: values,
  });

  const firstName = text(formData, "firstName");
  const lastName = text(formData, "lastName");
  const locationLabel = text(formData, "locationLabel");
  if (firstName && lastName) {
    await db.user.update({
      where: { id: user.id },
      data: { firstName, lastName, locationLabel: locationLabel || null },
    });
  }

  await audit({ actorId: user.id, action: "profile.updated", targetType: "UserProfile", targetId: user.id });
  revalidatePath("/dashboard/profile");
  revalidatePath("/people/[id]", "page");
  revalidatePath("/people");
  return { ok: true, message: "Profile saved." };
}

export async function deleteAccountAction(): Promise<FormState> {
  const user = await requireUser();

  // Soft delete: personal fields are cleared, the row is kept for 30 days so
  // audit trails and provider records stay coherent, then purged by a job.
  await db.$transaction([
    db.user.update({
      where: { id: user.id },
      data: {
        status: "DELETED",
        deletedAt: new Date(),
        tokenVersion: { increment: 1 },
        retainUntil: new Date(Date.now() + 30 * 24 * 3600 * 1000),
        firstName: "Deleted",
        lastName: "account",
        phone: null,
        locationLabel: null,
        email: `deleted-${user.id}@invalid`,
      },
    }),
    db.userProfile.deleteMany({ where: { userId: user.id } }),
    db.lookingForAd.updateMany({ where: { userId: user.id }, data: { status: "ARCHIVED" } }),
  ]);

  await audit({ actorId: user.id, action: "account.deleted", targetType: "User", targetId: user.id });
  return { ok: true, message: "Account deleted.", redirect: "/" };
}

/** GDPR data export: everything we hold about the signed-in person, as JSON. */
export async function exportMyDataAction() {
  const user = await requireUser();
  const [profile, ads, requests, saves, notifications, messages] = await Promise.all([
    db.userProfile.findUnique({ where: { userId: user.id } }),
    db.lookingForAd.findMany({ where: { userId: user.id } }),
    db.accommodationRequest.findMany({ where: { applicantId: user.id } }),
    db.savedListing.findMany({ where: { userId: user.id }, include: { listing: { select: { title: true, reference: true } } } }),
    db.notification.findMany({ where: { userId: user.id } }),
    db.message.findMany({ where: { senderId: user.id }, select: { body: true, createdAt: true, conversationId: true } }),
  ]);

  await audit({ actorId: user.id, action: "data.exported", targetType: "User", targetId: user.id });

  return {
    exportedAt: new Date().toISOString(),
    account: {
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      role: user.role,
      createdAt: user.createdAt,
    },
    profile,
    lookingForAds: ads,
    accommodationRequests: requests,
    savedListings: saves,
    notifications,
    messages,
  };
}
