import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { findGuide, guides } from "@/lib/guides";
import { JsonLd, absoluteUrl, pageMetadata } from "@/lib/seo";

export function generateStaticParams() {
  return guides.map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const guide = findGuide(slug);
  if (!guide) return {};

  return pageMetadata({
    title: guide.title,
    description: guide.description,
    path: `/guides/${guide.slug}`,
  });
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = findGuide(slug);
  if (!guide) notFound();

  const path = `/guides/${guide.slug}`;
  const schemas = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: guide.title,
      description: guide.description,
      datePublished: guide.publishedAt,
      dateModified: guide.updatedAt,
      mainEntityOfPage: absoluteUrl(path),
      author: { "@type": "Organization", name: "RoomsNow", url: absoluteUrl("/") },
      publisher: { "@type": "Organization", name: "RoomsNow", url: absoluteUrl("/") },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
        { "@type": "ListItem", position: 2, name: "Guides", item: absoluteUrl("/guides") },
        { "@type": "ListItem", position: 3, name: guide.title, item: absoluteUrl(path) },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: guide.faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: { "@type": "Answer", text: faq.answer },
      })),
    },
  ];

  return (
    <>
      <JsonLd data={schemas} />
      <article>
        <header className="surface-home border-b border-line">
          <div className="shell py-12 sm:py-16">
            <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-[13px] text-ink-faint">
              <Link href="/" className="hover:text-pine-dark">Home</Link>
              <span aria-hidden="true">/</span>
              <Link href="/guides" className="hover:text-pine-dark">Guides</Link>
            </nav>
            <div className="mt-7 max-w-4xl">
              <span className="eyebrow">{guide.eyebrow}</span>
              <h1 className="mt-5 max-w-[21ch] text-[38px] font-bold leading-[1.1] sm:text-[52px]">{guide.title}</h1>
              <p className="mt-5 max-w-[70ch] text-[18px] leading-relaxed text-ink-soft">{guide.introduction}</p>
              <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-ink-faint">
                <span>{guide.audience}</span>
                <span>{guide.readTime}</span>
                <span>Updated 8 September 2026</span>
              </div>
            </div>
          </div>
        </header>

        <div className="shell grid gap-10 py-12 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start lg:py-16">
          <div className="max-w-3xl space-y-11">
            {guide.sections.map((section) => (
              <section key={section.heading}>
                <h2 className="text-[27px] leading-tight">{section.heading}</h2>
                {section.paragraphs && (
                  <div className="mt-4 space-y-4 text-[16px] leading-7 text-ink-soft">
                    {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                  </div>
                )}
                {section.bullets && (
                  <ul className="mt-4 space-y-3 text-[16px] leading-7 text-ink-soft">
                    {section.bullets.map((bullet) => (
                      <li key={bullet} className="flex gap-3">
                        <span aria-hidden="true" className="mt-[9px] h-2 w-2 shrink-0 rounded-full bg-pine" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}

            <section>
              <h2 className="text-[27px]">Frequently asked questions</h2>
              <div className="mt-5 space-y-3">
                {guide.faqs.map((faq) => (
                  <details key={faq.question} className="card group p-5">
                    <summary className="cursor-pointer list-none pr-8 text-[17px] font-semibold text-ink">{faq.question}</summary>
                    <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">{faq.answer}</p>
                  </details>
                ))}
              </div>
            </section>

            <section className="rounded-card border border-pine/25 bg-pine-light/35 p-6 sm:p-8">
              <h2 className="text-[25px]">{guide.cta.title}</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{guide.cta.body}</p>
              <Link href={guide.cta.href} className="btn-primary mt-5">{guide.cta.label}</Link>
            </section>
          </div>

          <aside className="card p-5 lg:sticky lg:top-24">
            <h2 className="text-[17px]">Useful official sources</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">Housing rules vary by nation and council. Use these sources to check the details for your situation.</p>
            <ul className="mt-4 space-y-3 text-[14px]">
              {guide.sources.map((source) => (
                <li key={source.href}>
                  <a href={source.href} target="_blank" rel="noreferrer" className="font-medium text-pine-dark hover:underline">{source.label} ↗</a>
                </li>
              ))}
            </ul>
            <div className="mt-5 border-t border-line pt-5">
              <Link href="/safety" className="text-[14px] font-semibold text-pine-dark hover:underline">Read RoomsNow safety advice →</Link>
            </div>
          </aside>
        </div>
      </article>
    </>
  );
}
