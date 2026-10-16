import type { Metadata } from "next";

export const SITE_URL = "https://www.roomsnow.co.uk";

export function absoluteUrl(path = "/") {
  return new URL(path, SITE_URL).toString();
}

export function locationSlug(location: string) {
  return location
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function locationName(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/** Link-preview picture for pages without one of their own (app/social-card.png). */
export const DEFAULT_SHARE_IMAGE = {
  url: absoluteUrl("/social-card.png"),
  width: 1200,
  height: 630,
  alt: "RoomsNow: find an HMO room or supported accommodation",
};

export function pageMetadata({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  const url = absoluteUrl(path);
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      siteName: "RoomsNow",
      locale: "en_GB",
      url,
      title,
      description,
      images: [DEFAULT_SHARE_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [DEFAULT_SHARE_IMAGE.url],
    },
  };
}

export function JsonLd({ data }: { data: Record<string, unknown> | Array<Record<string, unknown>> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
