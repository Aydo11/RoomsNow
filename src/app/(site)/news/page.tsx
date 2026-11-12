import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import { isNewsCategory, NEWS_CATEGORIES, type NewsCategory } from "@/lib/news";
import { popularNews, publishedNews } from "@/server/news";
import { OverlayCard, PopularRow, StoryCard } from "@/components/news-cards";
import { NewsFeatured } from "@/components/news-featured";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ category?: string }> };

const pick = (value?: string): NewsCategory | undefined => {
  const key = value?.toUpperCase();
  return isNewsCategory(key) ? key : undefined;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const category = pick((await searchParams).category);
  return pageMetadata({
    title: category ? `${NEWS_CATEGORIES[category].label} | RoomsNow News` : "News, charity appeals and sector updates",
    description: "RoomsNow news, charities that need your help, and the latest from supported housing and HMOs across the UK.",
    path: category ? `/news?category=${category.toLowerCase()}` : "/news",
  });
}

export default async function NewsPage({ searchParams }: Props) {
  const category = pick((await searchParams).category);
  const [all, popular] = await Promise.all([publishedNews(category, 40), popularNews(4)]);
  // Pinned stories lead (closed appeals don't), then newest first.
  const posts = [...all].sort((a, b) => Number(b.pinned && b.appealStatus !== "CLOSED") - Number(a.pinned && a.appealStatus !== "CLOSED"));
  const featuredCount = posts.length >= 7 ? 3 : Math.min(1, posts.length);
  const featured = posts.slice(0, featuredCount);
  const trending = posts.slice(featuredCount, featuredCount + 3);
  const rest = posts.slice(featuredCount + trending.length);
  const tabs: Array<[string, string]> = [["All news", "/news"], ...(Object.keys(NEWS_CATEGORIES) as NewsCategory[]).map((key): [string, string] => [NEWS_CATEGORIES[key].label, `/news?category=${key.toLowerCase()}`])];
  const activeHref = category ? `/news?category=${category.toLowerCase()}` : "/news";
  const today = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", day: "numeric", month: "short", year: "numeric" }).format(new Date());

  return (
    <>
      <h1 className="sr-only">RoomsNow News{category ? `: ${NEWS_CATEGORIES[category].label}` : ""}</h1>
      <div className="border-b border-line bg-paper">
        <div className="shell flex flex-wrap items-center justify-between gap-x-6">
          <nav aria-label="News categories" className="-mb-px flex gap-1 overflow-x-auto">
            {tabs.map(([label, href]) => (
              <Link
                key={href}
                href={href}
                aria-current={href === activeHref ? "page" : undefined}
                className={`whitespace-nowrap border-b-[3px] px-3 py-3.5 text-[13px] font-semibold uppercase tracking-wide transition-colors ${href === activeHref ? "border-pine text-pine-dark" : "border-transparent text-ink-soft hover:border-line-strong hover:text-ink"}`}
              >
                {label}
              </Link>
            ))}
          </nav>
          <p className="hidden items-center gap-5 py-3 text-[13.5px] text-ink-soft sm:flex">
            <span>📍 United Kingdom</span>
            <span>📅 {today}</span>
          </p>
        </div>
      </div>

      <div className="shell py-8 sm:py-10">
        {posts.length === 0 ? (
          <p className="py-16 text-center text-[16px] text-ink-soft">Nothing here yet. Check back soon.</p>
        ) : (
          <>
            <section aria-label="Top stories" className={`grid gap-4 ${trending.length ? "lg:h-[500px] lg:grid-cols-2" : "lg:h-[460px]"}`}>
              <NewsFeatured slides={featured.map((post) => <OverlayCard key={post.id} post={post} label="Featured" size="lg" />)} />
              {trending.length > 0 && (
                <div className={`grid gap-4 ${trending.length > 1 ? "lg:grid-rows-2" : ""}`}>
                  <div className="h-[240px] lg:h-auto"><OverlayCard post={trending[0]} label="Trending" size="md" /></div>
                  {trending.length > 1 && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      {trending.slice(1).map((post) => (
                        <div key={post.id} className="h-[220px] lg:h-auto"><OverlayCard post={post} label="Trending" size="sm" /></div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </section>

            <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,1fr)_330px]">
              <section aria-label="More stories">
                {rest.length ? (
                  <ul className="grid gap-x-8 gap-y-12 sm:grid-cols-2">
                    {rest.map((post) => (
                      <li key={post.id}><StoryCard post={post} /></li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[15px] text-ink-soft">That's everything for now. New stories land here every week.</p>
                )}
              </section>
              {popular.length > 0 && (
                <aside aria-labelledby="popular-heading">
                  <h2 id="popular-heading" className="text-[22px] font-semibold">Popular</h2>
                  <ul className="mt-5 space-y-6">
                    {popular.map((post) => (
                      <li key={post.id}><PopularRow post={post} /></li>
                    ))}
                  </ul>
                </aside>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
