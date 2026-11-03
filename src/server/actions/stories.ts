"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requireAdmin, requireCompany } from "@/lib/rbac";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { storage, validateUpload, verifyFileContents } from "@/lib/storage";
import { planLimits } from "@/lib/billing";
import { checkBlockedContent } from "@/lib/blocked-content";
import { cleanCaption, cleanStoryLink, STORY_MAX_ACTIVE, storyExpiry } from "@/lib/stories";
import type { FormState } from "@/lib/validation";

function refresh() {
  revalidatePath("/provider/stories");
  revalidatePath("/admin/stories");
  revalidatePath("/search");
}

/** Shared upload checks for provider and official stories. */
async function checkMedia(form: FormData, allowVideo: boolean): Promise<{ file: File; isVideo: boolean } | { error: FormState }> {
  const file = form.get("media");
  if (!(file instanceof File) || file.size === 0) return { error: { ok: false, errors: { media: "Choose a photo or video." } } };
  const isVideo = file.type.startsWith("video/");
  if (isVideo && !allowVideo) return { error: { ok: false, errors: { media: "Video stories are part of the Professional plan and above. Post a photo, or upgrade." } } };
  const invalid = validateUpload(file, isVideo ? "video" : "image");
  if (invalid) return { error: { ok: false, errors: { media: invalid } } };
  const mismatch = await verifyFileContents(file, Buffer.from(await file.arrayBuffer()));
  if (mismatch) return { error: { ok: false, errors: { media: mismatch } } };
  return { file, isVideo };
}

/** An admin posts an official RoomsNow story: shown first to everyone, for 24 hours. */
export async function adminPostStoryAction(_prev: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin("ALL");
  const media = await checkMedia(form, true);
  if ("error" in media) return media.error;
  const linkUrl = cleanStoryLink(form.get("linkUrl"));
  if (linkUrl === undefined) return { ok: false, errors: { linkUrl: "Use a page on RoomsNow, like /advertise or /search." } };
  const active = await db.providerStory.count({ where: { companyId: null, expiresAt: { gt: new Date() } } });
  if (active >= STORY_MAX_ACTIVE) return { ok: false, errors: { form: `There are already ${STORY_MAX_ACTIVE} live RoomsNow stories. Remove one first.` } };

  const stored = await storage.put(media.file, "stories/roomsnow");
  const story = await db.providerStory.create({
    data: { companyId: null, linkUrl, mediaType: media.isVideo ? "VIDEO" : "IMAGE", mediaUrl: stored.url, mediaKey: stored.key, caption: cleanCaption(form.get("caption")), createdById: admin.id, expiresAt: storyExpiry() },
  });
  await audit({ actorId: admin.id, action: "admin.story_posted", targetType: "ProviderStory", targetId: story.id, metadata: { mediaType: story.mediaType, linkUrl } });
  refresh();
  return { ok: true, message: "Your RoomsNow story is live for everyone for the next 24 hours." };
}

/** A provider posts a photo or video story. It goes live straight away and disappears after 24 hours. */
export async function postStoryAction(_prev: FormState, form: FormData): Promise<FormState> {
  const { user, companyId } = await requireCompany();
  // Stories are a paid feature: Free providers can't post at all.
  const limits = await planLimits(companyId);
  if (limits.membership.tier === "FREE") return { ok: false, errors: { form: "Stories are part of the Professional and Business plans. Upgrade to post stories." } };
  const throttle = await rateLimit(`story:${companyId}`, LIMITS.upload);
  if (!throttle.ok) return { ok: false, errors: { form: "You're posting very quickly. Try again in a little while." } };

  const media = await checkMedia(form, Boolean(limits.membership.videoUploads));
  if ("error" in media) return media.error;
  const caption = cleanCaption(form.get("caption"));
  if (caption && (await checkBlockedContent(caption, { actorId: user.id, where: "advert" }))) {
    return { ok: false, errors: { caption: "Captions can't include payment links, bank details or blocked words." } };
  }
  const { file, isVideo } = media;

  const listingId = String(form.get("listingId") || "") || null;
  if (listingId && !(await db.listing.findFirst({ where: { id: listingId, companyId, status: "ACTIVE" }, select: { id: true } }))) {
    return { ok: false, errors: { listingId: "Choose one of your live adverts." } };
  }

  const active = await db.providerStory.count({ where: { companyId, expiresAt: { gt: new Date() } } });
  if (active >= STORY_MAX_ACTIVE) return { ok: false, errors: { form: `You can have up to ${STORY_MAX_ACTIVE} live stories. Remove one or wait for one to expire.` } };

  const stored = await storage.put(file, `stories/${companyId}`);
  const story = await db.providerStory.create({
    data: { companyId, listingId, mediaType: isVideo ? "VIDEO" : "IMAGE", mediaUrl: stored.url, mediaKey: stored.key, caption, createdById: user.id, expiresAt: storyExpiry() },
  });
  await audit({ actorId: user.id, action: "story.posted", targetType: "ProviderStory", targetId: story.id, metadata: { mediaType: story.mediaType, listingId } });
  refresh();
  return { ok: true, message: "Your story is live for the next 24 hours." };
}

async function removeStory(id: string, actorId: string, action: string) {
  const story = await db.providerStory.findUnique({ where: { id }, select: { id: true, mediaKey: true } });
  if (!story) return;
  await db.providerStory.delete({ where: { id } });
  await storage.remove(story.mediaKey, "public").catch((error) => console.error("[stories] could not delete media", error));
  await audit({ actorId, action, targetType: "ProviderStory", targetId: id });
  refresh();
}

/** A provider takes down one of their own stories early. */
export async function deleteStoryAction(form: FormData) {
  const { user, companyId } = await requireCompany();
  const id = String(form.get("id") || "");
  if (!(await db.providerStory.findFirst({ where: { id, companyId }, select: { id: true } }))) return;
  await removeStory(id, user.id, "story.deleted");
}

/** An admin removes a story that breaks the rules. */
export async function adminRemoveStoryAction(form: FormData) {
  const admin = await requireAdmin("MODERATION");
  await removeStory(String(form.get("id") || ""), admin.id, "admin.story_removed");
}

/** Counts a view when someone opens a story. */
export async function viewStoryAction(id: string) {
  if (typeof id !== "string" || !id) return;
  await db.providerStory.updateMany({ where: { id, expiresAt: { gt: new Date() } }, data: { views: { increment: 1 } } }).catch(() => undefined);
}
