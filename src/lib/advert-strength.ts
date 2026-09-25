/**
 * Advert strength: how complete an advert is, as a 0–100 score with the next
 * few things a provider can add to improve it. It only looks at things
 * referrers and people searching rely on (photos, a video tour, rent, support
 * details, how to refer), so a higher score means a more useful advert, not
 * just a longer one. It's a pure function so it's cheap to run on every
 * advert and easy to test.
 */

export type AdvertStrengthInput = {
  id: string;
  summary: string | null;
  description: string | null;
  weeklyRentFrom: number | null;
  availableFrom: Date | string | null;
  minAge: number | null;
  maxAge: number | null;
  accessibilityNotes: string | null;
  wheelchairAccess: boolean;
  supportTypes: string[];
  supportDescription: string | null;
  referralRoutes: string[];
  referralProcess: string | null;
  houseRules: string | null;
  media: { type: string }[];
};

export type StrengthCheck = {
  key: string;
  /** What to do, written as an action ("Add a video tour"). */
  label: string;
  /** Why it matters, shown under the label. */
  why: string;
  /** Points available for this check. All checks add up to 100. */
  points: number;
  /** Points earned so far (partial credit for photos and description length). */
  earned: number;
  href: string;
};

export type AdvertStrength = {
  score: number;
  band: "needs-work" | "good" | "excellent";
  checks: StrengthCheck[];
  /** Unfinished checks, most valuable first. */
  todo: StrengthCheck[];
};

const PHOTO_TARGET = 5;
const DESCRIPTION_TARGET = 300;

const filled = (value: string | null | undefined, min = 1) => (value ?? "").trim().length >= min;

export function advertStrength(listing: AdvertStrengthInput): AdvertStrength {
  const edit = (step: number) => `/provider/adverts/${listing.id}/edit?step=${step}`;
  const media = `/provider/adverts/${listing.id}/media`;
  const photos = listing.media.filter((item) => item.type === "IMAGE").length;
  const hasVideo = listing.media.some((item) => item.type === "VIDEO" || item.type === "VIDEO_URL");
  const descriptionLength = (listing.description ?? "").trim().length;

  const checks: StrengthCheck[] = [
    {
      key: "photos",
      label: photos === 0 ? `Add at least ${PHOTO_TARGET} photos` : `Add ${Math.max(PHOTO_TARGET - photos, 0)} more photo${PHOTO_TARGET - photos === 1 ? "" : "s"}`,
      why: "Show the rooms, kitchen, bathroom and outside. Adverts with photos get far more enquiries.",
      points: 20,
      earned: Math.round((Math.min(photos, PHOTO_TARGET) / PHOTO_TARGET) * 20),
      href: media,
    },
    {
      key: "video",
      label: "Add a video tour",
      why: "Upload a short walk-through or paste a YouTube link, so referrers can see the home without visiting.",
      points: 10,
      earned: hasVideo ? 10 : 0,
      href: media,
    },
    {
      key: "description",
      label: descriptionLength === 0 ? "Describe the property" : "Say a bit more about the property",
      why: `Aim for at least ${DESCRIPTION_TARGET} characters on the rooms, the area and what makes it a good home.`,
      points: 15,
      earned: Math.round((Math.min(descriptionLength, DESCRIPTION_TARGET) / DESCRIPTION_TARGET) * 15),
      href: edit(4),
    },
    {
      key: "summary",
      label: "Add a one-line summary",
      why: "It's the first thing people read in search results.",
      points: 5,
      earned: filled(listing.summary, 20) ? 5 : 0,
      href: edit(2),
    },
    {
      key: "rent",
      label: "Add the weekly rent",
      why: "Referrers filter by budget, so adverts without a rent can be missed.",
      points: 10,
      earned: listing.weeklyRentFrom ? 10 : 0,
      href: edit(2),
    },
    {
      key: "availability",
      label: "Add an available-from date",
      why: "Tells referrers how soon someone could move in.",
      points: 5,
      earned: listing.availableFrom ? 5 : 0,
      href: edit(2),
    },
    {
      key: "ages",
      label: "Set the age range",
      why: "Helps match the right people to the room.",
      points: 5,
      earned: listing.minAge != null || listing.maxAge != null ? 5 : 0,
      href: edit(2),
    },
    {
      key: "accessibility",
      label: "Add accessibility details",
      why: "Steps, stairs, adaptations or wheelchair access: vital for people with mobility needs.",
      points: 5,
      earned: filled(listing.accessibilityNotes, 10) || listing.wheelchairAccess ? 5 : 0,
      href: edit(2),
    },
    {
      key: "support",
      label: "Describe the support you provide",
      why: "Choose the support categories and explain what's on offer. It's what matching is based on.",
      points: 10,
      earned: (listing.supportTypes.length > 0 ? 4 : 0) + (filled(listing.supportDescription, 60) ? 6 : 0),
      href: edit(3),
    },
    {
      key: "referrals",
      label: "Explain how to refer",
      why: "List who can refer and what happens next, so councils and support workers know the process.",
      points: 10,
      earned: (listing.referralRoutes.length > 0 ? 4 : 0) + (filled(listing.referralProcess, 30) ? 6 : 0),
      href: edit(3),
    },
    {
      key: "rules",
      label: "Add house rules",
      why: "Visitors, smoking, pets and quiet hours. Setting expectations early avoids problems later.",
      points: 5,
      earned: filled(listing.houseRules, 20) ? 5 : 0,
      href: edit(4),
    },
  ];

  const score = Math.min(100, checks.reduce((total, check) => total + check.earned, 0));
  const todo = checks
    .filter((check) => check.earned < check.points)
    .sort((a, b) => b.points - b.earned - (a.points - a.earned));

  return {
    score,
    band: score >= 80 ? "excellent" : score >= 50 ? "good" : "needs-work",
    checks,
    todo,
  };
}
