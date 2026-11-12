import assert from "node:assert/strict";
import test from "node:test";
import { PRO_SERVICES, PRO_SERVICE_KEYS, canUseProServices, isProServiceKey, packSubject, sessionPrice } from "../src/lib/pro-services";

test("expert sessions price by the hour with 10% off for Business", () => {
  assert.equal(sessionPrice(15000, 1), 15000);
  assert.equal(sessionPrice(15000, 4), 60000);
  assert.equal(sessionPrice(15000, 1, true), 13500);
  assert.equal(sessionPrice(12345, 2, true), 22221);
});

test("only paid provider plans can enquire, and service keys are checked", () => {
  assert.ok(canUseProServices("PROFESSIONAL") && canUseProServices("BUSINESS"));
  assert.ok(!canUseProServices("FREE"));
  assert.ok(isProServiceKey("CRM") && !isProServiceKey("toString"));
  for (const k of PRO_SERVICE_KEYS) assert.equal(PRO_SERVICES[k].nextSteps.length, 3);
  assert.equal(packSubject(PRO_SERVICES.CRM, "PS-ABC"), "RoomsNow CRM: your RoomsNow Pro Services pack [PS-ABC]");
});
