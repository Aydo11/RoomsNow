import assert from "node:assert/strict";
import test from "node:test";
import { chasesDue } from "../src/lib/request-chase-rules";

const now = new Date("2026-11-11T12:00:00Z");
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000);
const fresh = { providerChaseSentAt: null, seekerFollowUpSentAt: null };

test("nothing is chased in the first 48 hours", () => {
  assert.deepEqual(chasesDue({ ...fresh, createdAt: hoursAgo(47) }, now), { provider: false, seeker: false });
});

test("provider is reminded at 48 hours, applicant hears at 5 days", () => {
  assert.deepEqual(chasesDue({ ...fresh, createdAt: hoursAgo(49) }, now), { provider: true, seeker: false });
  assert.deepEqual(chasesDue({ ...fresh, createdAt: hoursAgo(121) }, now), { provider: true, seeker: true });
});

test("each chase is sent once, and old backlogs are left alone", () => {
  assert.deepEqual(chasesDue({ createdAt: hoursAgo(121), providerChaseSentAt: now, seekerFollowUpSentAt: now }, now), { provider: false, seeker: false });
  assert.deepEqual(chasesDue({ ...fresh, createdAt: hoursAgo(31 * 24) }, now), { provider: false, seeker: false });
});
