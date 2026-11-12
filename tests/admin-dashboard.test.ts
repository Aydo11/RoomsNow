import assert from "node:assert/strict";
import test from "node:test";
import { dailySeries, dashboardAlerts, delta, waited } from "../src/lib/admin-dashboard";

test("deltas compare with the previous period and handle zero", () => {
  assert.deepEqual(delta(15, 10), { text: "+50% vs previous 30 days", tone: "up" });
  assert.deepEqual(delta(5, 10), { text: "-50% vs previous 30 days", tone: "down" });
  assert.deepEqual(delta(3, 0), { text: "+3 vs 0", tone: "up" });
  assert.deepEqual(delta(0, 0), { text: "No change", tone: "flat" });
});

test("daily series counts by UK day and fills gaps", () => {
  const now = new Date("2026-11-12T12:00:00Z");
  const s = dailySeries([new Date("2026-11-12T09:00:00Z"), new Date("2026-11-12T10:00:00Z"), new Date("2026-11-10T23:30:00Z"), new Date("2026-10-01T00:00:00Z")], 3, now);
  assert.deepEqual(s, [{ day: "2026-11-10", count: 1 }, { day: "2026-11-11", count: 0 }, { day: "2026-11-12", count: 2 }]);
});

test("alerts fire at their thresholds only", () => {
  const base = { availableRooms: 4, liveAdverts: 3, pendingAdverts: 0, pendingVerification: 0, pendingAccreditations: 0, newProEnquiries: 0, requests: [10, 10] as [number, number], referrals: [10, 10] as [number, number] };
  assert.equal(dashboardAlerts(base).length, 0);
  assert.equal(dashboardAlerts({ ...base, availableRooms: 0 })[0].level, "red");
  assert.equal(dashboardAlerts({ ...base, pendingAdverts: 10 }).length, 1);
  assert.match(dashboardAlerts({ ...base, requests: [13, 20] })[0].text, /down 35% \(13 vs 20/);
  assert.equal(dashboardAlerts({ ...base, requests: [5, 19] }).length, 0); // too few to judge
  assert.equal(waited(new Date("2026-11-10T12:00:00Z"), new Date("2026-11-12T12:00:00Z")), "48 hours".replace("48 hours", "2 days"));
});
