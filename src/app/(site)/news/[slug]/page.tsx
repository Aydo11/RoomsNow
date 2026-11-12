import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { absoluteUrl, JsonLd, pageMetadata } from "@/lib/seo";
import { shortDate } from "@/lib/format";
import { optimisedImage } from "@/lib/image-url";
import { defaultLinkLabel, isNewsCategory, NEWS_CATEGORIES, newsParagraphs, ukLongDate } from "@/lib/news";
import { newsPostBySlug } from "@/server/news";
import { ShareNewsButton } from "@/components/share-news-button";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await newsPostBySlug((await params).slug);
  if (!post) return { title: "News" };
  const meta = pageMetadata({ title: post.title, description: post.summary, path: `/news/${post.slug}` });
  // A branded card with the headline, drawn by /news-card/[slug].
  const card = absoluteUrl(`/news-card/${post.slug}`);
  if (meta.openGraph) {
    meta.openGraph.images = [{ url: card, width: 1200, height: 630, type: "image/png", alt: `RoomsNow News: ${post.title}` }];
    Object.assign(meta.openGraph, { type: "article", publishedTime: post.publishedAt?.toISOString() });
  }
  if (meta.twitter) meta.twitter.images = [card];
  return meta;
}

export default async function NewsPostPage({ params }: Props) {
  const post = await newsPostBySlug((await params).slug);
  if (!post) notFound();
  const category = isNewsCategory(post.category) ? post.category : null;
  const cat = category ? NEWS_CATEGORIES[category] : null;
  const appeal = category === "CHARITY" ? post.appealStatus : null;
  const external = post.linkUrl && !post.linkUrl.startsWith("/");
  // A structured appeal has its own Donate / Volunteer buttons instead of the general one.
  const button = !appeal && post.linkUrl && (
    <a
      href={post.linkUrl}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className="btn-primary"
    >
      {post.linkLabel || defaultLinkLabel(category ?? "ROOMSNOW")}
      {external && <span aria-hidden="true"> ↗</span>}
    </a>
  );

  return (
    <article className="shell max-w-3xl py-10 sm:py-14">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "NewsArticle",
          headline: post.title,
          description: post.summary,
          datePublished: post.publishedAt?.toISOString(),
          dateModified: post.updatedAt.toISOString(),
          image: post.imageUrl ? [post.imageUrl] : undefined,
          mainEntityOfPage: absoluteUrl(`/news/${post.slug}`),
          publisher: { "@type": "Organization", name: "RoomsNow" },
        }}
      />
      <p className="text-[14px]"><Link href="/news" className="text-pine-dark hover:underline">← All news</Link></p>
      <p className="mt-6 flex items-center gap-2 text-[13px]">
        {cat && (
          <Link href={`/news?category=${category!.toLowerCase()}`} className={`rounded-full px-2.5 py-0.5 font-semibold ${cat.tone}`}>{cat.label}</Link>
        )}
        {appeal && <span className={`rounded-full px-2.5 py-0.5 font-semibold ${appeal === "OPEN" ? "bg-pine text-white" : "bg-paper-sunk text-ink-soft"}`}>{appeal === "OPEN" ? "Open appeal" : "Closed appeal"}</span>}
        <time dateTime={post.publishedAt?.toISOString()} className="text-ink-faint">{shortDate(post.publishedAt)}</time>
      </p>
      <h1 className="mt-3 text-[32px] leading-tight sm:text-[42px]">{post.title}</h1>
      <p className="mt-4 text-[19px] leading-relaxed text-ink-soft">{post.summary}</p>
      <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[14px] text-ink-soft">
        <span>Published by <strong className="font-semibold text-ink">RoomsNow</strong></span>
        <ShareNewsButton url={absoluteUrl(`/news/${post.slug}`)} title={post.title} />
        {category === "SECTOR" && post.sectorSourceName && post.sectorSourceUrl && (
          <span>
            Source:{" "}
            <a href={post.sectorSourceUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-pine-dark underline-offset-4 hover:underline">
              {post.sectorSourceName}<span className="sr-only"> (opens in a new tab)</span><span aria-hidden="true"> ↗</span>
            </a>
          </span>
        )}
        {category === "SECTOR" && post.sectorReviewedOn && <span>Last reviewed {ukLongDate(post.sectorReviewedOn)}</span>}
      </p>
      {button && <div className="mt-6">{button}</div>}
      {post.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={optimisedImage(post.imageUrl, 900)} alt="" className="mt-8 w-full rounded-card border border-line object-cover" />
      )}
      {appeal && <AppealPanel post={post} open={appeal === "OPEN"} />}
      <div className="mt-8 space-y-5 text-[17px] leading-relaxed">
        {newsParagraphs(post.body).map((p, i) => (
          <p key={i} className="whitespace-pre-line">{p}</p>
        ))}
      </div>
      {button && (
        <div className="card mt-10 flex flex-wrap items-center justify-between gap-4 p-5">
          <p className="text-[16px] font-semibold">{category === "CHARITY" ? "Can you help?" : "Want to know more?"}</p>
          {button}
        </div>
      )}
    </article>
  );
}

type AppealPost = {
  appealOrganiser: string | null;
  appealRelationship: string | null;
  appealPurpose: string | null;
  appealDonationRecipient: string | null;
  appealCharityRegistration: string | null;
  appealGiftAidStatus: string | null;
  appealDonateUrl: string | null;
  appealVolunteerUrl: string | null;
};

/** Who's behind a charity appeal and where the money goes, right next to the buttons. */
function AppealPanel({ post, open }: { post: AppealPost; open: boolean }) {
  const rows: Array<[string, string | null]> = [
    ["Organised by", post.appealOrganiser],
    ["Relationship to RoomsNow", post.appealRelationship],
    ["What this appeal supports", post.appealPurpose],
    ["Who receives donations", post.appealDonationRecipient],
    ["Charity registration", post.appealCharityRegistration],
    ["Gift Aid", post.appealGiftAidStatus],
  ];
  const routes = open
    ? [["Go to donation page", post.appealDonateUrl], ["Volunteer", post.appealVolunteerUrl]].flatMap(([label, url]) => (url ? [[label as string, url] as const] : []))
    : [];
  return (
    <section aria-labelledby="appeal-heading" className="card mt-8 border-pine/30 p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <h2 id="appeal-heading" className="text-[20px]">Charity appeal</h2>
        <span className={`rounded-full px-2.5 py-0.5 text-[12.5px] font-semibold ${open ? "bg-pine text-white" : "bg-paper-sunk text-ink-soft"}`}>{open ? "Open" : "Closed"}</span>
      </div>
      {!open && <p className="mt-2 text-[15px] text-ink-soft">This appeal has closed.</p>}
      <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
        {rows.filter(([, v]) => v).map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="text-[12.5px] font-semibold uppercase tracking-wide text-ink-faint">{label}</dt>
            <dd className="mt-0.5 break-words text-[15px]">{value}</dd>
          </div>
        ))}
      </dl>
      {routes.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-3">
          {routes.map(([label, url], i) => (
            <a key={label} href={url} target="_blank" rel="noopener noreferrer" className={i === 0 ? "btn-primary" : "btn-secondary"}>
              {label}<span className="sr-only"> (opens in a new tab)</span><span aria-hidden="true"> ↗</span>
            </a>
          ))}
        </div>
      )}
      {open && post.appealDonateUrl && <p className="mt-3 text-[13px] text-ink-faint">You'll leave RoomsNow to make your donation.</p>}
    </section>
  );
}
