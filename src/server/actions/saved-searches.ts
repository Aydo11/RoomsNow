"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { describeSavedSearch } from "@/lib/saved-search-alerts";
import type { FormState } from "@/lib/validation";
import { list, num, text } from "../form";
import type { AlertFrequency, ReferralRoute } from "@prisma/client";

const MAX_SAVED_SEARCHES = 25;

/**
 * Saves the filters someone is currently viewing on /search as an alert.
 * Reads the same param names the search page itself uses (see SearchParams
 * in src/server/search.ts), passed through as hidden fields by
 * <SaveSearchForm>, so "save this search" always saves exactly what's on
 * screen.
 */
export async function createSavedSearchAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();

  const existingCount = await db.savedSearch.count({ where: { userId: user.id } });
  if (existingCount >= MAX_SAVED_SEARCHES) {
    return { ok: false, errors: { form: `You've reached the limit of ${MAX_SAVED_SEARCHES} saved alerts. Delete one to add another.` } };
  }

  const where = text(formData, "where").trim() || null;
  const support = list(formData, "support");
  const type = list(formData, "type");
  const gender = text(formData, "gender").trim() || null;
  const minAge = num(formData, "minAge");
  const wheelchair = text(formData, "wheelchair") === "1";
  const furnished = text(formData, "furnished") === "1";
  const ensuite = text(formData, "ensuite") === "1";
  const selfContained = text(formData, "selfContained") === "1";
  const petsAllowed = text(formData, "petsAllowed") === "1";
  const residentInput = text(formData, "resident");
  const resident = residentInput === "woman" || residentInput === "man" ? residentInput : null;
  const housingBenefit = text(formData, "hb") === "1";
  const referral = list(formData, "referral") as ReferralRoute[];
  const verifiedOnly = text(formData, "verified") === "1";
  const minRent = num(formData, "minRent");
  const maxRent = num(formData, "maxRent");
  const radius = num(formData, "radius");
  const frequency: AlertFrequency = text(formData, "frequency") === "DAILY" ? "DAILY" : "INSTANT";
  const labelInput = text(formData, "label").trim();
  const label = (labelInput || describeSavedSearch({ where, support, type, maxRent })).slice(0, 120);

  const saved = await db.savedSearch.create({
    data: {
      userId: user.id,
      label,
      where,
      radius: radius ?? null,
      support,
      type,
      gender,
      minAge: minAge ?? null,
      wheelchair,
      furnished,
      ensuite,
      selfContained,
      petsAllowed,
      resident,
      housingBenefit,
      referral,
      verifiedOnly,
      minRent: minRent ?? null,
      maxRent: maxRent ?? null,
      frequency,
    },
  });

  await audit({ actorId: user.id, action: "saved_search.created", targetType: "SavedSearch", targetId: saved.id });
  revalidatePath("/dashboard/alerts");
  revalidatePath("/search");

  return {
    ok: true,
    message:
      frequency === "INSTANT"
        ? `Saved. We'll email you the moment matching accommodation goes live.`
        : `Saved. We'll email you a daily roundup of matching accommodation.`,
  };
}

export async function deleteSavedSearchAction(id: string) {
  const user = await requireUser();
  await db.savedSearch.deleteMany({ where: { id, userId: user.id } });
  await audit({ actorId: user.id, action: "saved_search.deleted", targetType: "SavedSearch", targetId: id });
  revalidatePath("/dashboard/alerts");
}

export async function updateSavedSearchFrequencyAction(id: string, frequency: AlertFrequency) {
  const user = await requireUser();
  await db.savedSearch.updateMany({ where: { id, userId: user.id }, data: { frequency } });
  await audit({ actorId: user.id, action: "saved_search.frequency_changed", targetType: "SavedSearch", targetId: id, metadata: { frequency } });
  revalidatePath("/dashboard/alerts");
}
