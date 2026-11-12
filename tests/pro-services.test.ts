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
  assert.equal(packSubject(PRO_SERVICES.CRM, "PS-ABC"), "Staff CRM: your RoomsNow Pro Services pack [PS-ABC]");
});

import { calendarLink, londonTime, meetingWish } from "../src/lib/pro-services";

test("meeting requests are weekdays in the next 60 days", () => {
  const now = new Date("2026-11-12T10:00:00Z"); // Thursday
  assert.equal(meetingWish("2026-11-13", "Morning (9am to 12pm)", now), "Fri 13 Nov, Morning (9am to 12pm)");
  assert.equal(meetingWish("2026-11-12", "Morning (9am to 12pm)", now), null); // today
  assert.equal(meetingWish("2026-11-14", "Morning (9am to 12pm)", now), null); // Saturday
  assert.equal(meetingWish("2026-02-30", "Morning (9am to 12pm)", now), null);
  assert.equal(meetingWish("2027-03-01", "Morning (9am to 12pm)", now), null); // too far
  assert.equal(meetingWish("2026-11-16", "Midnight", now), null);
});

test("UK meeting times allow for British Summer Time", () => {
  assert.equal(londonTime("2026-11-18T10:30")?.toISOString(), "2026-11-18T10:30:00.000Z");
  assert.equal(londonTime("2026-07-01T10:30")?.toISOString(), "2026-07-01T09:30:00.000Z");
  assert.equal(londonTime("nonsense"), undefined);
  assert.match(calendarLink("Call", new Date("2026-11-18T10:30:00Z"), 60, "x"), /dates=20261118T103000Z%2F20261118T113000Z/);
});
