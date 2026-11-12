/** The public News section (/news): categories and the small rules shared by the admin form and pages. */

export const NEWS_CATEGORIES = {
  ROOMSNOW: { label: "RoomsNow news", short: "RoomsNow", tone: "bg-pine/10 text-pine-dark" },
  CHARITY: { label: "Charity spotlight", short: "Charity", tone: "bg-clay/10 text-clay" },
  SECTOR: { label: "Sector news", short: "Sector", tone: "bg-paper-sunk text-ink-soft" },
} as const;

export type NewsCategory = keyof typeof NEWS_CATEGORIES;

export function isNewsCategory(value: unknown): value is NewsCategory {
  return typeof value === "string" && Object.hasOwn(NEWS_CATEGORIES, value);
}

/** "Support our Gambia project!" → "support-our-gambia-project". */
export function newsSlug(title: string): string {
  return (
    title
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 70)
      .replace(/-+$/g, "") || "post"
  );
}

/** A button link must be a full http(s) URL, a page on RoomsNow or a mailto: address. Returns null for empty, undefined for invalid. */
export function cleanNewsLink(value: unknown): string | null | undefined {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return null;
  if (raw.startsWith("/") && !raw.startsWith("//")) return raw;
  // "Get in touch" buttons can open an email.
  if (/^mailto:[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(raw)) return raw;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

/** Body text → paragraphs (blank lines split them; single line breaks stay inside a paragraph). */
export function newsParagraphs(body: string): string[] {
  return body
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/** Default button wording when the admin leaves it blank. */
export function defaultLinkLabel(category: NewsCategory): string {
  return category === "CHARITY" ? "Donate or get involved" : category === "SECTOR" ? "Read the full story" : "Find out more";
}

/* ---------- v2: charity appeals, sector sources, publishing checks ---------- */

export type AppealStatus = "OPEN" | "CLOSED";

/** Strict link for appeal and source fields: absolute https with a host and no login details. */
export function httpsUrl(value: string): string | undefined {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || !url.hostname || url.username || url.password || value.length > 2048) return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

/** Today's calendar date in the UK, as YYYY-MM-DD. */
export function ukToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** A real YYYY-MM-DD calendar date, or undefined. */
export function calendarDate(value: string): string | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const d = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value ? value : undefined;
}

/** "2026-11-12" (or a date-only DateTime) → "12 November 2026", without timezone drift. */
export function ukLongDate(value: string | Date): string {
  const iso = typeof value === "string" ? value : value.toISOString().slice(0, 10);
  return new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" }).format(new Date(`${iso}T00:00:00.000Z`));
}

export type NewsInput = Record<string, string | undefined> & { publish?: string };

export type NewsFields = {
  category: NewsCategory;
  title: string;
  summary: string;
  body: string;
  linkUrl: string | null;
  linkLabel: string | null;
  appealStatus: AppealStatus | null;
  appealOrganiser: string | null;
  appealRelationship: string | null;
  appealPurpose: string | null;
  appealDonationRecipient: string | null;
  appealCharityRegistration: string | null;
  appealGiftAidStatus: string | null;
  appealDonateUrl: string | null;
  appealVolunteerUrl: string | null;
  sectorSourceName: string | null;
  sectorSourceUrl: string | null;
  sectorReviewedOn: Date | null;
};

const APPEAL_TEXT: Array<[keyof NewsFields, number, string]> = [
  ["appealOrganiser", 160, "Organised by"],
  ["appealRelationship", 500, "Relationship to RoomsNow"],
  ["appealPurpose", 500, "What the appeal supports"],
  ["appealDonationRecipient", 160, "Who receives donations"],
  ["appealCharityRegistration", 250, "Charity registration"],
  ["appealGiftAidStatus", 250, "Gift Aid"],
];

/**
 * Checks a News form and returns clean fields, or errors. Drafts only need
 * the basics; `publishing` (the post will be live after this save) adds the
 * full appeal and source checks. Fields that don't belong to the chosen
 * category are cleared.
 */
export function validateNewsPost(input: NewsInput, publishing: boolean, now = new Date()): { ok: true; data: NewsFields } | { ok: false; errors: Record<string, string> } {
  const get = (key: string) => (input[key] ?? "").trim();
  const opt = (key: string) => get(key) || null;
  const errors: Record<string, string> = {};

  const category = get("category");
  if (!isNewsCategory(category)) return { ok: false, errors: { category: "Choose a category." } };
  const title = get("title");
  const summary = get("summary");
  const body = get("body");
  if (title.length < 4 || title.length > 120) errors.title = "Give it a headline between 4 and 120 characters.";
  if (summary.length < 10 || summary.length > 240) errors.summary = "Write a one or two sentence summary (10 to 240 characters).";
  if (body.length < 20 || body.length > 20000) errors.body = "Write the post (at least 20 characters).";

  const link = cleanNewsLink(get("linkUrl"));
  if (link === undefined) errors.linkUrl = "Use a full link starting https://, or a RoomsNow page like /advertise.";

  const data: NewsFields = {
    category, title, summary, body,
    linkUrl: link ?? null,
    linkLabel: get("linkLabel").slice(0, 40) || null,
    appealStatus: null, appealOrganiser: null, appealRelationship: null, appealPurpose: null,
    appealDonationRecipient: null, appealCharityRegistration: null, appealGiftAidStatus: null,
    appealDonateUrl: null, appealVolunteerUrl: null,
    sectorSourceName: null, sectorSourceUrl: null, sectorReviewedOn: null,
  };

  if (category === "CHARITY") {
    const status = get("appealStatus");
    if (status && status !== "OPEN" && status !== "CLOSED") errors.appealStatus = "Choose Open, Closed or No structured appeal.";
    if (status === "OPEN" || status === "CLOSED") {
      data.appealStatus = status;
      // The appeal's own Donate / Volunteer buttons replace the general button, so don't keep a stale one.
      data.linkUrl = null;
      data.linkLabel = null;
      for (const [key, max, label] of APPEAL_TEXT) {
        const value = opt(key);
        if (value && value.length > max) errors[key] = `${label}: keep it under ${max} characters.`;
        (data as Record<string, unknown>)[key] = value;
      }
      for (const key of ["appealDonateUrl", "appealVolunteerUrl"] as const) {
        const raw = get(key);
        if (!raw) continue;
        const url = httpsUrl(raw);
        if (!url) errors[key] = "Use a full https:// link.";
        else data[key] = url;
      }
      if (publishing) {
        for (const key of ["appealOrganiser", "appealRelationship", "appealPurpose"] as const) {
          if (!data[key]) errors[key] ??= "Needed before this appeal goes live.";
        }
        if (status === "OPEN" && !get("appealDonateUrl") && !get("appealVolunteerUrl")) {
          errors.appealDonateUrl ??= "An open appeal needs a donation page, a volunteer page, or both.";
        }
        if (get("appealDonateUrl")) {
          for (const key of ["appealDonationRecipient", "appealCharityRegistration", "appealGiftAidStatus"] as const) {
            if (!data[key]) errors[key] ??= "Needed when there's a donation link.";
          }
        }
      }
    }
  }

  if (category === "SECTOR") {
    data.sectorSourceName = opt("sectorSourceName");
    if (data.sectorSourceName && data.sectorSourceName.length > 160) errors.sectorSourceName = "Keep the source name under 160 characters.";
    const rawUrl = get("sectorSourceUrl");
    if (rawUrl) {
      const url = httpsUrl(rawUrl);
      if (!url) errors.sectorSourceUrl = "Use a full https:// link to the source.";
      else data.sectorSourceUrl = url;
    }
    const rawDate = get("sectorReviewedOn");
    if (rawDate) {
      const date = calendarDate(rawDate);
      if (!date) errors.sectorReviewedOn = "Enter a real date.";
      else {
        if (publishing && date > ukToday(now)) errors.sectorReviewedOn = "The review date can't be in the future.";
        data.sectorReviewedOn = new Date(`${date}T00:00:00.000Z`);
      }
    }
    if (publishing) {
      if (!data.sectorSourceName) errors.sectorSourceName ??= "Name the source before publishing.";
      if (!rawUrl) errors.sectorSourceUrl ??= "Link the source before publishing.";
      if (!rawDate) errors.sectorReviewedOn ??= "Add the date you last checked the source.";
    }
  }

  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, data };
}

/** Homepage banner wording for a pinned post; null means it shouldn't show. */
export function newsBannerCopy(category: string, appealStatus: string | null): { label: string; cta: string } | null {
  if (category === "CHARITY") {
    if (appealStatus === "CLOSED") return null;
    return appealStatus === "OPEN" ? { label: "Open charity appeal", cta: "View appeal" } : { label: "Charity spotlight", cta: "Read story" };
  }
  if (category === "SECTOR") return { label: "Housing sector news", cta: "Read article" };
  return { label: "RoomsNow update", cta: "Read update" };
}

/** Rough reading time at 200 words a minute, never less than 1. */
export function readMinutes(body: string): number {
  return Math.max(1, Math.ceil(body.trim().split(/\s+/).filter(Boolean).length / 200));
}

/** Solid pill colour per category, for cards with a photo behind them. */
export const NEWS_PILL: Record<string, string> = {
  ROOMSNOW: "bg-pine text-white",
  CHARITY: "bg-clay text-white",
  SECTOR: "bg-[#3a5a85] text-white",
};

/**
 * Who may edit a post: full admins edit everything; a moderator only edits
 * posts assigned to them (and can't create, delete, pin or reassign).
 */
export function canEditNews(user: { id: string; fullAdmin: boolean }, post: { assigneeId: string | null } | null): boolean {
  if (user.fullAdmin) return true;
  return Boolean(post && post.assigneeId === user.id);
}
