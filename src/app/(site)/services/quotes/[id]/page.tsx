import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireFullMarketplace } from "@/server/service-marketplace";
import { ServicesTabs } from "@/components/service-cards";
import { BuyerQuoteActions, ServiceReviewForm } from "@/components/service-buyer-forms";
import { BusinessLogo, PaymentsNote, QuoteStatusPill } from "@/components/service-ui";
import { canReviewQuote, URGENCY_LABELS } from "@/lib/service-marketplace";
import { dateTime, money, shortDate } from "@/lib/format";

export const metadata = { title: "Quote request", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type Attachment = { name: string };

export default async function BuyerQuotePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ sent?: string }> }) {
  const [{ id }, { sent }] = await Promise.all([params, searchParams]);
  const user = await requireFullMarketplace(`/services/quotes/${id}`);
  const companyIds = user.staffOf.map((s) => s.companyId);
  const quote = await db.serviceQuoteRequest.findFirst({
    where: { id, companyId: { in: companyIds } },
    include: { business: { select: { name: true, tradingName: true, slug: true, logoUrl: true } }, advert: { select: { id: true, title: true } }, review: { select: { id: true } } },
  });
  if (!quote) notFound();
  const name = quote.business.tradingName || quote.business.name;
  const attachments = (Array.isArray(quote.attachments) ? quote.attachments : []) as Attachment[];
  const reviewable = canReviewQuote({ status: quote.status, companyId: quote.companyId, hasReview: Boolean(quote.review) }, companyIds) && user.role === "PROVIDER";

  return (
    <div className="shell py-6 sm:py-8">
      <div className="flex justify-end"><ServicesTabs active="quotes" /></div>
      {sent && <p className="mt-4 rounded-[10px] bg-pine-light px-4 py-3 text-[14px] text-pine-dark" role="status">Sent. {name} has been notified — you&apos;ll get a message when they reply.</p>}
      <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <header className="card flex flex-wrap items-start gap-4 p-5">
            <BusinessLogo src={quote.business.logoUrl} name={name} size={52} />
            <div className="min-w-0 flex-1">
              <Link href={`/services/business/${quote.business.slug}`} className="text-[14px] font-medium text-brand hover:underline">{name}</Link>
              <h1 className="text-[24px] leading-tight">{quote.service}</h1>
              <p className="text-[13px] text-ink-faint">Sent {dateTime(quote.createdAt)}{quote.advert ? ` · about ${quote.advert.title}` : ""}</p>
            </div>
            <QuoteStatusPill status={quote.status} />
          </header>

          {quote.quoteAmount !== null && (
            <section className="card p-5">
              <h2 className="text-[16px]">Their quote</h2>
              <p className="mt-1 font-display text-[32px]">{money(quote.quoteAmount)}</p>
              {quote.quoteValidUntil && <p className="text-[13px] text-ink-faint">Valid until {shortDate(quote.quoteValidUntil)}</p>}
              {quote.quoteNote && <p className="mt-3 whitespace-pre-line text-[15px]">{quote.quoteNote}</p>}
            </section>
          )}
          {quote.status === "DECLINED" && quote.declineReason && <section className="card p-5 text-[15px]"><h2 className="text-[16px]">Reason</h2><p className="mt-1">{quote.declineReason}</p></section>}

          <section className="card p-5">
            <h2 className="text-[16px]">Your request</h2>
            <dl className="mt-3 grid gap-3 text-[14px] sm:grid-cols-2">
              <div><dt className="text-ink-faint">Where</dt><dd>{quote.location}</dd></div>
              <div><dt className="text-ink-faint">When</dt><dd>{URGENCY_LABELS[quote.urgency]}{quote.preferredDate ? ` · preferred ${shortDate(quote.preferredDate)}` : ""}</dd></div>
              <div><dt className="text-ink-faint">Budget</dt><dd>{quote.budgetMin !== null || quote.budgetMax !== null ? [quote.budgetMin, quote.budgetMax].filter((v) => v !== null).map((v) => money(v)).join(" – ") : "Not given"}</dd></div>
            </dl>
            <p className="mt-3 whitespace-pre-line text-[15px]">{quote.description}</p>
            {attachments.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-2">{attachments.map((file, index) => <li key={index}><a className="chip" href={`/api/service-quotes/${quote.id}/files/${index}`} target="_blank" rel="noreferrer">{file.name}</a></li>)}</ul>
            )}
          </section>

          {reviewable && (
            <section className="card p-5">
              <h2 className="text-[18px]">Review {name}</h2>
              <p className="mb-4 mt-1 text-[14px] text-ink-soft">Your review is public and marked as a verified job. The business can reply but can&apos;t change it.</p>
              <ServiceReviewForm quoteId={quote.id} />
            </section>
          )}
          {quote.review && <p className="text-[14px] text-ink-soft">Thanks — you&apos;ve reviewed this job.</p>}
        </div>
        <aside className="space-y-4">
          {user.role === "PROVIDER" && (
            <div className="card space-y-3 p-5">
              <h2 className="text-[16px]">Next step</h2>
              <BuyerQuoteActions quoteId={quote.id} status={quote.status} />
              {quote.conversationId && <Link href={`/messages/${quote.conversationId}`} className="btn-ghost w-full">Open conversation</Link>}
            </div>
          )}
          <PaymentsNote />
        </aside>
      </div>
    </div>
  );
}
