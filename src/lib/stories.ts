/**
 * Provider stories: short photo/video posts that disappear after 24 hours,
 * like Instagram stories. Pure, so the rules and grouping can be unit-tested.
 */
export const STORY_HOURS = 24;
export const STORY_CAPTION_MAX = 150;
/** Live stories one provider can have at once. */
export const STORY_MAX_ACTIVE = 10;
/** How long a photo story stays on screen before moving on. */
export const STORY_IMAGE_MS = 6000;

export type StoryCard = {
  id: string;
  mediaType: "IMAGE" | "VIDEO";
  mediaUrl: string;
  caption: string | null;
  createdAt: string;
  listing: { id: string; title: string; price: string; place: string } | null;
  whatsapp: boolean;
  /** "Find out more" link on official RoomsNow stories. */
  link: string | null;
};

export type StoryGroup = {
  companyId: string;
  companyName: string;
  slug: string;
  logoUrl: string | null;
  verified: boolean;
  /** Posted by the RoomsNow team rather than a provider. */
  official: boolean;
  stories: StoryCard[];
};

export function storyExpiry(from = new Date()) {
  return new Date(from.getTime() + STORY_HOURS * 60 * 60 * 1000);
}

/** Group key for official RoomsNow stories, which have no company. */
export const OFFICIAL_STORY_KEY = "roomsnow";

/** Official story links must be a page on this site, e.g. "/advertise" — never an outside link. */
export function cleanStoryLink(input: unknown) {
  const link = String(input ?? "").trim();
  if (!link) return null;
  try {
    const url = new URL(link, "https://www.roomsnow.co.uk");
    if (!/^(www\.)?roomsnow\.co\.uk$/.test(url.hostname) || link.startsWith("//")) return undefined;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return undefined;
  }
}

export function cleanCaption(input: unknown) {
  const caption = String(input ?? "").replace(/\s+/g, " ").trim();
  return caption.slice(0, STORY_CAPTION_MAX) || null;
}

/**
 * One group per provider, oldest story first inside a group (so they play in
 * order), groups with the newest story first (so fresh posts lead the rail).
 */
export function groupStories<T extends { companyId: string; createdAt: string }>(stories: T[]): Array<{ companyId: string; stories: T[] }> {
  const groups = new Map<string, T[]>();
  for (const story of stories) groups.set(story.companyId, [...(groups.get(story.companyId) ?? []), story]);
  return [...groups.entries()]
    .map(([companyId, list]) => ({ companyId, stories: [...list].sort((a, b) => a.createdAt.localeCompare(b.createdAt)) }))
    .sort((a, b) => b.stories[b.stories.length - 1].createdAt.localeCompare(a.stories[a.stories.length - 1].createdAt));
}

/** Upload caps, mirrored from storage.ts so the form can warn before sending. */
export const STORY_IMAGE_MAX_MB = 8;
export const STORY_VIDEO_MAX_MB = 20;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"];

/** Checks a chosen file before upload; returns a message to show, or null if it's fine. */
export function storyFileProblem(file: { type: string; size: number }, allowVideo: boolean): string | null {
  const isVideo = file.type.startsWith("video/");
  if (isVideo && !allowVideo) return "Video stories come with the Professional plan. Choose a photo instead.";
  if (!(isVideo ? VIDEO_TYPES : IMAGE_TYPES).includes(file.type)) return isVideo ? "Use an MP4 or MOV video." : "Use a JPG, PNG or WebP photo.";
  const maxMb = isVideo ? STORY_VIDEO_MAX_MB : STORY_IMAGE_MAX_MB;
  if (file.size > maxMb * 1024 * 1024) {
    return `That ${isVideo ? "video" : "photo"} is ${(file.size / 1024 / 1024).toFixed(0)} MB. The limit is ${maxMb} MB${isVideo ? ", so trim it to about 15–30 seconds or record at 1080p" : ""}.`;
  }
  return null;
}
