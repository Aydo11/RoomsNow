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
};

export type StoryGroup = {
  companyId: string;
  companyName: string;
  slug: string;
  logoUrl: string | null;
  verified: boolean;
  stories: StoryCard[];
};

export function storyExpiry(from = new Date()) {
  return new Date(from.getTime() + STORY_HOURS * 60 * 60 * 1000);
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
