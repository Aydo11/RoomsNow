import Link from "next/link";
import { JsonLd, absoluteUrl } from "@/lib/seo";

export type LandingPageContent = {
  path: string;
  eyebrow: string;
  title: string;
  introduction: string;
  sections: Array<{ heading: string; paragraphs: string[] }>;
  highlights: Array<{ heading: string; body: string }>;
  faqs: Array<{ question: string; answer: string }>;
  primaryCta: { label: string; href: string };
  secondaryCta: { label: string; href: string };
};

export function SeoLandingPage({ content }: { content: LandingPageContent }) {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: content.faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
      { "@type": "ListItem", position: 2, name: content.title, item: absoluteUrl(content.path) },
    ],
  };

  return (
    <>
      <JsonLd data={[faqSchema, breadcrumbSchema]} />
      <section className="surface-home border-b border-line">
        <div className="shell py-14 sm:py-20">
          <span className="eyebrow">{content.eyebrow}</span>
          <h1 className="mt-5 max-w-[19ch] text-[40px] font-bold leading-[1.08] sm:text-[54px]">{content.title}</h1>
          <p className="mt-5 max-w-[68ch] text-[18px] leading-relaxed text-ink-soft">{content.introduction}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={content.primaryCta.href} className="btn-primary">{content.primaryCta.label}</Link>
            <Link href={content.secondaryCta.href} className="btn-secondary">{content.secondaryCta.label}</Link>
          </div>
        </div>
      </section>

      <div className="shell py-12 sm:py-16">
        <section className="grid gap-4 md:grid-cols-3" aria-label="Key benefits">
          {content.highlights.map((item) => (
            <article key={item.heading} className="card border-t-4 border-t-pine p-6">
              <h2 className="text-[20px]">{item.heading}</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{item.body}</p>
            </article>
          ))}
        </section>

        <div className="mx-auto mt-14 max-w-3xl space-y-10">
          {content.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-[28px]">{section.heading}</h2>
              <div className="mt-3 space-y-4 text-[16px] leading-7 text-ink-soft">
                {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </div>
            </section>
          ))}

          <section>
            <h2 className="text-[28px]">Frequently asked questions</h2>
            <div className="mt-5 space-y-3">
              {content.faqs.map((faq) => (
                <details key={faq.question} className="card group p-5">
                  <summary className="cursor-pointer list-none pr-8 text-[17px] font-semibold text-ink">{faq.question}</summary>
                  <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">{faq.answer}</p>
                </details>
              ))}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
