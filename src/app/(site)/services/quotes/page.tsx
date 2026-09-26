import Link from "next/link";
import { db } from "@/lib/db";
import { requireFullMarketplace } from "@/server/service-marketplace";
import { ServicesTabs } from "@/components/service-cards";
import { QuoteStatusPill } from "@/components/service-ui";
import { DataTable } from "@/components/dashboard-shell";
import { money, shortDate } from "@/lib/format";

export const metadata = { title: "Quote requests", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/** Every quote request the organisation has made, with received quotes grouped for comparison. */
export default async function BuyerQuotesPage() {
  const user = await requireFullMarketplace("/services/quotes");
  const companyIds = user.staffOf.map((s) => s.companyId);
  const quotes = await db.serviceQuoteRequest.findMany({
    where: { companyId: { in: companyIds } },
    orderBy: { createdAt: "desc" },
    take: 300,
    include: { business: { select: { name: true, tradingName: true, slug: true } } },
  });
  const quoted = quotes.filter((q) => q.status === "QUOTED" && q.quoteAmount !== null);
  const groups = new Map<string, typeof quoted>();
  for (const quote of quoted) {
    const key = quote.service.trim().toLowerCase();
    groups.set(key, [...(groups.get(key) ?? []), quote]);
  }
  const comparisons = [...groups.values()].filter((group) => group.length > 1).map((group) => [...group].sort((a, b) => a.quoteAmount! - b.quoteAmount!));

  return (
    <div className="shell py-6 sm:py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] sm:text-[30px]">Quote requests</h1>
          <p className="mt-1 text-[15px] text-ink-soft">Everything your organisation has asked for. Ask two or three businesses for the same job to compare.</p>
        </div>
        <ServicesTabs active="quotes" />
      </header>

      {comparisons.map((group) => (
        <section key={group[0].id} className="card mt-6 p-5" aria-label={`Compare quotes for ${group[0].service}`}>
          <h2 className="text-[18px]">Compare: {group[0].service}</h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {group.map((quote, index) => (
              <li key={quote.id} className="rounded-[12px] border border-line p-4">
                <p className="text-[13px] text-ink-soft">{quote.business.tradingName || quote.business.name}{index === 0 ? " · lowest" : ""}</p>
                <p className="font-display text-[24px]">{money(quote.quoteAmount)}</p>
                {quote.quoteValidUntil && <p className="text-[12px] text-ink-faint">Valid until {shortDate(quote.quoteValidUntil)}</p>}
                <Link href={`/services/quotes/${quote.id}`} className="mt-2 inline-block text-[14px] text-brand underline">View and accept</Link>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <div className="mt-6">
        {quotes.length === 0 ? (
          <div className="card p-6 text-[15px] text-ink-soft">No requests yet. <Link href="/services" className="text-brand underline">Find a service</Link> and request a quote.</div>
        ) : (
          <DataTable head={["Request", "Business", "Status", "Quote", "Sent"]}>
            {quotes.map((quote) => (
              <tr key={quote.id}>
                <td className="px-4 py-3"><Link href={`/services/quotes/${quote.id}`} className="font-medium hover:underline">{quote.service}</Link><span className="block text-[13px] text-ink-faint">{quote.location}</span></td>
                <td className="px-4 py-3 text-ink-soft">{quote.business.tradingName || quote.business.name}</td>
                <td className="px-4 py-3"><QuoteStatusPill status={quote.status} /></td>
                <td className="px-4 py-3 tabular-nums">{quote.quoteAmount !== null ? money(quote.quoteAmount) : "—"}</td>
                <td className="px-4 py-3 text-ink-soft">{shortDate(quote.createdAt)}</td>
              </tr>
            ))}
          </DataTable>
        )}
      </div>
    </div>
  );
}
