import "server-only";
import { db } from "@/lib/db";
import { summariseResidentReviews } from "@/lib/review-rules";

export type ReviewablePlacement = {
  kind: "request" | "referral";
  id: string;
  listingId: string;
  listingTitle: string;
  companyName: string;
  review: {
    rating: number;
    feelSafe: boolean | null;
    supportHelpful: boolean | null;
    comment: string | null;
    stillLivingThere: boolean;
    providerReply: string | null;
    hiddenAt: Date | null;
  } | null;
};

const REVIEW_SELECT = {
  rating: true,
  feelSafe: true,
  supportHelpful: true,
  comment: true,
  stillLivingThere: true,
  providerReply: true,
  hiddenAt: true,
} as const;

/**
 * Placements this person can review: their own requests that reached MOVED_IN,
 * and referrals made for them (matched on a verified email) that did.
 */
export async function reviewablePlacements(user: { id: string; email: string; emailVerified: Date | null }): Promise<ReviewablePlacement[]> {
  const [requests, referrals] = await Promise.all([
    db.accommodationRequest.findMany({
      where: { applicantId: user.id, status: "MOVED_IN" },
      select: { id: true, listing: { select: { id: true, title: true, company: { select: { name: true } } } } },
    }),
    user.emailVerified
      ? db.referral.findMany({
          where: { applicantEmail: { equals: user.email, mode: "insensitive" }, status: "MOVED_IN", listingId: { not: null } },
          select: { id: true, listing: { select: { id: true, title: true, company: { select: { name: true } } } } },
        })
      : Promise.resolve([]),
  ]);
  const reviews = await db.residentReview.findMany({
    where: {
      authorId: user.id,
      OR: [{ requestId: { in: requests.map((r) => r.id) } }, { referralId: { in: referrals.map((r) => r.id) } }],
    },
    select: { ...REVIEW_SELECT, requestId: true, referralId: true },
  });

  return [
    ...requests.map((request) => ({
      kind: "request" as const,
      id: request.id,
      listingId: request.listing.id,
      listingTitle: request.listing.title,
      companyName: request.listing.company.name,
      review: reviews.find((review) => review.requestId === request.id) ?? null,
    })),
    ...referrals.flatMap((referral) =>
      referral.listing
        ? [
            {
              kind: "referral" as const,
              id: referral.id,
              listingId: referral.listing.id,
              listingTitle: referral.listing.title,
              companyName: referral.listing.company.name,
              review: reviews.find((review) => review.referralId === referral.id) ?? null,
            },
          ]
        : [],
    ),
  ];
}

export type PublicResidentReview = {
  id: string;
  rating: number;
  feelSafe: boolean | null;
  supportHelpful: boolean | null;
  comment: string | null;
  stillLivingThere: boolean;
  createdAt: Date;
  providerReply: string | null;
  providerReplyAt: Date | null;
  listingTitle: string | null;
};

/** Published reviews for a provider, newest first, plus the summary figures. */
export async function residentReviewsFor(companyId: string, options: { take?: number; listingFirst?: string } = {}) {
  const rows = await db.residentReview.findMany({
    where: { companyId, hiddenAt: null },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      rating: true,
      feelSafe: true,
      supportHelpful: true,
      comment: true,
      stillLivingThere: true,
      createdAt: true,
      providerReply: true,
      providerReplyAt: true,
      listingId: true,
      listing: { select: { title: true } },
    },
    take: 200,
  });
  const summary = summariseResidentReviews(rows);
  const ordered = options.listingFirst
    ? [...rows.filter((row) => row.listingId === options.listingFirst), ...rows.filter((row) => row.listingId !== options.listingFirst)]
    : rows;
  const reviews: PublicResidentReview[] = ordered.slice(0, options.take ?? 6).map(({ listing, listingId: _listingId, ...row }) => ({
    ...row,
    listingTitle: listing?.title ?? null,
  }));
  return { summary, reviews };
}
