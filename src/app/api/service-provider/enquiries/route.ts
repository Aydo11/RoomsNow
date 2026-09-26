import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { csvResponse } from "@/lib/csv";
import { audit } from "@/lib/audit";
import { QUOTE_STATUS_LABELS, servicePlanFor, URGENCY_LABELS } from "@/lib/service-marketplace";

/** Spreadsheet formulas in user text can run when opened in Excel; neutralise them. */
const safe = (value: string | null | undefined) => (value && /^[=+\-@\t\r]/.test(value) ? `'${value}` : value ?? "");
const pounds = (pence: number | null) => (pence === null ? "" : (pence / 100).toFixed(2));

/** Downloadable enquiry report — a Marketplace Pro feature. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "SERVICE_PROVIDER") return new NextResponse("Not found", { status: 404 });
  const business = await db.serviceBusiness.findUnique({ where: { ownerId: user.id }, include: { subscription: true } });
  if (!business || !servicePlanFor(business.subscription)?.enquiryReports) return new NextResponse("Enquiry reports are part of Marketplace Pro.", { status: 403 });

  const quotes = await db.serviceQuoteRequest.findMany({
    where: { businessId: business.id },
    orderBy: { createdAt: "desc" },
    take: 5000,
    include: { company: { select: { name: true } }, advert: { select: { title: true } } },
  });
  await audit({ actorId: user.id, action: "service_business.enquiries_exported", targetType: "ServiceBusiness", targetId: business.id, metadata: { rows: quotes.length } });
  return csvResponse(
    `roomsnow-enquiries-${new Date().toISOString().slice(0, 10)}.csv`,
    ["Received", "Provider", "Advert", "Service", "Location", "Urgency", "Status", "Budget min (£)", "Budget max (£)", "Quote (£)", "Quoted", "Accepted", "Completed"],
    quotes.map((q) => [
      q.createdAt.toISOString().slice(0, 16).replace("T", " "),
      safe(q.company.name),
      safe(q.advert?.title),
      safe(q.service),
      safe(q.location),
      URGENCY_LABELS[q.urgency],
      QUOTE_STATUS_LABELS[q.status],
      pounds(q.budgetMin),
      pounds(q.budgetMax),
      pounds(q.quoteAmount),
      q.quotedAt?.toISOString().slice(0, 10) ?? "",
      q.acceptedAt?.toISOString().slice(0, 10) ?? "",
      q.completedAt?.toISOString().slice(0, 10) ?? "",
    ]),
  );
}
