import "server-only";
import { brand } from "@/brand.config";
import { db } from "./db";
import { audit } from "./audit";
import { stripe, stripeCustomer } from "./billing";
import { cataloguePriceId, type CataloguePlan } from "./stripe-catalogue";
import { money } from "./format";
import { sendEmail } from "./notify";
import { PRO_BUYABLES, PRO_SERVICES, hourlyCharge, proBuyable, type ProBuyable } from "./pro-services";

/**
 * Card payments for Pro Services. Every item is a real Stripe product, found
 * by lookup key and created the first time it is needed (see stripe-catalogue),
 * so nothing has to be copied into Render.
 */

const ONE_OFF_HOURS_KEY = "pro_expert_hours";

export function proCataloguePlan(item: ProBuyable): CataloguePlan {
  return {
    key: `pro_${item.key}`,
    name: `RoomsNow Pro Services: ${item.label}`,
    description: `${PRO_SERVICES[item.service].name}. ${item.note}. Prices are plus VAT.`,
    unitAmount: item.amount,
    once: item.mode === "payment",
  };
}

export function expertHoursPlan(perHour: number): CataloguePlan {
  return {
    key: ONE_OFF_HOURS_KEY,
    name: "RoomsNow Pro Services: Expert session hours",
    description: "1:1 time with a RoomsNow housing manager, by video, phone or WhatsApp, with written action notes. Priced per hour, plus VAT.",
    unitAmount: perHour,
    once: true,
  };
}

/** Makes sure every Pro Services product and price exists in the connected Stripe account. */
export async function syncProCatalogue(hourlyRates: number[]) {
  const client = stripe();
  const plans = [...PRO_BUYABLES.map(proCataloguePlan), ...[...new Set(hourlyRates.flatMap((r) => [hourlyCharge(r, false), hourlyCharge(r, true)]))].map(expertHoursPlan)];
  for (const plan of plans) await cataloguePriceId(client, plan);
  return plans.length;
}

type Start = { companyId: string; userId: string; successUrl: string; cancelUrl: string };

/** Stripe Checkout for one Pro Services item, or for hours of expert time. */
export async function startProCheckout(params: Start & ({ item: string } | { hours: number; perHour: number; expertId?: string; expertName?: string })) {
  const client = stripe();
  const customer = await stripeCustomer(params.companyId);
  let price: string;
  let quantity = 1;
  let mode: "subscription" | "payment" = "payment";
  let label: string;
  let service: string;
  if ("item" in params) {
    const item = proBuyable(params.item);
    if (!item) throw new Error("That Pro Services item isn't available.");
    price = await cataloguePriceId(client, proCataloguePlan(item));
    mode = item.mode;
    label = item.label;
    service = item.service;
  } else {
    price = await cataloguePriceId(client, expertHoursPlan(params.perHour));
    quantity = params.hours;
    label = `Expert session, ${params.hours} hour${params.hours === 1 ? "" : "s"}${params.expertName ? ` with ${params.expertName}` : ""}`;
    service = "EXPERT";
  }
  const metadata = {
    kind: "pro_service",
    companyId: params.companyId,
    userId: params.userId,
    service,
    label,
    item: "item" in params ? params.item : ONE_OFF_HOURS_KEY,
    hours: "hours" in params ? String(params.hours) : "",
    expertId: "expertId" in params ? params.expertId ?? "" : "",
    expertName: "expertName" in params ? params.expertName ?? "" : "",
  };
  const session = await client.checkout.sessions.create({
    mode,
    customer,
    line_items: [{ price, quantity }],
    success_url: `${params.successUrl}${params.successUrl.includes("?") ? "&" : "?"}paid=1&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: params.cancelUrl,
    client_reference_id: params.companyId,
    billing_address_collection: "required",
    metadata,
    ...(mode === "subscription" ? { subscription_data: { metadata } } : { payment_intent_data: { metadata }, invoice_creation: { enabled: true } }),
  });
  if (!session.url) throw new Error("Stripe did not return a checkout page.");
  return session.url;
}

/**
 * A completed Pro Services checkout: logged as a won enquiry with a PS-
 * reference (so it shows in the admin pipeline), recorded as a payment for
 * one-off items (subscriptions are recorded from each paid invoice), and
 * emailed to the buyer and RoomsNow.
 */
export async function recordProPurchase(session: { id: string; amount_total: number | null; currency: string | null; metadata: Record<string, string> | null; subscription?: unknown; mode?: string | null }) {
  const m = session.metadata ?? {};
  const companyId = m.companyId;
  if (!companyId) return;
  const ref = `PS-${session.id.slice(-8).toUpperCase()}`;
  const existing = await db.proServiceEnquiry.findUnique({ where: { reference: ref }, select: { id: true } });
  if (existing) return;

  const [company, user] = await Promise.all([
    db.company.findUnique({ where: { id: companyId }, select: { name: true } }),
    m.userId ? db.user.findUnique({ where: { id: m.userId }, select: { id: true, firstName: true, lastName: true, email: true } }) : null,
  ]);
  if (!company || !user) return;
  const amount = session.amount_total ?? 0;
  const monthly = session.mode === "subscription";
  const paidLine = `${m.label}: ${money(amount)}${monthly ? " a month" : ""}, paid by card.`;

  await db.proServiceEnquiry.create({
    data: {
      reference: ref,
      service: m.service || "EXPERT",
      expertId: m.expertId || null,
      expertName: m.expertName || null,
      hours: m.hours ? Number(m.hours) : null,
      companyId,
      companyName: company.name,
      userId: user.id,
      contactName: `${user.firstName} ${user.lastName}`.trim(),
      contactEmail: user.email,
      message: `Paid online. ${paidLine}`,
      status: "WON",
    },
  });
  if (!monthly && amount > 0) {
    await db.payment.upsert({
      where: { externalPaymentId: `checkout:${session.id}` },
      create: { companyId, kind: "OTHER", amount, currency: (session.currency ?? "gbp").toUpperCase(), status: "PAID", description: `Pro Services: ${m.label}`, externalPaymentId: `checkout:${session.id}` },
      update: { status: "PAID" },
    });
  }
  await audit({ action: "pro_services.purchased", targetType: "Company", targetId: companyId, metadata: { reference: ref, item: m.item, amount } });

  const next = m.service === "EXPERT"
    ? "We'll be in touch within 1 working day to match you with a manager and book your first call."
    : "We'll be in touch within 1 working day to confirm the details and get started.";
  await Promise.all([
    sendEmail({
      to: user.email,
      subject: `Thank you: ${m.label} [${ref}]`,
      text: [`Hi ${user.firstName},`, `Thanks for buying ${m.label} for ${company.name}.`, paidLine, next, `Your reference is ${ref}. Keep it in the subject if you reply.`, `The ${brand.name} team`].join("\n\n"),
      replyTo: brand.supportEmail,
    }),
    sendEmail({
      to: brand.supportEmail,
      subject: `Pro Services paid: ${m.label}, ${company.name} [${ref}]`,
      text: [paidLine, `Company: ${company.name}`, `Buyer: ${user.firstName} ${user.lastName} <${user.email}>`, m.expertName ? `Manager chosen: ${m.expertName}` : "", `Stripe checkout: ${session.id}`].filter(Boolean).join("\n"),
    }),
  ]).catch((error) => console.error("Pro Services purchase email failed:", error));
}
