import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8");

test("Mobile contact actions are before the property description and above bottom navigation", () => {
  const page = source("app/(site)/listings/[id]/page.tsx");
  assert.ok(page.indexOf('aria-label="Enquire about this accommodation"') < page.indexOf("<SimpleSummary"));
  assert.match(page, /bottom-\[calc\(4rem_\+_env\(safe-area-inset-bottom\)\)\]/);
  assert.match(page, /whatsappVisible && <WhatsappContactLink listingId=\{listing.id\} title=\{listing.title\} compact/);
  assert.match(page, /const whatsappVisible = showWhatsappContact\(listing.status, listing.company\)/);
  assert.match(page, /existingRequest \? "\/dashboard\/requests"/);
});

test("Card WhatsApp shortcuts stay independently clickable, accessible and tracked", () => {
  const card = source("components/listing-card.tsx");
  assert.match(card, /showWhatsappContact\(listing.status, listing.company\) && <WhatsappContactLink.*compact/);
  const link = source("components/whatsapp-contact-link.tsx");
  assert.match(link, /href=\{`\/api\/whatsapp\/\$\{listingId\}`\}/);
  assert.match(link, /aria-label=\{`Enquire on WhatsApp about \$\{title\}`\}/);
  assert.match(link, /z-20/);
  assert.match(link, /min-h-11 min-w-11/);
  assert.match(link, /bg-\[#087f45\]/);
});
