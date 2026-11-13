import assert from "node:assert/strict";
import test from "node:test";
import { firstProviderResponseDays, latestPlacementAtRisk } from "../src/lib/council-outcomes";

test("a newer recovery clears an earlier risk, but disagreement at the latest week remains flagged", () => {
  const risk = { week: 4, health: "AT_RISK" };
  const well = { week: 12, health: "GOING_WELL" };
  assert.equal(latestPlacementAtRisk("MOVED_IN", [well, risk]), false);
  assert.equal(latestPlacementAtRisk("MOVED_IN", [well, { ...risk, week: 12 }]), true);
  assert.equal(latestPlacementAtRisk("MOVED_IN", [risk, { week: 4, health: "ENDED" }]), false);
  assert.equal(latestPlacementAtRisk("WITHDRAWN", [risk]), false);
});

test("first provider response ignores admin and referrer changes and staff not yet on the team", () => {
  const day = (n: number) => new Date(n * 86_400_000);
  const staff = [{ userId: "provider", createdAt: day(2) }];
  const events = [
    { actorId: "provider", status: "RECEIVED", createdAt: day(1) },
    { actorId: "admin", status: "UNDER_REVIEW", createdAt: day(2) },
    { actorId: "referrer", status: "WITHDRAWN", createdAt: day(3) },
    { actorId: "provider", status: "ASSESSMENT", createdAt: day(4) },
  ];
  assert.equal(firstProviderResponseDays(day(0), events, staff), 4);
  assert.equal(firstProviderResponseDays(day(0), events.slice(0, 3), staff), null);
});
