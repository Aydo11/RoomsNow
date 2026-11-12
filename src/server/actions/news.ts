"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/rbac";
import { storage, validateUpload, verifyFileContents } from "@/lib/storage";
import { newsSlug, validateNewsPost, type NewsInput } from "@/lib/news";
import type { FormState } from "@/lib/validation";

function refresh(slug?: string) {
  revalidatePath("/news");
  if (slug) revalidatePath(`/news/${slug}`);
  revalidatePath("/admin/news");
  revalidatePath("/");
}

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();

/** A stored post as form input, so the same publishing checks can run on it. */
function asInput(post: Record<string, unknown>): NewsInput {
  const input: NewsInput = {};
  for (const [key, value] of Object.entries(post)) {
    if (typeof value === "string") input[key] = value;
    else if (value instanceof Date && key === "sectorReviewedOn") input[key] = value.toISOString().slice(0, 10);
  }
  return input;
}

/** A slug nobody else is using: "gambia-appeal", then "gambia-appeal-2", ... */
async function freeSlug(title: string, exceptId?: string) {
  const base = newsSlug(title);
  for (let n = 1; ; n++) {
    const slug = n === 1 ? base : `${base}-${n}`;
    const taken = await db.newsPost.findUnique({ where: { slug }, select: { id: true } });
    if (!taken || taken.id === exceptId) return slug;
  }
}

/** Create a post, or update one when the form carries an id. */
export async function saveNewsPostAction(_prev: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin("ALL");
  const id = text(form, "id") || undefined;
  const publish = form.get("publish") === "on";
  const pinned = form.get("pinned") === "on";
  const input: NewsInput = {};
  for (const [key, value] of form.entries()) if (typeof value === "string") input[key] = value;
  // Full appeal/source checks apply whenever the post will be live after this save.
  const checked = validateNewsPost(input, publish);
  if (!checked.ok) return { ok: false, errors: checked.errors };
  const fields = checked.data;
  const { category, title } = fields;

  const existing = id ? await db.newsPost.findUnique({ where: { id } }) : null;
  if (id && !existing) return { ok: false, errors: { form: "That post no longer exists." } };

  let image: { imageUrl: string; imageKey: string } | undefined;
  const file = form.get("image");
  if (file instanceof File && file.size > 0) {
    const invalid = validateUpload(file, "image");
    if (invalid) return { ok: false, errors: { image: invalid } };
    const mismatch = await verifyFileContents(file, Buffer.from(await file.arrayBuffer()));
    if (mismatch) return { ok: false, errors: { image: mismatch } };
    const stored = await storage.put(file, "news");
    image = { imageUrl: stored.url, imageKey: stored.key };
  }

  // Keep the URL stable once a post is live, so shared links don't break.
  const slug = existing?.publishedAt ? existing.slug : await freeSlug(title, existing?.id);
  const publishedAt = publish ? (existing?.publishedAt ?? new Date()) : null;
  const data = { ...fields, pinned: pinned && publish, publishedAt, slug, ...image };

  const post = existing
    ? await db.newsPost.update({ where: { id: existing.id }, data })
    : await db.newsPost.create({ data: { ...data, createdById: admin.id } });
  if (image && existing?.imageKey) await storage.remove(existing.imageKey).catch(() => undefined);

  await audit({ actorId: admin.id, action: existing ? "news.updated" : "news.created", targetType: "NewsPost", targetId: post.id, metadata: { category, published: publish, pinned: data.pinned } });
  refresh(post.slug);
  return { ok: true, message: publish ? `Published. It's live at /news/${post.slug}${data.pinned ? " and on the homepage banner" : ""}.` : "Saved as a draft. Tick “Publish” when it's ready." };
}

export async function setNewsPinnedAction(id: string, pinned: boolean) {
  const admin = await requireAdmin("ALL");
  const post = await db.newsPost.update({ where: { id }, data: { pinned } });
  await audit({ actorId: admin.id, action: pinned ? "news.pinned" : "news.unpinned", targetType: "NewsPost", targetId: id });
  refresh(post.slug);
}

export async function setNewsPublishedAction(id: string, publish: boolean) {
  const admin = await requireAdmin("ALL");
  const current = await db.newsPost.findUnique({ where: { id } });
  if (!current) return;
  if (publish && !validateNewsPost(asInput(current), true).ok) {
    // Missing appeal or source details: send the editor to the form, which shows what's needed.
    redirect(`/admin/news/${id}?check=1`);
  }
  // Only write if nobody edited the post since we checked it.
  const written = await db.newsPost.updateMany({
    where: { id, updatedAt: current.updatedAt },
    data: publish ? { publishedAt: current.publishedAt ?? new Date() } : { publishedAt: null, pinned: false },
  });
  if (written.count === 0) redirect(`/admin/news/${id}?check=1`);
  const post = current;
  await audit({ actorId: admin.id, action: publish ? "news.published" : "news.unpublished", targetType: "NewsPost", targetId: id });
  refresh(post.slug);
}

export async function deleteNewsPostAction(id: string) {
  const admin = await requireAdmin("ALL");
  const post = await db.newsPost.delete({ where: { id } }).catch(() => null);
  if (!post) return;
  if (post.imageKey) await storage.remove(post.imageKey).catch(() => undefined);
  await audit({ actorId: admin.id, action: "news.deleted", targetType: "NewsPost", targetId: id, metadata: { title: post.title } });
  refresh(post.slug);
}
