"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { assertCompanyAccess, requireCompany, requireUser } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { planLimits } from "@/lib/billing";
import { storage, validateUpload, verifyFileContents } from "@/lib/storage";
import { sanitiseHtml } from "@/lib/sanitise";
import { notifyCompany } from "@/lib/notify";
import { notifyInstantSavedSearches } from "@/lib/saved-search-alerts";
import { syncListingAvailability } from "@/lib/listing-availability";
import { geocode } from "@/lib/geo";
import { qualifyProviderReferral } from "@/lib/referral-program";
import { fieldErrors, listingSchema, type FormState } from "@/lib/validation";
import { bool, date, list, num, pence, reference, text } from "../form";
import type { Prisma, ReferralRoute, RoomStatus } from "@prisma/client";

export async function saveListingAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { user, companyId } = await requireCompany();
  const id = text(formData, "id");

  // Captured once, up front, so it doubles as the payload for validation AND
  // as `values` on any rejected FormState below — React resets every
  // uncontrolled field in AdvertForm back to blank the instant this action is
  // submitted (see the comment on FormState.values), so every early-return
  // here must hand the submitted data back or the person's typing is lost.
  const raw = {
    propertyName: text(formData, "propertyName"),
    city: text(formData, "city"),
    area: text(formData, "area"),
    postcode: text(formData, "postcode"),
    addressLine1: text(formData, "addressLine1"),
    showExactAddress: bool(formData, "showExactAddress"),
    title: text(formData, "title"),
    summary: text(formData, "summary"),
    accommodationType: text(formData, "accommodationType") || "SHARED_ACCOMMODATION",
    bedrooms: num(formData, "bedrooms") ?? 1,
    roomCount: num(formData, "roomCount") ?? 1,
    ensuite: bool(formData, "ensuite"),
    furnished: bool(formData, "furnished"),
    selfContained: bool(formData, "selfContained"),
    sharedFacilities: bool(formData, "sharedFacilities"),
    wheelchairAccess: bool(formData, "wheelchairAccess"),
    accessibilityNotes: text(formData, "accessibilityNotes"),
    petsAllowed: bool(formData, "petsAllowed"),
    weeklyRentFrom: num(formData, "weeklyRentFrom"),
    weeklyRentTo: num(formData, "weeklyRentTo"),
    billsIncluded: bool(formData, "billsIncluded"),
    housingBenefit: bool(formData, "housingBenefit"),
    availableFrom: text(formData, "availableFrom"),
    genderArrangement: text(formData, "genderArrangement") || "ANY",
    minAge: num(formData, "minAge"),
    maxAge: num(formData, "maxAge"),
    supportTypes: list(formData, "supportTypes"),
    supportDescription: text(formData, "supportDescription"),
    supportAvailability: text(formData, "supportAvailability"),
    supportProvider: text(formData, "supportProvider"),
    referralRoutes: list(formData, "referralRoutes"),
    eligibility: text(formData, "eligibility"),
    referralProcess: text(formData, "referralProcess"),
    houseRules: text(formData, "houseRules"),
    description: text(formData, "description"),
  };

  const parsed = listingSchema.safeParse(raw);

  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error), values: raw };
  const d = parsed.data;

  if (!id) {
    const limits = await planLimits(companyId);
    if (!limits.canAddListing) {
      return {
        ok: false,
        values: raw,
        errors: {
          form: `Your ${limits.membership.name} plan covers ${limits.membership.maxListings} live adverts. Upgrade to post more.`,
        },
      };
    }
  }

  const listingFields = {
    title: d.title,
    summary: d.summary || null,
    description: d.description ? sanitiseHtml(d.description) : null,
    accommodationType: d.accommodationType,
    genderArrangement: d.genderArrangement,
    minAge: d.minAge ?? null,
    maxAge: d.maxAge ?? null,
    ensuite: d.ensuite,
    furnished: d.furnished,
    selfContained: d.selfContained,
    sharedFacilities: d.sharedFacilities,
    wheelchairAccess: d.wheelchairAccess,
    accessibilityNotes: d.accessibilityNotes || null,
    petsAllowed: d.petsAllowed,
    supportTypes: d.supportTypes,
    supportDescription: d.supportDescription || null,
    supportAvailability: d.supportAvailability || null,
    supportProvider: d.supportProvider || null,
    referralRoutes: d.referralRoutes as ReferralRoute[],
    eligibility: d.eligibility || null,
    referralProcess: d.referralProcess || null,
    houseRules: d.houseRules || null,
    weeklyRentFrom: pence(d.weeklyRentFrom) ?? null,
    weeklyRentTo: pence(d.weeklyRentTo) ?? null,
    billsIncluded: d.billsIncluded,
    housingBenefit: d.housingBenefit,
    availableFrom: date(d.availableFrom),
    // Saving the form — new or edited — is itself confirmation the advert is
    // accurate, so it resets the staleness clock (see listing-availability.ts).
    availabilityConfirmedAt: new Date(),
    pausedReason: null,
  };

  // Coordinates come from the postcode, so every advert can appear on the map
  // without the provider doing anything. Falls back to the outward code, then
  // the town, then null — the map simply skips anything without a position.
  const position = await geocode({ postcode: d.postcode, city: d.city });

  const propertyFields = {
    name: d.propertyName,
    latitude: position?.latitude ?? null,
    longitude: position?.longitude ?? null,
    city: d.city,
    area: d.area || null,
    postcode: d.postcode.toUpperCase(),
    addressLine1: d.addressLine1 || null,
    showExactAddress: d.showExactAddress,
    propertyType: d.accommodationType,
    bedrooms: d.bedrooms,
  };

  let listingId = id;

  if (id) {
    const existing = await db.listing.findUnique({ where: { id }, select: { companyId: true, propertyId: true } });
    if (!existing) return { ok: false, errors: { form: "Advert not found." }, values: raw };
    await assertCompanyAccess(user, existing.companyId);
    // A listing normally always has at least one room from the moment it's
    // created. The one exception is a recovery draft that
    // autosaveDraftListingAction checkpointed while the provider was still
    // filling in the form (see AdvertForm) — that path never creates rooms.
    // This is where those get created, now that a real room count exists.
    const existingRoomCount = await db.room.count({ where: { listingId: id } });
    await db.$transaction([
      db.property.update({ where: { id: existing.propertyId }, data: propertyFields }),
      db.listing.update({ where: { id }, data: listingFields }),
      ...(existingRoomCount === 0
        ? [
            db.room.createMany({
              data: Array.from({ length: d.roomCount }, (_, i) => ({
                propertyId: existing.propertyId,
                listingId: id,
                name: `Room ${i + 1}`,
                status: "AVAILABLE" as RoomStatus,
                ensuite: d.ensuite,
                furnished: d.furnished,
                weeklyRent: pence(d.weeklyRentFrom) ?? null,
                availableFrom: date(d.availableFrom),
              })),
            }),
          ]
        : []),
    ]);
  } else {
    const listing = await db.$transaction(async (transaction) => {
      const property = await transaction.property.create({ data: { ...propertyFields, companyId } });
      const created = await transaction.listing.create({
        data: {
          ...listingFields,
          companyId,
          propertyId: property.id,
          reference: reference("SR"),
          status: "DRAFT",
        },
      });

      await transaction.room.createMany({
        data: Array.from({ length: d.roomCount }, (_, i) => ({
          propertyId: property.id,
          listingId: created.id,
          name: `Room ${i + 1}`,
          status: "AVAILABLE" as RoomStatus,
          ensuite: d.ensuite,
          furnished: d.furnished,
          weeklyRent: pence(d.weeklyRentFrom) ?? null,
          availableFrom: date(d.availableFrom),
        })),
      });
      return created;
    });
    listingId = listing.id;
  }

  await audit({
    actorId: user.id,
    action: id ? "listing.updated" : "listing.created",
    targetType: "Listing",
    targetId: listingId,
  });

  revalidatePath("/provider/adverts");
  redirect(`/provider/adverts/${listingId}/media`);
}

/**
 * Lightweight checkpoint called by AdvertForm as a provider moves between
 * steps, so a browser crash, refresh or session timeout partway through
 * posting an advert never loses their work — it's already sitting under "My
 * adverts" as a Draft. Deliberately skips listingSchema: this only needs the
 * handful of fields required to create a Property/Listing row at all, not a
 * publishable advert. The real submit (saveListingAction) always overwrites
 * everything here once it runs, including creating the actual rooms.
 * Silently declines (returns null) if there isn't enough to save yet, or the
 * provider is already at their plan's listing limit — the real submit still
 * surfaces that properly.
 */
export async function autosaveDraftListingAction(input: {
  draftId?: string;
  propertyName: string;
  city: string;
  postcode: string;
  title?: string;
}): Promise<{ draftId: string } | null> {
  const { companyId } = await requireCompany();

  const propertyName = input.propertyName.trim();
  const city = input.city.trim();
  const postcode = input.postcode.trim();
  if (!propertyName || !city || !postcode) return null;

  const title = input.title?.trim() || `${propertyName} — draft`;

  if (input.draftId) {
    const existing = await db.listing.findUnique({
      where: { id: input.draftId },
      select: { companyId: true, propertyId: true, status: true },
    });
    if (existing && existing.companyId === companyId && existing.status === "DRAFT") {
      await db.$transaction([
        db.property.update({
          where: { id: existing.propertyId },
          data: { name: propertyName, city, postcode: postcode.toUpperCase() },
        }),
        db.listing.update({ where: { id: input.draftId }, data: { title } }),
      ]);
      return { draftId: input.draftId };
    }
    // The id we were handed no longer points at one of this company's drafts
    // (deleted, submitted elsewhere, tampered with) — fall through and start fresh.
  }

  const limits = await planLimits(companyId);
  if (!limits.canAddListing) return null;

  const listing = await db.$transaction(async (transaction) => {
    const property = await transaction.property.create({
      data: { name: propertyName, city, postcode: postcode.toUpperCase(), companyId },
    });
    return transaction.listing.create({
      data: { title, companyId, propertyId: property.id, reference: reference("SR"), status: "DRAFT" },
    });
  });
  return { draftId: listing.id };
}

export async function uploadListingMediaAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { user } = await requireCompany();

  const throttle = await rateLimit(`upload:${user.id}`, LIMITS.upload);
  if (!throttle.ok) return { ok: false, errors: { form: "Too many uploads just now. Try again shortly." } };
  const listingId = text(formData, "listingId");

  const listing = await db.listing.findUnique({
    where: { id: listingId },
    select: {
      companyId: true,
      _count: { select: { media: true } },
      media: { where: { isPrimary: true, type: "IMAGE" }, take: 1, select: { id: true } },
    },
  });
  if (!listing) return { ok: false, errors: { form: "Advert not found." } };
  await assertCompanyAccess(user, listing.companyId);

  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  const videoUrl = normaliseVideoUrl(text(formData, "videoUrl"));
  const rawVideoUrl = text(formData, "videoUrl");
  const caption = text(formData, "caption").trim().slice(0, 160) || null;
  const roomId = text(formData, "roomId") || null;

  if (rawVideoUrl && !videoUrl) {
    return { ok: false, errors: { videoUrl: "Use a valid YouTube or Vimeo link." } };
  }
  if (!files.length && !videoUrl) return { ok: false, errors: { files: "Choose a file to upload." } };
  if (files.length > 12) return { ok: false, errors: { files: "Upload up to 12 files at a time." } };
  if (listing._count.media + files.length + (videoUrl ? 1 : 0) > 40) {
    return { ok: false, errors: { files: "An advert can have up to 40 photos and videos." } };
  }
  if (roomId) {
    const room = await db.room.findFirst({ where: { id: roomId, listingId }, select: { id: true } });
    if (!room) return { ok: false, errors: { roomId: "Choose a room from this advert." } };
  }

  const limits = await planLimits(listing.companyId);
  for (const file of files) {
    const isVideo = file.type.startsWith("video/");
    if (isVideo && !limits.membership.videoUploads) {
      return { ok: false, errors: { files: `Video uploads are part of the ${"Professional"} plan and above.` } };
    }
    const invalid = validateUpload(file, isVideo ? "video" : "image");
    if (invalid) return { ok: false, errors: { files: invalid } };
    const mismatch = await verifyFileContents(file, Buffer.from(await file.arrayBuffer()));
    if (mismatch) return { ok: false, errors: { files: mismatch } };
  }

  let position = listing._count.media;
  let hasPrimaryPhoto = listing.media.length > 0;
  const uploaded: Awaited<ReturnType<typeof storage.put>>[] = [];
  const rows: Prisma.ListingMediaCreateManyInput[] = [];

  if (videoUrl) {
    rows.push({ listingId, type: "VIDEO_URL", url: videoUrl, caption, roomId, position: position++ });
  }

  try {
    for (const file of files) {
      const isVideo = file.type.startsWith("video/");
      const stored = await storage.put(file, `listings/${listingId}`);
      uploaded.push(stored);
      rows.push({
        listingId,
        type: isVideo ? "VIDEO" : "IMAGE",
        url: stored.url,
        storageKey: stored.key,
        caption,
        roomId,
        mimeType: stored.mimeType,
        sizeBytes: stored.sizeBytes,
        position: position++,
        isPrimary: !isVideo && !hasPrimaryPhoto,
      });
      if (!isVideo) hasPrimaryPhoto = true;
    }
    await db.listingMedia.createMany({ data: rows });
  } catch (error) {
    await Promise.all(uploaded.map((file) => storage.remove(file.key).catch(() => undefined)));
    console.error("Media upload failed:", error);
    return { ok: false, errors: { form: "The upload could not be saved. Please try again." } };
  }

  await audit({ actorId: user.id, action: "listing.media_uploaded", targetType: "Listing", targetId: listingId,
    metadata: { files: files.length, linkedVideo: Boolean(videoUrl) } });
  revalidatePath(`/provider/adverts/${listingId}/media`);
  revalidatePath(`/listings/${listingId}`);
  return { ok: true, message: "Media uploaded." };
}

function normaliseVideoUrl(value: string) {
  if (!value) return "";
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return "";
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    if (host === "youtu.be" || host === "youtube.com") {
      const id = host === "youtu.be"
        ? url.pathname.split("/").filter(Boolean)[0]
        : url.searchParams.get("v") ?? url.pathname.match(/^\/(?:embed|shorts)\/([\w-]{11})/)?.[1];
      return id && /^[\w-]{11}$/.test(id) ? `https://www.youtube.com/watch?v=${id}` : "";
    }
    if (host === "vimeo.com") {
      const id = url.pathname.split("/").find((part) => /^\d+$/.test(part));
      return id ? `https://vimeo.com/${id}` : "";
    }
    return "";
  } catch {
    return "";
  }
}

export async function updateMediaDetailsAction(listingId: string, mediaId: string, caption: string, roomId: string | null) {
  const { user } = await requireCompany();
  const listing = await db.listing.findUnique({ where: { id: listingId }, select: { companyId: true } });
  if (!listing) throw new Error("Advert not found.");
  await assertCompanyAccess(user, listing.companyId);

  if (roomId) {
    const room = await db.room.findFirst({ where: { id: roomId, listingId }, select: { id: true } });
    if (!room) throw new Error("That room does not belong to this advert.");
  }
  const updated = await db.listingMedia.updateMany({
    where: { id: mediaId, listingId },
    data: { caption: caption.trim().slice(0, 160) || null, roomId: roomId || null },
  });
  if (!updated.count) throw new Error("Media not found.");
  revalidatePath(`/provider/adverts/${listingId}/media`);
  revalidatePath(`/listings/${listingId}`);
}

export async function reorderMediaAction(listingId: string, orderedIds: string[]) {
  const { user } = await requireCompany();
  const listing = await db.listing.findUnique({ where: { id: listingId }, select: { companyId: true } });
  if (!listing) return;
  await assertCompanyAccess(user, listing.companyId);

  const owned = await db.listingMedia.findMany({ where: { listingId }, select: { id: true } });
  const ownedIds = new Set(owned.map((item) => item.id));
  if (orderedIds.length !== ownedIds.size || orderedIds.some((id) => !ownedIds.has(id))) {
    throw new Error("Invalid media order.");
  }
  await db.$transaction(orderedIds.map((id, index) => db.listingMedia.update({ where: { id }, data: { position: index } })));
  revalidatePath(`/provider/adverts/${listingId}/media`);
  revalidatePath(`/listings/${listingId}`);
}

export async function setPrimaryMediaAction(listingId: string, mediaId: string) {
  const { user } = await requireCompany();
  const listing = await db.listing.findUnique({ where: { id: listingId }, select: { companyId: true } });
  if (!listing) return;
  await assertCompanyAccess(user, listing.companyId);

  const media = await db.listingMedia.findFirst({ where: { id: mediaId, listingId, type: "IMAGE" }, select: { id: true } });
  if (!media) throw new Error("Choose a photo from this advert.");
  await db.$transaction([
    db.listingMedia.updateMany({ where: { listingId }, data: { isPrimary: false } }),
    db.listingMedia.update({ where: { id: mediaId }, data: { isPrimary: true, position: 0 } }),
  ]);
  revalidatePath(`/provider/adverts/${listingId}/media`);
  revalidatePath(`/listings/${listingId}`);
}

export async function deleteMediaAction(listingId: string, mediaId: string) {
  const { user } = await requireCompany();
  const listing = await db.listing.findUnique({ where: { id: listingId }, select: { companyId: true } });
  if (!listing) return;
  await assertCompanyAccess(user, listing.companyId);
  const media = await db.listingMedia.findFirst({ where: { id: mediaId, listingId }, select: { id: true, storageKey: true, isPrimary: true } });
  if (!media) return;
  await db.listingMedia.delete({ where: { id: media.id } });
  if (media.storageKey) {
    try { await storage.remove(media.storageKey); } catch (error) { console.error("Unable to remove media object:", error); }
  }
  if (media.isPrimary) {
    const next = await db.listingMedia.findFirst({ where: { listingId, type: "IMAGE" }, orderBy: { position: "asc" }, select: { id: true } });
    if (next) await db.listingMedia.update({ where: { id: next.id }, data: { isPrimary: true } });
  }
  revalidatePath(`/provider/adverts/${listingId}/media`);
  revalidatePath(`/listings/${listingId}`);
}

/** Submitting for review — adverts go live only after an admin approves them. */
export async function submitListingAction(listingId: string) {
  const { user } = await requireCompany();
  const listing = await db.listing.findUnique({ where: { id: listingId }, select: { companyId: true, title: true } });
  if (!listing) return;
  await assertCompanyAccess(user, listing.companyId);

  await db.listing.update({ where: { id: listingId }, data: { status: "PENDING_REVIEW" } });
  await audit({ actorId: user.id, action: "listing.submitted", targetType: "Listing", targetId: listingId });
  // Posting an advert is the "qualifying" action for the referral programme —
  // a no-op unless this company signed up using another provider's invite code.
  await qualifyProviderReferral(listing.companyId);
  await notifyCompany(listing.companyId, {
    type: "LISTING",
    title: "Advert submitted for review",
    body: `“${listing.title}” is with our team. We usually review within one working day.`,
    href: `/provider/adverts/${listingId}`,
  });
  revalidatePath("/provider/adverts");
  // ?submitted=1 shows the "on its way" celebration (and chime) on the advert page.
  redirect(`/provider/adverts/${listingId}?submitted=1`);
}

export async function setListingStatusAction(
  listingId: string,
  status: "ACTIVE" | "PAUSED" | "ARCHIVED" | "DRAFT",
) {
  const { user } = await requireCompany();
  const listing = await db.listing.findUnique({ where: { id: listingId }, select: { companyId: true, status: true } });
  if (!listing) return { ok: false, message: "Advert not found." };
  await assertCompanyAccess(user, listing.companyId);

  // A provider can pause or archive, but cannot self-approve an unapproved advert.
  if (status === "ACTIVE" && !["PAUSED", "ACTIVE"].includes(listing.status)) {
    return { ok: false, message: "Only a paused advert can be made live directly — submit for review otherwise." };
  }
  // Unarchiving deliberately lands back in Draft, not straight to Active: an
  // archived advert may be stale (rent, availability, staff have all moved on
  // since it was put away), so it goes through review again rather than
  // silently reappearing in search.
  if (status === "DRAFT" && listing.status !== "ARCHIVED") {
    return { ok: false, message: "Only an archived advert can be restored." };
  }

  await db.listing.update({
    where: { id: listingId },
    data: {
      status,
      // A person is now setting this deliberately, so any note the system
      // left about why it auto-paused no longer applies.
      pausedReason: null,
      ...(status === "ACTIVE" ? { availabilityConfirmedAt: new Date(), staleNudgeSentAt: null } : {}),
    },
  });
  await audit({ actorId: user.id, action: `listing.${status.toLowerCase()}`, targetType: "Listing", targetId: listingId });
  revalidatePath("/provider/adverts");
  revalidatePath(`/provider/adverts/${listingId}`);

  if (status === "ACTIVE") {
    // Fire-and-forget: matching alerts shouldn't hold up the provider's click.
    notifyInstantSavedSearches(listingId).catch((error) => console.error("[saved-search-alerts]", error));
    // If every room already went unavailable while this was paused, this
    // pauses it straight back — with the honest reason — rather than
    // leaving it "live" with nothing to actually offer.
    syncListingAvailability(listingId).catch((error) => console.error("[listing-availability]", error));
  }

  const messages: Record<string, string> = {
    ACTIVE: "Advert is live again.",
    PAUSED: "Advert paused. It won't appear in search until you make it live again.",
    ARCHIVED: "Advert archived. Restore it any time from here.",
    DRAFT: "Restored to drafts. Submit it for review to make it live again.",
  };
  return { ok: true, message: messages[status] };
}

/**
 * A provider vouching that an advert is still accurate — either a proactive
 * click, or answering the "still available?" nudge (see
 * runListingFreshnessCheck). If it had been auto-paused for going stale,
 * confirming brings it straight back; an auto-pause for having no available
 * rooms still needs an actual room to free up (see syncListingAvailability),
 * since confirming "yes this is accurate" isn't the same as having somewhere
 * to put someone.
 */
export async function confirmListingAvailabilityAction(listingId: string) {
  const { user } = await requireCompany();
  const listing = await db.listing.findUnique({
    where: { id: listingId },
    select: { companyId: true, status: true, pausedReason: true },
  });
  if (!listing) return;
  await assertCompanyAccess(user, listing.companyId);

  const reactivate = listing.status === "PAUSED" && listing.pausedReason === "STALE";
  await db.listing.update({
    where: { id: listingId },
    data: {
      availabilityConfirmedAt: new Date(),
      staleNudgeSentAt: null,
      ...(reactivate ? { status: "ACTIVE", pausedReason: null } : {}),
    },
  });
  await audit({
    actorId: user.id,
    action: "listing.availability_confirmed",
    targetType: "Listing",
    targetId: listingId,
    metadata: { reactivated: reactivate },
  });
  revalidatePath("/provider/adverts");
  revalidatePath(`/provider/adverts/${listingId}`);

  if (reactivate) {
    notifyInstantSavedSearches(listingId).catch((error) => console.error("[saved-search-alerts]", error));
  }
}

/**
 * Hard delete. Only allowed once an advert is out of the live pipeline
 * (Draft, Rejected or Archived) — an advert with an active audience is
 * archived, not deleted, so anyone who saved it or has an open request
 * against it isn't left with a dangling reference mid-conversation.
 *
 * Requests, media, and saved-listing rows cascade automatically (see
 * schema). Referrals and conversations keep their own copy of what matters
 * and simply lose the listing link (SetNull) — referral and message history
 * is never destroyed by deleting an advert.
 */
export async function deleteListingAction(listingId: string) {
  const { user } = await requireCompany();
  const listing = await db.listing.findUnique({
    where: { id: listingId },
    select: { companyId: true, status: true, propertyId: true, title: true },
  });
  if (!listing) return { ok: false, message: "Advert not found." };
  await assertCompanyAccess(user, listing.companyId);

  if (!["DRAFT", "REJECTED", "ARCHIVED"].includes(listing.status)) {
    return { ok: false, message: "Pause or archive a live advert before deleting it." };
  }

  await db.$transaction(async (tx) => {
    // Rooms are scoped to this listing specifically (a property can in
    // principle host more than one), so only detach the ones this advert
    // actually created.
    await tx.room.deleteMany({ where: { listingId } });
    await tx.listing.delete({ where: { id: listingId } });

    const remaining = await tx.listing.count({ where: { propertyId: listing.propertyId } });
    if (remaining === 0) await tx.property.delete({ where: { id: listing.propertyId } });
  });

  await audit({ actorId: user.id, action: "listing.deleted", targetType: "Listing", targetId: listingId, metadata: { title: listing.title } });
  revalidatePath("/provider/adverts");
  return { ok: true, message: "Advert deleted." };
}

export async function updateRoomStatusAction(roomId: string, status: RoomStatus) {
  const user = await requireUser();
  const room = await db.room.findUnique({
    where: { id: roomId },
    include: { property: { select: { companyId: true } }, listing: { select: { id: true, title: true } } },
  });
  if (!room) return;
  await assertCompanyAccess(user, room.property.companyId);

  const before = room.status;
  await db.room.update({ where: { id: roomId }, data: { status } });
  await audit({
    actorId: user.id,
    action: "room.status_changed",
    targetType: "Room",
    targetId: roomId,
    metadata: { from: before, to: status },
  });

  // People who saved this advert are told when availability changes.
  if (room.listing && before !== status && (status === "AVAILABLE" || before === "AVAILABLE")) {
    const { notify } = await import("@/lib/notify");
    const savers = await db.savedListing.findMany({
      where: { listingId: room.listing.id, notify: true },
      select: { userId: true },
    });
    await Promise.all(
      savers.map((s) =>
        notify({
          userId: s.userId,
          type: "SAVED_LISTING",
          title: status === "AVAILABLE" ? "A room has become available" : "Availability changed",
          body: `${room.listing!.title}: ${room.name} is now ${status.toLowerCase()}.`,
          href: `/listings/${room.listing!.id}`,
        }),
      ),
    );
  }

  // Keeps the advert's own live/paused state honest against what its rooms
  // now say — see syncListingAvailability for why this isn't left to the
  // provider to remember.
  if (room.listing) {
    await syncListingAvailability(room.listing.id);
  }

  revalidatePath("/provider/rooms");
  revalidatePath("/provider/adverts");
  if (room.listing) revalidatePath(`/provider/adverts/${room.listing.id}`);
}

export async function addRoomAction(listingId: string, name: string) {
  const { user } = await requireCompany();
  const listing = await db.listing.findUnique({ where: { id: listingId }, select: { companyId: true, propertyId: true } });
  if (!listing) return;
  await assertCompanyAccess(user, listing.companyId);

  const limits = await planLimits(listing.companyId);
  if (!limits.canAddRoom) return;

  await db.room.create({ data: { propertyId: listing.propertyId, listingId, name } });
  revalidatePath("/provider/rooms");
}

/**
 * Copies an advert into a new draft for a similar property: the support,
 * rent, rules, description and the same rooms (all set to available). Photos
 * and videos aren't copied because they show the original home, and the
 * street address is left blank so it can't go live pointing at the wrong
 * house. The provider lands on the edit form to fill in the new details.
 */
export async function duplicateListingAction(listingId: string) {
  const { user } = await requireCompany();
  const source = await db.listing.findUnique({
    where: { id: listingId },
    include: { property: true, rooms: { orderBy: { name: "asc" } } },
  });
  if (!source) return { ok: false, message: "Advert not found." };
  await assertCompanyAccess(user, source.companyId);

  const limits = await planLimits(source.companyId);
  if (!limits.canAddListing) {
    return {
      ok: false,
      message: `Your ${limits.membership.name} plan covers ${limits.membership.maxListings} live adverts. Upgrade to add another.`,
    };
  }

  const { property } = source;
  const copy = await db.$transaction(async (transaction) => {
    const newProperty = await transaction.property.create({
      data: {
        companyId: source.companyId,
        name: `${property.name} (copy)`.slice(0, 120),
        city: property.city,
        area: property.area,
        postcode: property.postcode,
        latitude: property.latitude,
        longitude: property.longitude,
        showExactAddress: false,
        propertyType: property.propertyType,
        bedrooms: property.bedrooms,
      },
    });
    const listing = await transaction.listing.create({
      data: {
        companyId: source.companyId,
        propertyId: newProperty.id,
        reference: reference("SR"),
        status: "DRAFT",
        title: `${source.title} (copy)`.slice(0, 120),
        summary: source.summary,
        description: source.description,
        accommodationType: source.accommodationType,
        genderArrangement: source.genderArrangement,
        minAge: source.minAge,
        maxAge: source.maxAge,
        ensuite: source.ensuite,
        furnished: source.furnished,
        selfContained: source.selfContained,
        sharedFacilities: source.sharedFacilities,
        wheelchairAccess: source.wheelchairAccess,
        accessibilityNotes: source.accessibilityNotes,
        petsAllowed: source.petsAllowed,
        supportTypes: source.supportTypes,
        supportDescription: source.supportDescription,
        supportAvailability: source.supportAvailability,
        supportProvider: source.supportProvider,
        referralRoutes: source.referralRoutes,
        eligibility: source.eligibility,
        referralProcess: source.referralProcess,
        houseRules: source.houseRules,
        weeklyRentFrom: source.weeklyRentFrom,
        weeklyRentTo: source.weeklyRentTo,
        billsIncluded: source.billsIncluded,
        housingBenefit: source.housingBenefit,
      },
    });
    if (source.rooms.length > 0) {
      await transaction.room.createMany({
        data: source.rooms.map((room) => ({
          propertyId: newProperty.id,
          listingId: listing.id,
          name: room.name,
          status: "AVAILABLE" as RoomStatus,
          weeklyRent: room.weeklyRent,
          monthlyRent: room.monthlyRent,
          ensuite: room.ensuite,
          furnished: room.furnished,
          sizeSqm: room.sizeSqm,
        })),
      });
    }
    return listing;
  });

  await audit({
    actorId: user.id,
    action: "listing.duplicated",
    targetType: "Listing",
    targetId: copy.id,
    metadata: { from: source.id },
  });
  revalidatePath("/provider/adverts");
  redirect(`/provider/adverts/${copy.id}/edit?duplicated=1`);
}
