"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { storage, validateUpload, verifyFileContents } from "@/lib/storage";
import { fieldErrors, lookingForSchema, type FormState } from "@/lib/validation";
import { date, list, num, pence, text } from "../form";
import type { AccommodationType } from "@prisma/client";

export async function saveLookingForAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser("/dashboard/advert");
  if (user.role === "SERVICE_PROVIDER") return { ok: false, errors: { form: "Service business accounts can't post accommodation adverts." } };
  const id = text(formData, "id");

  const parsed = lookingForSchema.safeParse({
    title: text(formData, "title"),
    city: text(formData, "city"),
    postcode: text(formData, "postcode"),
    radiusMiles: num(formData, "radiusMiles") ?? 10,
    accommodationTypes: list(formData, "accommodationTypes"),
    supportTypes: list(formData, "supportTypes"),
    moveInDate: text(formData, "moveInDate"),
    budgetWeekly: num(formData, "budgetWeekly"),
    genderArrangement: text(formData, "genderArrangement") || "ANY",
    age: num(formData, "age"),
    accessibilityNeeds: text(formData, "accessibilityNeeds"),
    about: text(formData, "about"),
    lookingFor: text(formData, "lookingFor"),
    videoUrl: text(formData, "videoUrl"),
  });

  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const d = parsed.data;

  let photoUrl: string | undefined;
  const photo = formData.get("photo");
  if (photo instanceof File && photo.size > 0) {
    const mismatch = await verifyFileContents(photo, Buffer.from(await photo.arrayBuffer()));
    if (mismatch) return { ok: false, errors: { photo: mismatch } };
    const invalid = validateUpload(photo, "image");
    if (invalid) return { ok: false, errors: { photo: invalid } };
    photoUrl = (await storage.put(photo, `looking-for/${user.id}`)).url;
  }

  const values = {
    title: d.title,
    city: d.city,
    postcode: d.postcode || null,
    radiusMiles: d.radiusMiles,
    accommodationTypes: d.accommodationTypes as AccommodationType[],
    supportTypes: d.supportTypes,
    moveInDate: date(d.moveInDate),
    budgetWeekly: pence(d.budgetWeekly) ?? null,
    genderArrangement: d.genderArrangement,
    age: d.age ?? null,
    accessibilityNeeds: d.accessibilityNeeds || null,
    about: d.about || null,
    lookingFor: d.lookingFor || null,
    videoUrl: d.videoUrl || null,
    ...(photoUrl ? { photoUrl } : {}),
  };

  if (id) {
    const owned = await db.lookingForAd.findFirst({ where: { id, userId: user.id }, select: { id: true } });
    if (!owned) return { ok: false, errors: { form: "That advert isn't yours to edit." } };
  }

  const ad = id
    ? await db.lookingForAd.update({ where: { id }, data: values })
    : await db.lookingForAd.create({ data: { ...values, userId: user.id } });

  await audit({ actorId: user.id, action: id ? "looking_for.updated" : "looking_for.created", targetType: "LookingForAd", targetId: ad.id });
  revalidatePath("/dashboard/advert");
  redirect(`/people/${ad.id}`);
}

export async function setLookingForStatusAction(id: string, status: "ACTIVE" | "PAUSED" | "ARCHIVED") {
  const user = await requireUser();
  const ad = await db.lookingForAd.findFirst({ where: { id, userId: user.id } });
  if (!ad) return;
  await db.lookingForAd.update({ where: { id }, data: { status } });
  revalidatePath("/dashboard/advert");
}
