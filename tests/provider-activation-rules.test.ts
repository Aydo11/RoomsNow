import assert from "node:assert/strict";
import test from "node:test";
import { activationAction, activationDue } from "../src/lib/provider-activation-rules";

const now = new Date("2026-11-16T12:00:00Z");
const daysAgo = (d: number) => new Date(now.getTime() - d * 86_400_000);
const base = { listingStatuses: [] as string[], latestDraftUpdate: null, sent: [] as string[] };

test("no reminder in the first 2 days, then step 1, then step 2 at 7 days", () => {
  assert.equal(activationDue({ ...base, createdAt: daysAgo(1) }, now), null);
  assert.deepEqual(activationDue({ ...base, createdAt: daysAgo(3) }, now), { stage: "no_advert", step: 1 });
  assert.deepEqual(
    activationDue({ ...base, createdAt: daysAgo(8), sent: [activationAction("no_advert", 1)] }, now),
    { stage: "no_advert", step: 2 },
  );
});

test("each reminder is sent once; a late joiner gets only the latest step", () => {
  assert.equal(activationDue({ ...base, createdAt: daysAgo(8), sent: [activationAction("no_advert", 2)] }, now), null);
  assert.deepEqual(activationDue({ ...base, createdAt: daysAgo(20) }, now), { stage: "no_advert", step: 2 });
});

test("drafts are chased from their last edit; live adverts stop all reminders", () => {
  assert.deepEqual(
    activationDue({ createdAt: daysAgo(40), listingStatuses: ["DRAFT"], latestDraftUpdate: daysAgo(3), sent: [] }, now),
    { stage: "draft_only", step: 1 },
  );
  assert.equal(activationDue({ ...base, createdAt: daysAgo(5), listingStatuses: ["DRAFT", "ACTIVE"], latestDraftUpdate: daysAgo(3) }, now), null);
  assert.equal(activationDue({ ...base, createdAt: daysAgo(5), listingStatuses: ["PENDING_REVIEW"] }, now), null);
});

test("old backlogs are left alone", () => {
  assert.equal(activationDue({ ...base, createdAt: daysAgo(61) }, now), null);
});
