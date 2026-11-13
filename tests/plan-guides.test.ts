import assert from "node:assert/strict";
import test from "node:test";
import { PLAN_GUIDES, PLAN_GUIDE_KEYS, guidePrices, planGuideBySlug, saleLines } from "../src/lib/plan-guides";
import { buildPlanPack } from "../src/lib/plan-pack-pdf";

const prices = { FREE: 0, PROFESSIONAL: 4900, BUSINESS: 14900, REFERRER_FREE: 0, REFERRER_PRO: 1900 };

test("every guide has a unique slug, a demo caption per scene and prices", () => {
  const slugs = PLAN_GUIDE_KEYS.map((k) => PLAN_GUIDES[k].slug);
  assert.equal(new Set(slugs).size, slugs.length);
  for (const k of PLAN_GUIDE_KEYS) {
    assert.equal(planGuideBySlug(PLAN_GUIDES[k].slug), k);
    assert.equal(PLAN_GUIDES[k].demo.captions.length, 4);
    assert.ok(guidePrices(k, prices).length > 0);
  }
});

test("the sale is worked out from live prices and disappears when prices reach the was-price", () => {
  const sale = saleLines(prices);
  assert.deepEqual(sale.map((s) => [s.tier, s.monthly, s.yearly, s.percent]), [["PROFESSIONAL", 5100, 61200, 51], ["BUSINESS", 5099, 61188, 25]]);
  assert.equal(saleLines({ PROFESSIONAL: 10000, BUSINESS: 19999 }).length, 0);
  assert.match(guidePrices("PROFESSIONAL", prices)[0].note ?? "", /save £51/);
});

test("plan PDFs are valid and the full guide covers every plan", () => {
  for (const key of ["BOOST", "PROFESSIONAL", "ALL"] as const) {
    const s = buildPlanPack(key, prices, { date: new Date("2026-11-12T12:00:00Z") }).toString("latin1");
    assert.ok(s.startsWith("%PDF-1.4") && s.trimEnd().endsWith("%%EOF"));
    const startxref = Number(/startxref\n(\d+)/.exec(s)![1]);
    const offsets = [...s.slice(startxref).matchAll(/^(\d{10}) 00000 n $/gm)].map((m) => Number(m[1]));
    offsets.forEach((o, i) => assert.ok(s.startsWith(`${i + 1} 0 obj`, o)));
  }
  const all = buildPlanPack("ALL", prices).toString("latin1");
  assert.ok((all.match(/\/Type \/Page /g) ?? []).length >= PLAN_GUIDE_KEYS.length + 1);
});
