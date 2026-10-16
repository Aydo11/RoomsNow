import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8");

test("WhatsApp quick setup checks membership and public consent before changing the account", () => {
  const action = source("server/actions/company.ts").split("export async function enableWhatsappEnquiriesAction")[1].split("export async function updateCompanyAction")[0];
  assert.match(action, /await requireCompany\(\)/);
  assert.match(action, /whatsappNumber\(text\(formData, "whatsappNumber"\)\)/);
  assert.ok(action.indexOf('bool(formData, "publishWhatsappConsent")') < action.indexOf("db.company.update"));
  assert.ok(action.indexOf("whatsappAccess(") < action.indexOf("db.company.update"));
  assert.match(action, /data: \{ whatsappNumber: number, whatsappEnabled: true \}/);
  assert.match(action, /publicNumberConsent: true/);
});

test("Paid setup has a modal, instructions, consent and a way to keep the button off", () => {
  const prompt = source("components/whatsapp-setup-prompt.tsx");
  assert.match(prompt, /showModal\(\)/);
  assert.match(prompt, /aria-labelledby="whatsapp-setup-title"/);
  assert.match(prompt, /name="publishWhatsappConsent" type="checkbox" required/);
  assert.match(prompt, /Enable WhatsApp enquiries/);
  assert.match(prompt, /Set up later — keep button off/);
  assert.match(prompt, /useState\(initialNumber/);
  assert.match(source("app/(site)/provider/membership/page.tsx"), /whatsapp.allowed && \(!addon.whatsappEnabled \|\| !addon.whatsappNumber\)/);
  assert.match(source("app/api/billing/webhook/route.ts"), /sendWhatsappSetupInstructions\(companyId/);
});

test("Granting or buying WhatsApp sends step-by-step setup instructions", () => {
  const email = source("lib/whatsapp-setup-email.ts");
  assert.match(email, /notifyCompany\(/);
  assert.match(email, /sendEmail\(/);
  assert.match(email, /Enable WhatsApp enquiries/);
  const grant = source("server/actions/admin.ts").split("export async function manageWhatsappGrantAction")[1];
  assert.match(grant, /sendWhatsappSetupInstructions\(/);
});
