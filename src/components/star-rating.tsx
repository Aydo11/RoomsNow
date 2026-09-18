/** Read-only star display shared by the referral page and company profile. */
export function Stars({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" }) {
  const dims = size === "md" ? "h-5 w-5" : "h-3.5 w-3.5";
  const rounded = Math.round(rating);
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`${rating.toFixed(1)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((value) => (
        <svg
          key={value}
          viewBox="0 0 20 20"
          className={`${dims} ${value <= rounded ? "text-clay" : "text-line-strong"}`}
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M10 1.5l2.6 5.6 6.1.6-4.6 4.1 1.3 6-5.4-3.1-5.4 3.1 1.3-6-4.6-4.1 6.1-.6L10 1.5Z" />
        </svg>
      ))}
    </span>
  );
}
