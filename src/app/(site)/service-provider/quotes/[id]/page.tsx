import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { DashboardShell } from "@/components/dashboard-shell";
import { CompleteQuoteButton, QuoteResponseForm } from "@/components/service-forms";
import { PaymentsNote, QuoteStatusPill } from "@/components/service-ui";
import { requireServiceBusiness } from "@/server/service-marketplace";
import { quoteTransitionAllowed, URGENCY_LABELS } from "@/lib/service-marketplace";
import { dateTime, money, shortDate } from "@/lib/format";
import { serviceProviderNav } from "../../nav";

export const metadata = { title: "Quote request" };
export const dynamic = "force-dynamic";

type Attachment = { name: string; type: string; size: number };

export default async function ServiceQuotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, business } = await requireServiceBusiness();
  let quote = await db.serviceQuoteRequest.findFirst({
    where: { id, businessId: business.id },
    // Only what the business needs for the job: the organisation's name and
    // the person who asked. Never residents, referrals or other provider data.
    include: {
      company: { select: { name: true } },
      requester: { select: { firstName: true, lastName: true } },
      advert: { select: { id: true, title: true } },
      review: { select: { rating: true, comment: true } },
    },
  });
  if (!quote) notFound();
  if (quote.status === "NEW") {
    await db.serviceQuoteRequest.update({ where: { id: quote.id }, data: { status: "VIEWED", viewedAt: new Date() } });
    quote = { ...quote, status: "VIEWED", viewedAt: new Date() };
  }
  const nav = await serviceProviderNav(user.id);
  const attachments = (Array.isArray(quote.attachments) ? quote.attachments : []) as Attachment[];

  return (
    <DashboardShell
      title={quote.service}
      subtitle={`From ${quote.requester.firstName} ${quote.requester.lastName.charAt(0)}. at ${quote.company.name} · ${dateTime(quote.createdAt)}`}
      nav={nav}
      active="/service-provider/quotes"
      action={quote.conversationId ? <Link href={`/messages/${quote.conversationId}`} className="btn-secondary">Open conversation</Link> : undefined}
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <section className="card p-5">
            <div className="flex flex-wrap items-center gap-2"><QuoteStatusPill status={quote.status} /></div>
            <dl className="mt-4 grid gap-3 text-[14px] sm:grid-cols-2">
              <div><dt className="text-ink-faint">Where</dt><dd className="text-ink">{quote.location}</dd></div>
              <div><dt className="text-ink-faint">When</dt><dd className="text-ink">{URGENCY_LABELS[quote.urgency]}{quote.preferredDate ? ` · preferred ${shortDate(quote.preferredDate)}` : ""}</dd></div>
              <div><dt className="text-ink-faint">Budget</dt><dd className="text-ink">{quote.budgetMin !== null || quote.budgetMax !== null ? [quote.budgetMin, quote.budgetMax].filter((v) => v !== null).map((v) => money(v)).join(" – ") : "Not given"}</dd></div>
              <div><dt className="text-ink-faint">Advert</dt><dd>{quote.advert ? <Link className="text-brand hover:underline" href={`/service-provider/adverts/${quote.advert.id}`}>{quote.advert.title}</Link> : "—"}</dd></div>
            </dl>
            <h2 className="mt-5 text-[15px] font-semibold">Details</h2>
            <p className="mt-1 whitespace-pre-line text-[15px] leading-relaxed text-ink">{quote.description}</p>
            {attachments.length > 0 && (
              <ul className="mt-4 flex flex-wrap gap-2">
                {attachments.map((file, index) => (
                  <li key={index}>
                    <a className="chip" href={`/api/service-quotes/${quote.id}/files/${index}`} target="_blank" rel="noreferrer">{file.name}</a>
                  </li>
                ))}
              </ul>
            )}
          </section>
          {quote.quoteAmount !== null && (
            <section className="card p-5">
              <h2 className="text-[16px]">Your quote</h2>
              <p className="mt-1 font-display text-[26px]">{money(quote.quoteAmount)}</p>
              {quote.quoteValidUntil && <p className="text-[13px] text-ink-faint">Valid until {shortDate(quote.quoteValidUntil)}</p>}
              {quote.quoteNote && <p className="mt-2 whitespace-pre-line text-[14px] text-ink-soft">{quote.quoteNote}</p>}
            </section>
          )}
          {quote.review && (
            <section className="card p-5">
              <h2 className="text-[16px]">Their review</h2>
              <p className="mt-1 text-[14px]">{quote.review.rating} out of 5{quote.review.comment ? ` — “${quote.review.comment}”` : ""}</p>
              <Link href="/service-provider/reviews" className="mt-2 inline-block text-[14px] text-brand underline">Reply publicly</Link>
            </section>
          )}
        </div>
        <aside className="space-y-4">
          <QuoteResponseForm
            quoteId={quote.id}
            canQuote={quoteTransitionAllowed(quote.status, "QUOTED", "business")}
            canDecline={quoteTransitionAllowed(quote.status, "DECLINED", "business")}
            hasQuote={quote.quoteAmount !== null}
          />
          {quoteTransitionAllowed(quote.status, "COMPLETED", "business") && (
            <div className="card space-y-2 p-5">
              <h2 className="text-[16px]">Finished the job?</h2>
              <p className="text-[13px] text-ink-soft">Marking it complete lets the provider leave a review.</p>
              <CompleteQuoteButton quoteId={quote.id} />
            </div>
          )}
          <PaymentsNote />
        </aside>
      </div>
    </DashboardShell>
  );
}
