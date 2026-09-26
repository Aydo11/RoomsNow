import Link from "next/link";
import { db } from "@/lib/db";
import { DashboardShell, DataTable } from "@/components/dashboard-shell";
import { QuoteStatusPill } from "@/components/service-ui";
import { EmptyState } from "@/components/ui";
import { requireServiceBusiness } from "@/server/service-marketplace";
import { QUOTE_STATUS_LABELS, URGENCY_LABELS, type ServiceQuoteStatusValue } from "@/lib/service-marketplace";
import { money, shortDate } from "@/lib/format";
import { clsx } from "@/lib/clsx";
import { serviceProviderNav } from "../nav";

export const metadata = { title: "Quote requests" };
export const dynamic = "force-dynamic";

const FILTERS: Array<ServiceQuoteStatusValue | "OPEN" | "ALL"> = ["OPEN", "NEW", "QUOTED", "ACCEPTED", "COMPLETED", "ALL"];

export default async function ServiceQuotesPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status = "OPEN" } = await searchParams;
  const { user, business } = await requireServiceBusiness();
  const where =
    status === "ALL"
      ? {}
      : status === "OPEN"
        ? { status: { in: ["NEW", "VIEWED", "QUOTED", "ACCEPTED"] as ServiceQuoteStatusValue[] } }
        : status in QUOTE_STATUS_LABELS
          ? { status: status as ServiceQuoteStatusValue }
          : {};
  const [nav, quotes] = await Promise.all([
    serviceProviderNav(user.id),
    db.serviceQuoteRequest.findMany({
      where: { businessId: business.id, ...where },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: { id: true, service: true, location: true, urgency: true, status: true, createdAt: true, quoteAmount: true, company: { select: { name: true } } },
    }),
  ]);

  return (
    <DashboardShell title="Quote requests" subtitle="Requests from accommodation providers. Reply quickly — your typical response time is shown on your profile." nav={nav} active="/service-provider/quotes">
      <nav aria-label="Filter requests" className="mb-4 flex flex-wrap gap-1.5">
        {FILTERS.map((filter) => (
          <Link key={filter} href={`/service-provider/quotes?status=${filter}`} className={clsx("chip", status === filter && "chip-active")} aria-current={status === filter ? "page" : undefined}>
            {filter === "OPEN" ? "Open" : filter === "ALL" ? "All" : QUOTE_STATUS_LABELS[filter]}
          </Link>
        ))}
      </nav>
      {quotes.length === 0 ? (
        <EmptyState title="Nothing here" body="Quote requests from providers will appear here and in your messages." />
      ) : (
        <DataTable head={["Request", "Provider", "Urgency", "Status", "Quote", "Received"]}>
          {quotes.map((quote) => (
            <tr key={quote.id}>
              <td className="px-4 py-3">
                <Link href={`/service-provider/quotes/${quote.id}`} className="font-medium text-ink hover:underline">{quote.service}</Link>
                <span className="block text-[13px] text-ink-faint">{quote.location}</span>
              </td>
              <td className="px-4 py-3 text-ink-soft">{quote.company.name}</td>
              <td className="px-4 py-3 text-ink-soft">{URGENCY_LABELS[quote.urgency]}</td>
              <td className="px-4 py-3"><QuoteStatusPill status={quote.status} /></td>
              <td className="px-4 py-3 tabular-nums">{quote.quoteAmount !== null ? money(quote.quoteAmount) : "—"}</td>
              <td className="px-4 py-3 text-ink-soft">{shortDate(quote.createdAt)}</td>
            </tr>
          ))}
        </DataTable>
      )}
    </DashboardShell>
  );
}
