import Link from "next/link";
import { shortDate } from "@/lib/format";
import { optimisedImage } from "@/lib/image-url";
import { isNewsCategory, NEWS_CATEGORIES, NEWS_PILL, readMinutes } from "@/lib/news";

export type NewsCardPost = {
  id: string;
  slug: string;
  category: string;
  title: string;
  summary: string;
  body: string;
  imageUrl: string | null;
  appealStatus: string | null;
  publishedAt: Date | null;
  updatedAt: Date;
};

const short = (category: string) => (isNewsCategory(category) ? NEWS_CATEGORIES[category].label : "News");

export function CategoryPill({ category, appealStatus }: { category: string; appealStatus?: string | null }) {
  const label = category === "CHARITY" && appealStatus === "OPEN" ? "Charity appeal" : short(category);
  return <span className={`rounded-[6px] px-2 py-1 text-[11.5px] font-bold uppercase tracking-wide ${NEWS_PILL[category] ?? "bg-pine text-white"}`}>{label}</span>;
}

/** Photo, or a branded panel with the category name when a post has no photo. */
function Cover({ post, width, className, variant = "panel" }: { post: NewsCardPost; width: number; className: string; variant?: "panel" | "overlay" | "thumb" }) {
  if (post.imageUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={optimisedImage(post.imageUrl, width)} alt="" loading="lazy" className={`${className} object-cover`} />;
  }
  const tone = post.category === "CHARITY" ? "from-[#8a3d1f] to-[#c2673f]" : post.category === "SECTOR" ? "from-[#171F2E] to-[#2b4466]" : "from-[#0F4F87] to-[#1f7fcf]";
  return (
    <div aria-hidden="true" className={`${className} flex flex-col items-center bg-gradient-to-br ${tone} px-4 text-center text-white ${variant === "overlay" ? "justify-start pt-[18%]" : "justify-center"}`}>
      {variant === "thumb" ? (
        <span className="text-[11px] font-bold uppercase tracking-wider text-white/90">{post.category === "CHARITY" ? "Charity" : post.category === "SECTOR" ? "Sector" : "RoomsNow"}</span>
      ) : (
        <>
          <span className={`font-extrabold uppercase leading-none tracking-tight ${variant === "overlay" ? "text-[20px] text-white/35 sm:text-[26px]" : "text-[26px] sm:text-[32px]"}`}>{short(post.category)}</span>
          {variant === "panel" && <span className="mt-2 text-[13px] uppercase tracking-[0.2em] text-white/70">RoomsNow · {post.publishedAt ? shortDate(post.publishedAt) : ""}</span>}
        </>
      )}
    </div>
  );
}

/** Big photo card with the headline over a dark fade: used for Featured and Trending. */
export function OverlayCard({ post, label, size = "md" }: { post: NewsCardPost; label: string; size?: "lg" | "md" | "sm" }) {
  const title = size === "lg" ? "text-[22px] sm:text-[28px]" : size === "md" ? "text-[19px] sm:text-[23px]" : "text-[17px]";
  return (
    <Link href={`/news/${post.slug}`} className="group relative block h-full min-h-[200px] overflow-hidden rounded-card bg-[#171F2E]">
      <Cover post={post} variant="overlay" width={size === "lg" ? 900 : 600} className="absolute inset-0 h-full w-full transition-transform duration-500 group-hover:scale-[1.04]" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/30" aria-hidden="true" />
      <span className="absolute left-4 top-4 text-[14px] font-semibold text-white drop-shadow">{label}</span>
      <div className={`absolute inset-x-0 bottom-0 p-4 sm:p-5 ${size === "lg" ? "pb-11 sm:pb-12" : ""}`}>
        <h3 className={`${title} line-clamp-2 font-bold leading-tight text-white drop-shadow`}>{post.title}</h3>
        <p className="mt-2.5 flex items-center gap-2.5 text-[13px] text-white/90">
          <CategoryPill category={post.category} appealStatus={post.appealStatus} />
          {readMinutes(post.body)} min read
        </p>
      </div>
    </Link>
  );
}

/** Photo on top, headline and meta underneath: the main list. */
export function StoryCard({ post }: { post: NewsCardPost }) {
  return (
    <Link href={`/news/${post.slug}`} className="group block">
      <div className="relative overflow-hidden rounded-card">
        <Cover post={post} width={500} className="aspect-[16/10] w-full transition-transform duration-500 group-hover:scale-[1.04]" />
        <span className="absolute bottom-3 left-3"><CategoryPill category={post.category} appealStatus={post.appealStatus} /></span>
      </div>
      <h3 className="mt-4 line-clamp-2 text-[21px] font-semibold leading-snug group-hover:text-pine-dark">{post.title}</h3>
      <p className="mt-2 flex flex-wrap items-center gap-x-3 text-[13.5px] text-ink-soft">
        <span>{readMinutes(post.body)} min read</span>
        <span aria-hidden="true">•</span>
        <span>Published: {shortDate(post.publishedAt)}</span>
      </p>
    </Link>
  );
}

/** Small thumbnail row for the Popular sidebar. */
export function PopularRow({ post }: { post: NewsCardPost }) {
  return (
    <Link href={`/news/${post.slug}`} className="group flex gap-4">
      <div className="h-[70px] w-[100px] shrink-0 overflow-hidden rounded-[8px]">
        <Cover post={post} variant="thumb" width={120} className="h-full w-full" />
      </div>
      <div className="min-w-0">
        <p className="line-clamp-2 text-[15px] font-semibold leading-snug group-hover:text-pine-dark">{post.title}</p>
        <p className="mt-1.5 text-[12.5px] text-ink-soft">Updated: {shortDate(post.updatedAt)}</p>
      </div>
    </Link>
  );
}
