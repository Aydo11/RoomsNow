export const ACCREDITATION_SCHEMES = {
  CQC: {
    label: "Care Quality Commission (CQC)",
    description: "Official CQC registration or location rating. RoomsNow verifies the supplied record; it does not issue the rating.",
    ratings: ["Outstanding", "Good", "Requires improvement", "Inadequate", "Not yet rated"],
  },
  BVSC: {
    label: "BVSC",
    description: "Evidence-based BVSC recognition reviewed by the RoomsNow team.",
    ratings: ["Gold", "Silver", "Bronze"],
  },
  ROOMSNOW: {
    label: "RoomsNow quality assessment",
    description: "A RoomsNow evidence assessment. This is not a regulator rating or statutory inspection.",
    ratings: ["Gold", "Silver", "Bronze"],
  },
  OTHER: {
    label: "Other accreditation",
    description: "A relevant sector accreditation or membership supported by evidence.",
    ratings: [],
  },
} as const;

export type AccreditationScheme = keyof typeof ACCREDITATION_SCHEMES;

export function accreditationName(scheme: string, customName?: string) {
  if (scheme === "OTHER") return customName?.trim() || "Other accreditation";
  return ACCREDITATION_SCHEMES[scheme as AccreditationScheme]?.label ?? customName?.trim() ?? scheme;
}

export function allowedRating(scheme: string, rating: string) {
  if (scheme === "OTHER") return rating.length >= 2 && rating.length <= 60;
  const config = ACCREDITATION_SCHEMES[scheme as AccreditationScheme];
  return Boolean(config && (config.ratings as readonly string[]).includes(rating));
}

export function accreditationTone(rating?: string | null) {
  if (rating === "Gold" || rating === "Outstanding") return "border-amber-300 bg-amber-50 text-amber-900";
  if (rating === "Silver" || rating === "Good") return "border-slate-300 bg-slate-50 text-slate-800";
  if (rating === "Bronze") return "border-orange-300 bg-orange-50 text-orange-900";
  if (rating === "Requires improvement") return "border-yellow-300 bg-yellow-50 text-yellow-900";
  if (rating === "Inadequate") return "border-red-300 bg-red-50 text-red-800";
  return "border-blue-200 bg-blue-50 text-blue-900";
}
