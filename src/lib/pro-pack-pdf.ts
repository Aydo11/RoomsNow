import { PdfDoc, A4, hex, textWidth, wrap } from "./pdf";
import { ADVICE_FORMATS, DEMO_SLUG, DEMO_STORIES, HOW_IT_WORKS_STEPS, PRO_SERVICES, PRO_SERVICE_KEYS, SESSION_STEPS, type ProServiceKey } from "./pro-services";

/**
 * The RoomsNow Pro Services information pack as a PDF: one service, or all four.
 * Generic RoomsNow branding; prices come straight from PRO_SERVICES so the PDF
 * never drifts from the website. An emailed copy is stamped with the reference.
 */

export const C = { navy: hex("#171F2E"), blue: hex("#1666AA"), sky: hex("#549DE5"), mist: hex("#DCE8F5"), paper: hex("#F4F7FB"), ink: hex("#171F2E"), soft: hex("#4A5568"), faint: hex("#8A94A6"), white: hex("#FFFFFF"), green: hex("#2E9E6B"), amber: hex("#F5B544") };

export type PackOptions = { reference?: string; preparedFor?: string; date?: Date; siteUrl?: string };

export function heading(doc: PdfDoc, title: string) {
  doc.ensure(44);
  doc.y -= 18;
  doc.rect(doc.margin.side, doc.y - 3, 3, 15, C.blue);
  doc.text(title, doc.margin.side + 10, doc.y, 13.5, C.navy, true);
  doc.y -= 10;
}

export function bullets(doc: PdfDoc, items: string[], opts: { numbered?: boolean; size?: number; x?: number } = {}) {
  const x = opts.x ?? doc.margin.side;
  const size = opts.size ?? 10.5;
  const lead = size * 1.45;
  items.forEach((item, i) => {
    wrap(item, doc.width - (x - doc.margin.side) - 16, size).forEach((line, j) => {
      doc.ensure(lead);
      doc.y -= lead;
      const base = doc.y + (lead - size) / 2;
      if (j === 0) doc.text(opts.numbered ? `${i + 1}.` : "•", x + 2, base, size, opts.numbered ? C.blue : C.sky, true);
      doc.text(line, x + 16, base, size, C.ink);
    });
    doc.y -= 3;
  });
}

export function cover(doc: PdfDoc, title: string, subtitle: string, o: PackOptions, eyebrow = "PRO SERVICES · INFORMATION PACK") {
  const top = A4.h;
  doc.rect(0, top - 210, A4.w, 210, C.navy);
  doc.rect(0, top - 214, A4.w, 4, C.blue);
  doc.text("Rooms", doc.margin.side, top - 58, 22, C.white, true);
  doc.text("Now", doc.margin.side + textWidth("Rooms", 22, true), top - 58, 22, C.sky, true);
  doc.text(eyebrow, doc.margin.side, top - 80, 9, hex("#9CC9F2"), true);
  wrap(title, doc.width, 28, true).forEach((l, i) => doc.text(l, doc.margin.side, top - 126 - i * 32, 28, C.white, true));
  wrap(subtitle, doc.width, 12).slice(0, 3).forEach((l, i) => doc.text(l, doc.margin.side, top - 162 - i * 16 - (wrap(title, doc.width, 28, true).length - 1) * 32, 12, hex("#D6E8F8")));
  doc.y = top - 236;
  const date = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/London" }).format(o.date ?? new Date());
  const meta = [o.preparedFor ? `Prepared for ${o.preparedFor}` : null, o.reference ? `Reference ${o.reference}` : null, date].filter(Boolean).join("   ·   ");
  doc.text(meta, doc.margin.side, doc.y, 9.5, C.soft, Boolean(o.reference));
  doc.y -= 6;
  doc.line(doc.margin.side, doc.y, A4.w - doc.margin.side, doc.y, C.mist);
}

function serviceSection(doc: PdfDoc, key: ProServiceKey, o: PackOptions) {
  const s = PRO_SERVICES[key];
  const site = (o.siteUrl ?? "https://www.roomsnow.co.uk").replace(/\/$/, "");

  heading(doc, "How it helps");
  doc.para(s.helps, { color: C.ink, after: 4 });

  heading(doc, "What you get");
  bullets(doc, s.outcomes);

  if (key === "EXPERT") {
    heading(doc, "Ways to get advice");
    bullets(doc, ADVICE_FORMATS.map((f) => `${f.label}: ${f.body}`));
  }

  heading(doc, "Prices (plus VAT)");
  for (const p of s.prices) {
    const lines = wrap(p.detail, doc.width - 28, 10).length + (p.includes ?? []).reduce((n, inc) => n + wrap(`• ${inc}`, doc.width - 34, 10).length, 0) + (p.suits ? wrap(`Suits: ${p.suits}`, doc.width - 28, 10).length : 0);
    const h = 30 + lines * 14.5 + 10;
    doc.ensure(h + 8);
    const top = doc.y - 6;
    doc.rect(doc.margin.side, top - h, doc.width, h, p.popular ? hex("#EEF5FC") : C.paper, p.popular ? C.blue : C.mist);
    doc.text(p.label, doc.margin.side + 14, top - 20, 12, C.navy, true);
    doc.text(p.price, A4.w - doc.margin.side - 14 - textWidth(p.price, 12.5, true), top - 20, 12.5, C.blue, true);
    if (p.popular) {
      const tag = "MOST POPULAR";
      const tx = doc.margin.side + 20 + textWidth(p.label, 12, true);
      doc.rect(tx, top - 23, textWidth(tag, 7.5, true) + 10, 13, C.blue);
      doc.text(tag, tx + 5, top - 19.5, 7.5, C.white, true);
    }
    doc.y = top - 28;
    doc.para(p.detail, { size: 10, color: C.soft, x: doc.margin.side + 14, width: doc.width - 28 });
    for (const inc of p.includes ?? []) doc.para(`• ${inc}`, { size: 10, color: C.ink, x: doc.margin.side + 20, width: doc.width - 34 });
    if (p.suits) doc.para(`Suits: ${p.suits}`, { size: 10, color: C.soft, x: doc.margin.side + 14, width: doc.width - 28, bold: false });
    doc.y = top - h - 4;
  }
  doc.para(s.terms, { size: 9.5, color: C.faint, after: 2 });

  if (key === "EXPERT") {
    heading(doc, "What happens in a session");
    bullets(doc, SESSION_STEPS.map((st) => `${st.title}. ${st.body}`), { numbered: true });
  }

  heading(doc, "See it in action");
  const url = `${site}/demos/${DEMO_SLUG[key]}`;
  doc.para(`Watch the short demo (${DEMO_STORIES[key].captions.length * 4} seconds): ${DEMO_STORIES[key].captions.join(" → ")}.`, { color: C.ink });
  doc.ensure(18);
  doc.y -= 15;
  doc.text(url, doc.margin.side, doc.y + 3, 10.5, C.blue, true);
  doc.link(doc.margin.side, doc.y, textWidth(url, 10.5, true), 14, url);
  doc.y -= 4;

  heading(doc, "Next steps");
  bullets(doc, s.nextSteps, { numbered: true });
}

function closing(doc: PdfDoc, o: PackOptions) {
  heading(doc, "How it works");
  bullets(doc, HOW_IT_WORKS_STEPS.map((st) => `${st.title}. ${st.body}`), { numbered: true });
  doc.ensure(86);
  doc.y -= 16;
  const top = doc.y;
  doc.rect(doc.margin.side, top - 70, doc.width, 70, C.navy);
  doc.text("Questions or ready to go ahead?", doc.margin.side + 16, top - 24, 13, C.white, true);
  const line = o.reference ? `Reply to your enquiry email and keep reference ${o.reference} in the subject.` : "Enquire from Pro Services in your RoomsNow membership area.";
  doc.text(line, doc.margin.side + 16, top - 42, 10, hex("#D6E8F8"));
  doc.text("info@roomsnow.co.uk   ·   roomsnow.co.uk", doc.margin.side + 16, top - 58, 10, hex("#9CC9F2"), true);
  doc.link(doc.margin.side + 16, top - 62, 260, 14, "mailto:info@roomsnow.co.uk");
  doc.y = top - 76;
}

/** Build the pack. `key` "ALL" puts every service in one document. */
export function buildProPack(key: ProServiceKey | "ALL", o: PackOptions = {}): Buffer {
  const doc = new PdfDoc({ top: 56, bottom: 64, side: 50 }, (d) => {
    if (d.pages.length === 1) return;
    d.rect(0, A4.h - 30, A4.w, 30, C.navy);
    d.text("RoomsNow Pro Services", d.margin.side, A4.h - 19, 9, C.white, true);
    if (o.reference) d.text(o.reference, A4.w - d.margin.side - textWidth(o.reference, 9, true), A4.h - 19, 9, hex("#9CC9F2"), true);
    d.y = A4.h - 50;
  });

  if (key === "ALL") {
    cover(doc, "CRM, websites and expert advice for housing providers", "Everything in RoomsNow Pro Services, with prices, what's included and how each service helps supported accommodation and HMO providers.", o);
    heading(doc, "In this pack");
    bullets(doc, PRO_SERVICE_KEYS.map((k) => `${PRO_SERVICES[k].name}: ${PRO_SERVICES[k].headline}`));
    for (const k of PRO_SERVICE_KEYS) {
      doc.addPage();
      doc.para(PRO_SERVICES[k].name.toUpperCase(), { size: 9, bold: true, color: C.blue });
      doc.para(PRO_SERVICES[k].headline, { size: 19, bold: true, color: C.navy, leading: 24, after: 4 });
      serviceSection(doc, k, o);
    }
  } else {
    cover(doc, PRO_SERVICES[key].name, PRO_SERVICES[key].headline, o);
    serviceSection(doc, key, o);
  }
  closing(doc, o);

  return doc.toBuffer((d, i, total) => {
    d.line(d.margin.side, 44, A4.w - d.margin.side, 44, C.mist);
    d.text("RoomsNow Pro Services · Prices are plus VAT and correct on the date shown.", d.margin.side, 30, 8, C.faint);
    const pg = `Page ${i + 1} of ${total}`;
    d.text(pg, A4.w - d.margin.side - textWidth(pg, 8), 30, 8, C.faint);
  });
}

export const packFileName = (key: ProServiceKey | "ALL") => `RoomsNow-Pro-Services-${key === "ALL" ? "all-services" : DEMO_SLUG[key]}.pdf`;
