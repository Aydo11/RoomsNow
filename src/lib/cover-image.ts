import type { Prisma } from "@prisma/client";

/** The 11-character video id from any common YouTube link shape, or null. */
export function youtubeId(url: string | null | undefined) {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/|v\/))([\w-]{11})/);
  return match ? match[1] : null;
}

/** YouTube's own still for a video link (always present, 480×360). Vimeo needs an API call, so it returns null. */
export function videoThumbnail(url: string | null | undefined) {
  const id = youtubeId(url);
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
}

/**
 * Media query for an advert's cover: real photos first (the enum sorts IMAGE
 * before VIDEO and VIDEO_URL), then a video that can stand in, so an advert
 * with only a walkthrough video never falls back to an illustrative image.
 */
export const COVER_MEDIA = {
  where: { type: { in: ["IMAGE", "VIDEO", "VIDEO_URL"] } },
  orderBy: [{ type: "asc" }, { isPrimary: "desc" }, { position: "asc" }],
  take: 4,
} satisfies Prisma.Listing$mediaArgs;

type CoverMedia = { type: string; url: string };

export type Cover = {
  url: string;
  /** The cover stands in for a video (show a play marker). */
  fromVideo: boolean;
  /** `url` is an uploaded video file, not an image — render its first frame with <video>. */
  isVideoFile: boolean;
};

/**
 * The best cover for an advert: its main photo, else a YouTube thumbnail,
 * else the first frame of an uploaded video, else null.
 */
export function coverImage(media: CoverMedia[] | null | undefined): Cover | null {
  if (!media?.length) return null;
  const photo = media.find((item) => item.type === "IMAGE");
  if (photo) return { url: photo.url, fromVideo: false, isVideoFile: false };
  for (const item of media) {
    if (item.type !== "VIDEO_URL") continue;
    const thumb = videoThumbnail(item.url);
    if (thumb) return { url: thumb, fromVideo: true, isVideoFile: false };
  }
  const file = media.find((item) => item.type === "VIDEO");
  if (file) return { url: file.url, fromVideo: true, isVideoFile: true };
  return null;
}

/** Seeking a hair past zero makes browsers (iOS included) paint the first frame as a still. */
export function videoPosterSrc(url: string) {
  return url.includes("#") ? url : `${url}#t=0.1`;
}
