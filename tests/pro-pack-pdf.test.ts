import assert from "node:assert/strict";
import test from "node:test";
import { buildProPack } from "../src/lib/pro-pack-pdf";
import { textWidth, wrap } from "../src/lib/pdf";

test("text wraps to width and measures £ and dashes", () => {
  assert.ok(textWidth("£150", 10) > 0);
  for (const line of wrap("A long sentence that should wrap onto several lines when the width is small", 120, 10)) assert.ok(textWidth(line, 10) <= 120 || !line.includes(" "));
});

test("packs are valid PDFs with a working cross-reference table", () => {
  for (const key of ["CRM", "EXPERT", "ALL"] as const) {
    const buf = buildProPack(key, { reference: "PS-TEST1", preparedFor: "Willow Housing", date: new Date("2026-11-12T12:00:00Z") });
    const s = buf.toString("latin1");
    assert.ok(s.startsWith("%PDF-1.4"));
    assert.ok(s.trimEnd().endsWith("%%EOF"));
    const startxref = Number(/startxref\n(\d+)/.exec(s)![1]);
    assert.equal(s.slice(startxref, startxref + 4), "xref");
    // every object offset in the table points at "N 0 obj"
    const offsets = [...s.slice(startxref).matchAll(/^(\d{10}) 00000 n $/gm)].map((m) => Number(m[1]));
    offsets.forEach((o, i) => assert.ok(s.startsWith(`${i + 1} 0 obj`, o)));
    assert.ok(s.includes("PS-TEST1"));
    assert.ok(s.includes("\xa3")); // the £ sign in WinAnsi
  }
  const all = buildProPack("ALL").toString("latin1");
  assert.ok((all.match(/\/Type \/Page /g) ?? []).length >= 5);
});
