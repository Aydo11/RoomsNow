import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import { shortDate } from "@/lib/format";
import { optimisedImage } from "@/lib/image-url";
import { isNewsCategory, NEWS_CATEGORIES, type NewsCategory } from "@/lib/news";
import { publishedNews } from "@/server/news";

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
  const posts = await publishedNews(category);
  const tabs: Array<[string, string]> = [["All", "/news"], ...(Object.keys(NEWS_CATEGORIES) as NewsCategory[]).map((key): [string, string] => [NEWS_CATEGORIES[key].label, `/news?category=${key.toLowerCase()}`])];
  const activeHref = category ? `/news?category=${category.toLowerCase()}` : "/news";

  return (
    <>
      <section className="surface-home border-b border-line">
        <div className="shell py-12 sm:py-16">
          <span className="eyebrow">NEWS</span>
          <h1 className="mt-4 max-w-[22ch] text-[34px] leading-tight sm:text-[46px]">News, charities and sector updates</h1>
          <p className="mt-4 max-w-[62ch] text-[17px] leading-relaxed text-ink-soft">
            What's new at RoomsNow, charities doing good work that need support, and the latest from supported housing.
          </p>
          <nav aria-label="News categories" className="mt-6 flex flex-wrap gap-2">
            {tabs.map(([label, href]) => (
              <Link key={href} href={href} aria-current={href === activeHref ? "page" : undefined} className={href === activeHref ? "btn-primary" : "btn-secondary"}>
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </section>

      <div className="shell py-10">
        {posts.length === 0 ? (
          <p className="text-[16px] text-ink-soft">Nothing here yet. Check back soon.</p>
        ) : (
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => {
              const cat = isNewsCategory(post.category) ? NEWS_CATEGORIES[post.category] : null;
              return (
                <li key={post.id} className="card flex flex-col overflow-hidden">
                  <Link href={`/news/${post.slug}`} className="group flex flex-1 flex-col">
                    {post.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={optimisedImage(post.imageUrl, 400)} alt="" loading="lazy" className="aspect-[16/9] w-full object-cover" />
                    ) : (
                      <div className="aspect-[16/9] w-full bg-gradient-to-br from-pine/15 to-clay/10" aria-hidden="true" />
                    )}
                    <div className="flex flex-1 flex-col p-5">
                      <p className="flex items-center gap-2 text-[12.5px]">
                        {cat && <span className={`rounded-full px-2 py-0.5 font-semibold ${cat.tone}`}>{cat.short}</span>}
                        {post.category === "CHARITY" && post.appealStatus && <span className="rounded-full bg-paper-sunk px-2 py-0.5 font-semibold text-ink-soft">{post.appealStatus === "OPEN" ? "Open appeal" : "Closed appeal"}</span>}
                        <span className="text-ink-faint">{shortDate(post.publishedAt)}</span>
                      </p>
                      <h2 className="mt-2 text-[19px] leading-snug group-hover:underline">{post.title}</h2>
                      <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{post.summary}</p>
                      <span className="mt-auto pt-4 text-[14px] font-semibold text-pine-dark">Read more →</span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
