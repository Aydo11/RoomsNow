/**
 * A tiny PDF writer (A4, Helvetica, text, boxes and links) so RoomsNow can make
 * branded documents without a dependency. Text uses WinAnsi, which covers £,
 * curly quotes and dashes; anything else falls back to a close match or "?".
 */

export const A4 = { w: 595.28, h: 841.89 };
export type RGB = [number, number, number];
export const hex = (h: string): RGB => [0, 2, 4].map((i) => parseInt(h.slice(1 + i, 3 + i), 16) / 255) as RGB;

// Helvetica and Helvetica-Bold advance widths (1/1000 em) for ASCII 32–126.
const REG = [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584];
const BOLD = [278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584];
// Non-ASCII characters we use, as [WinAnsi byte, regular width, bold width].
const EXTRA: Record<string, [number, number, number]> = {
  "£": [0xa3, 556, 556], "•": [0x95, 350, 350], "–": [0x96, 556, 556], "—": [0x97, 1000, 1000], "‘": [0x91, 222, 278], "’": [0x92, 222, 278],
  "“": [0x93, 333, 500], "”": [0x94, 333, 500], "…": [0x85, 1000, 1000], "·": [0xb7, 278, 278], "×": [0xd7, 584, 584], "é": [0xe9, 556, 556], "→": [0xbb, 556, 556],
};

function glyph(ch: string, bold: boolean): [string, number] {
  const c = ch.charCodeAt(0);
  if (c >= 32 && c <= 126) return [ch, (bold ? BOLD : REG)[c - 32]];
  const e = EXTRA[ch];
  if (e) return [String.fromCharCode(e[0]), bold ? e[2] : e[1]];
  return ["?", 556];
}

export function textWidth(s: string, size: number, bold = false) {
  let w = 0;
  for (const ch of s) w += glyph(ch, bold)[1];
  return (w * size) / 1000;
}

const encode = (s: string, bold: boolean) =>
  [...s].map((ch) => glyph(ch, bold)[0]).join("").replace(/[\\()]/g, (m) => `\\${m}`);

/** Greedy word wrap to a width in points. */
export function wrap(s: string, width: number, size: number, bold = false): string[] {
  const lines: string[] = [];
  for (const para of s.split("\n")) {
    let line = "";
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (line && textWidth(next, size, bold) > width) {
        lines.push(line);
        line = word;
      } else line = next;
    }
    lines.push(line);
  }
  return lines;
}

const f = (n: number) => (Math.round(n * 100) / 100).toString();
const col = (c: RGB) => c.map(f).join(" ");

type Page = { ops: string[]; links: { rect: number[]; url: string }[] };

export class PdfDoc {
  pages: Page[] = [];
  y = 0;
  constructor(readonly margin = { top: 56, bottom: 64, side: 50 }, private onNewPage?: (doc: PdfDoc) => void) {
    this.addPage();
  }
  get page() {
    return this.pages[this.pages.length - 1];
  }
  get width() {
    return A4.w - 2 * this.margin.side;
  }
  addPage() {
    this.pages.push({ ops: [], links: [] });
    this.y = A4.h - this.margin.top;
    this.onNewPage?.(this);
  }
  /** Start a new page unless `h` points still fit. */
  ensure(h: number) {
    if (this.y - h < this.margin.bottom) this.addPage();
  }
  rect(x: number, y: number, w: number, h: number, fill: RGB, stroke?: RGB) {
    this.page.ops.push(`${col(fill)} rg${stroke ? ` ${col(stroke)} RG 0.8 w` : ""} ${f(x)} ${f(y)} ${f(w)} ${f(h)} re ${stroke ? "B" : "f"}`);
  }
  line(x1: number, y1: number, x2: number, y2: number, color: RGB, width = 0.8) {
    this.page.ops.push(`${col(color)} RG ${f(width)} w ${f(x1)} ${f(y1)} m ${f(x2)} ${f(y2)} l S`);
  }
  text(s: string, x: number, y: number, size: number, color: RGB, bold = false) {
    this.page.ops.push(`BT /${bold ? "F2" : "F1"} ${f(size)} Tf ${col(color)} rg ${f(x)} ${f(y)} Td (${encode(s, bold)}) Tj ET`);
  }
  link(x: number, y: number, w: number, h: number, url: string) {
    this.page.links.push({ rect: [x, y, x + w, y + h], url });
  }
  /** Wrapped text flowing down the page from the cursor, breaking pages as needed. */
  para(s: string, o: { size?: number; bold?: boolean; color: RGB; x?: number; width?: number; leading?: number; after?: number }) {
    const size = o.size ?? 10.5;
    const lead = o.leading ?? size * 1.45;
    const x = o.x ?? this.margin.side;
    for (const line of wrap(s, o.width ?? this.width - (x - this.margin.side), size, o.bold)) {
      this.ensure(lead);
      this.y -= lead;
      this.text(line, x, this.y + (lead - size) / 2, size, o.color, o.bold);
    }
    this.y -= o.after ?? 0;
  }

  /** The finished file. `footer` draws on every page once the page count is known. */
  toBuffer(footer?: (doc: PdfDoc, index: number, total: number) => void): Buffer {
    if (footer) {
      const keep = this.pages.slice();
      keep.forEach((p, i) => {
        this.pages = [...keep.slice(0, i + 1)];
        footer(this, i, keep.length);
      });
      this.pages = keep;
    }
    const objs: string[] = [];
    const add = (body: string) => objs.push(body) && objs.length;
    add("<< /Type /Catalog /Pages 2 0 R >>");
    add("PAGES");
    add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
    add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
    const kids: number[] = [];
    for (const p of this.pages) {
      const stream = p.ops.join("\n");
      const content = add(`<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`);
      const annots = p.links.map((l) => add(`<< /Type /Annot /Subtype /Link /Rect [${l.rect.map(f).join(" ")}] /Border [0 0 0] /A << /S /URI /URI (${l.url.replace(/[\\()]/g, "")}) >> >>`));
      kids.push(add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4.w} ${A4.h}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${content} 0 R${annots.length ? ` /Annots [${annots.map((a) => `${a} 0 R`).join(" ")}]` : ""} >>`));
    }
    objs[1] = `<< /Type /Pages /Kids [${kids.map((k) => `${k} 0 R`).join(" ")}] /Count ${kids.length} >>`;
    let out = "%PDF-1.4\n%\xe2\xe3\xcf\xd3\n";
    const offsets: number[] = [];
    objs.forEach((body, i) => {
      offsets.push(Buffer.byteLength(out, "latin1"));
      out += `${i + 1} 0 obj\n${body}\nendobj\n`;
    });
    const xref = Buffer.byteLength(out, "latin1");
    out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}`;
    out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
    return Buffer.from(out, "latin1");
  }
}
