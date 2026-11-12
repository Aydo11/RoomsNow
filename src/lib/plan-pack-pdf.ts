import { A4, PdfDoc, hex, textWidth } from "./pdf";
import { C, bullets, cover, heading } from "./pro-pack-pdf";
import { money } from "./format";
import { PLAN_GUIDES, PLAN_GUIDE_KEYS, guidePrices, saleLines, type PlanGuideKey, type PlanPrices } from "./plan-guides";

/** Downloadable PDF guides for the pricing page: one plan or extra, or all of them. */

function priceRows(doc: PdfDoc, key: PlanGuideKey, prices: PlanPrices) {
  for (const p of guidePrices(key, prices)) {
    const h = p.note ? 46 : 32;
    doc.ensure(h + 8);
    const top = doc.y - 6;
    doc.rect(doc.margin.side, top - h, doc.width, h, C.paper, C.mist);
    doc.text(p.label, doc.margin.side + 14, top - 20, 11.5, C.navy, true);
    const right = A4.w - doc.margin.side - 14;
    doc.text(p.price, right - textWidth(p.price, 12.5, true), top - 20, 12.5, C.blue, true);
    if (p.was) {
      const was = `was ${p.was}`;
      const x = right - textWidth(p.price, 12.5, true) - 10 - textWidth(was, 10);
      doc.text(was, x, top - 20, 10, C.faint);
      doc.line(x, top - 16.5, x + textWidth(was, 10), top - 16.5, C.faint);
    }
    if (p.note) doc.text(p.note, doc.margin.side + 14, top - 37, 9.5, p.was ? hex("#B4532A") : C.soft, Boolean(p.was));
    doc.y = top - h - 4;
  }
}

function guideBody(doc: PdfDoc, key: PlanGuideKey, prices: PlanPrices, site: string) {
  const g = PLAN_GUIDES[key];
  heading(doc, "Who it's for");
  doc.para(g.whoFor, { color: C.ink, after: 2 });
  heading(doc, "Prices");
  priceRows(doc, key, prices);
  heading(doc, "What you get, in detail");
  for (const item of g.details) {
    doc.ensure(40);
    doc.para(item.title, { bold: true, size: 11, color: C.navy, after: 1 });
    doc.para(item.body, { size: 10.5, color: C.soft, after: 6 });
  }
  heading(doc, "How to use it");
  bullets(doc, g.steps, { numbered: true });
  heading(doc, "Watch the demo");
  const url = `${site}/demos/${g.slug}`;
  doc.para(`${g.demo.captions.join(" → ")}.`, { color: C.ink });
  doc.ensure(18);
  doc.y -= 15;
  doc.text(url, doc.margin.side, doc.y + 3, 10.5, C.blue, true);
  doc.link(doc.margin.side, doc.y, textWidth(url, 10.5, true), 14, url);
  doc.y -= 4;
}

function saleSection(doc: PdfDoc, prices: PlanPrices) {
  const sale = saleLines(prices);
  if (!sale.length) return;
  heading(doc, "Limited-time offer");
  bullets(doc, sale.map((s) => `${s.name}: ${money(s.now)} a month instead of ${money(s.was)}. You save ${money(s.monthly)} a month (${s.percent}% off), ${money(s.yearly)} over a year.`));
  doc.para("You pay the offer price shown at checkout. Cancel any time from your Membership page.", { size: 9.5, color: C.faint, after: 2 });
}

function closing(doc: PdfDoc, site: string) {
  doc.ensure(86);
  doc.y -= 16;
  const top = doc.y;
  doc.rect(doc.margin.side, top - 70, doc.width, 70, C.navy);
  doc.text("Ready to start?", doc.margin.side + 16, top - 24, 13, C.white, true);
  doc.text(`Choose a plan at ${site.replace(/^https?:\/\//, "")}/pricing. People looking for a room always use RoomsNow free.`, doc.margin.side + 16, top - 42, 9.5, hex("#D6E8F8"));
  doc.text("info@roomsnow.co.uk   ·   roomsnow.co.uk", doc.margin.side + 16, top - 58, 10, hex("#9CC9F2"), true);
  doc.link(doc.margin.side + 16, top - 62, 260, 14, "mailto:info@roomsnow.co.uk");
  doc.y = top - 76;
}

export function buildPlanPack(key: PlanGuideKey | "ALL", prices: PlanPrices, o: { siteUrl?: string; date?: Date } = {}): Buffer {
  const site = (o.siteUrl ?? "https://www.roomsnow.co.uk").replace(/\/$/, "");
  const doc = new PdfDoc({ top: 56, bottom: 64, side: 50 }, (d) => {
    if (d.pages.length === 1) return;
    d.rect(0, A4.h - 30, A4.w, 30, C.navy);
    d.text("RoomsNow membership and pricing", d.margin.side, A4.h - 19, 9, C.white, true);
    d.y = A4.h - 50;
  });
  const eyebrow = "MEMBERSHIP & PRICING · GUIDE";
  if (key === "ALL") {
    cover(doc, "Plans, boosts and sponsorship", "Every RoomsNow plan and paid extra: what it includes, how to use it and what it costs.", { date: o.date }, eyebrow);
    saleSection(doc, prices);
    heading(doc, "In this guide");
    bullets(doc, PLAN_GUIDE_KEYS.map((k) => `${PLAN_GUIDES[k].name}: ${PLAN_GUIDES[k].headline}`));
    for (const k of PLAN_GUIDE_KEYS) {
      doc.addPage();
      doc.para(PLAN_GUIDES[k].group.toUpperCase(), { size: 9, bold: true, color: C.blue });
      doc.para(`${PLAN_GUIDES[k].name}: ${PLAN_GUIDES[k].headline}`, { size: 18, bold: true, color: C.navy, leading: 23, after: 4 });
      guideBody(doc, k, prices, site);
    }
  } else {
    cover(doc, PLAN_GUIDES[key].name, PLAN_GUIDES[key].headline, { date: o.date }, eyebrow);
    if (key === "PROFESSIONAL" || key === "BUSINESS") saleSection(doc, prices);
    guideBody(doc, key, prices, site);
  }
  closing(doc, site);
  return doc.toBuffer((d, i, total) => {
    d.line(d.margin.side, 44, A4.w - d.margin.side, 44, C.mist);
    d.text("RoomsNow · Prices are correct on the date shown and may change.", d.margin.side, 30, 8, C.faint);
    const pg = `Page ${i + 1} of ${total}`;
    d.text(pg, A4.w - d.margin.side - textWidth(pg, 8), 30, 8, C.faint);
  });
}

export const planFileName = (key: PlanGuideKey | "ALL") => `RoomsNow-${key === "ALL" ? "pricing-guide" : PLAN_GUIDES[key].slug}.pdf`;
